// src/utils/globalPrint.js

// --------------------------------------------------------------------------------------------------
// GLOBAL PRINT UTILITY
// Modern, consistent, versatile print helper for ERP documents, reports, tables, invoices, payslips,
// receipts, and letterhead-based printouts.
//
// Usage:
// await globalPrint({
//   title: "Journal Entries",
//   subtitle: "Accounting report",
//   company: {
//     name: "Ligco Technologies",
//     tagline: "Enterprise Business Solutions",
//     logoUrl: "/logo.png",
//     address: "Nairobi, Kenya",
//     phone: "+254...",
//     email: "info@example.com",
//     website: "example.com",
//     kraPin: "...",
//   },
//   content: "<div>...</div>",
//   printedBy: user?.name,
//   printedByMeta: {
//     role: user?.role,
//     email: user?.email,
//   },
//   orientation: "portrait",
//   margin: "14mm",
// });
//
// Notes:
// - For most documents, pass `company` instead of building header HTML manually.
// - You can still pass custom `header` and `footer`.
// - If using remote images, same-origin images are most reliable.
// - Cross-origin images may fail to embed if CORS blocks fetch.
// --------------------------------------------------------------------------------------------------

const DEFAULT_LOGO_URL = "/vendswift_badge_logo.png";

const PRINT_DEFAULTS = {
  title: "Document",
  subtitle: "",
  content: "",
  styles: "",
  includeGlobalStyles: false,

  orientation: "portrait", // "portrait" | "landscape"
  paperSize: "A4", // "A4" | "letter" | custom CSS value
  margin: "14mm",
  scale: 1,

  header: "",
  footer: "",
  showHeader: true,
  showFooter: true,
  showTitle: true,
  showPrintedMeta: true,
  showPageNumbers: true,

  printedBy: "",
  printedByMeta: {},

  company: null,

  assets: {
    logoUrl: DEFAULT_LOGO_URL,
    images: [],
  },

  waitTimeoutMs: 12000,
  closeDelayMs: 900,
  debug: false,
};

const isBrowser = () =>
  typeof window !== "undefined" && typeof document !== "undefined";

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const clampScale = (scale) => {
  const numeric = Number(scale);

  if (!Number.isFinite(numeric)) return 1;

  return Math.min(Math.max(numeric, 0.5), 1.5);
};

const normalizeOrientation = (orientation) =>
  orientation === "landscape" ? "landscape" : "portrait";

const normalizeMargin = (margin) => {
  if (!isNonEmptyString(margin)) return "14mm";

  return margin.trim();
};

const resolvePageSize = (paperSize, orientation) => {
  const cleanPaperSize = isNonEmptyString(paperSize) ? paperSize.trim() : "A4";

  return `${cleanPaperSize} ${normalizeOrientation(orientation)}`;
};

const getHorizontalMargins = (margin) => {
  const parts = normalizeMargin(margin).split(/\s+/);

  return {
    top: parts[0],
    right: parts[1] || parts[0],
    bottom: parts[2] || parts[0],
    left: parts[3] || parts[1] || parts[0],
  };
};

const safeLog = (enabled, ...args) => {
  if (enabled) {
    console.log("[globalPrint]", ...args);
  }
};

const toAbsoluteUrl = (url) => {
  if (!isNonEmptyString(url)) return "";

  const cleanUrl = url.trim();

  if (
    cleanUrl.startsWith("data:") ||
    cleanUrl.startsWith("blob:") ||
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://")
  ) {
    return cleanUrl;
  }

  if (!isBrowser()) return cleanUrl;

  try {
    return new URL(cleanUrl, window.location.origin).href;
  } catch {
    return cleanUrl;
  }
};

const fetchAsDataUrl = async (url, debug = false) => {
  const absoluteUrl = toAbsoluteUrl(url);

  if (!absoluteUrl) return "";
  if (absoluteUrl.startsWith("data:")) return absoluteUrl;

  try {
    const response = await fetch(absoluteUrl, {
      mode: "cors",
      cache: "force-cache",
      credentials: absoluteUrl.startsWith(window.location.origin)
        ? "same-origin"
        : "omit",
    });

    if (!response.ok) {
      throw new Error(`Asset fetch failed with status ${response.status}`);
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    safeLog(debug, "Could not embed asset:", absoluteUrl, error?.message);

    return "";
  }
};

const replaceAllImageSourcesWithDataUrls = async (html, debug = false) => {
  if (!isNonEmptyString(html)) return html || "";

  const matches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];

  if (!matches.length) return html;

  const uniqueSources = [...new Set(matches.map((match) => match[1]).filter(Boolean))];

  const replacements = {};

  await Promise.all(
    uniqueSources.map(async (src) => {
      if (src.startsWith("data:")) return;

      const dataUrl = await fetchAsDataUrl(src, debug);

      if (dataUrl) {
        replacements[src] = dataUrl;
      }
    })
  );

  let output = html;

  Object.entries(replacements).forEach(([src, dataUrl]) => {
    output = output.replaceAll(`src="${src}"`, `src="${dataUrl}"`);
    output = output.replaceAll(`src='${src}'`, `src='${dataUrl}'`);
  });

  return output;
};

const replacePrintAssetTokens = async (html, images = [], debug = false) => {
  if (!isNonEmptyString(html) || !Array.isArray(images) || !images.length) {
    return html || "";
  }

  const replacements = {};

  await Promise.all(
    images.map(async (asset) => {
      if (!asset?.id || !asset?.url) return;

      const dataUrl = await fetchAsDataUrl(asset.url, debug);

      if (dataUrl) {
        replacements[`__PRINT_ASSET_${asset.id}__`] = dataUrl;
      }
    })
  );

  let output = html;

  Object.entries(replacements).forEach(([token, dataUrl]) => {
    output = output.replaceAll(token, dataUrl);
  });

  return output;
};

const collectGlobalCss = () => {
  if (!isBrowser()) return "";

  let css = "";

  Array.from(document.styleSheets || []).forEach((sheet) => {
    try {
      if (
        sheet.href &&
        sheet.href.startsWith("http") &&
        !sheet.href.startsWith(window.location.origin)
      ) {
        return;
      }

      if (!sheet.cssRules) return;

      Array.from(sheet.cssRules).forEach((rule) => {
        css += `${rule.cssText}\n`;
      });
    } catch {
      // Ignore CORS-protected stylesheets.
    }
  });

  return css;
};

export const buildLetterheadHtml = ({
  companyName = "",
  tagline = "",
  logoUrl = "",
  address = "",
  phone = "",
  email = "",
  website = "",
  kraPin = "",
  vatPin = "",
  documentTitle = "",
  documentSubtitle = "",
  meta = {},
} = {}) => {
  const safeLogo = isNonEmptyString(logoUrl)
    ? `<img class="print-letterhead-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(
        companyName || "Company logo"
      )}" />`
    : "";

  const contactItems = [
    address,
    phone ? `Tel: ${phone}` : "",
    email ? `Email: ${email}` : "",
    website ? `Web: ${website}` : "",
    kraPin ? `KRA PIN: ${kraPin}` : "",
    vatPin ? `VAT PIN: ${vatPin}` : "",
  ].filter(Boolean);

  const metaItems = Object.entries(meta || {})
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(
      ([key, value]) =>
        `<span><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</span>`
    )
    .join("");

  return `
    <div class="print-letterhead">
      <div class="print-letterhead-main">
        <div class="print-letterhead-logo-wrap">
          ${safeLogo}
        </div>

        <div class="print-letterhead-company">
          ${
            companyName
              ? `<div class="print-letterhead-name">${escapeHtml(companyName)}</div>`
              : ""
          }
          ${tagline ? `<div class="print-letterhead-tagline">${escapeHtml(tagline)}</div>` : ""}
          ${
            contactItems.length
              ? `<div class="print-letterhead-contacts">${contactItems
                  .map((item) => `<span>${escapeHtml(item)}</span>`)
                  .join("")}</div>`
              : ""
          }
        </div>

        <div class="print-letterhead-doc">
          ${
            documentTitle
              ? `<div class="print-letterhead-doc-title">${escapeHtml(documentTitle)}</div>`
              : ""
          }
          ${
            documentSubtitle
              ? `<div class="print-letterhead-doc-subtitle">${escapeHtml(documentSubtitle)}</div>`
              : ""
          }
        </div>
      </div>

      ${metaItems ? `<div class="print-letterhead-meta">${metaItems}</div>` : ""}

      <div class="print-letterhead-rule"></div>
    </div>
  `;
};

const buildDefaultHeader = ({
  title,
  subtitle,
  company,
  assets,
  showTitle,
}) => {
  if (company) {
    return buildLetterheadHtml({
      companyName: company.name,
      tagline: company.tagline,
      logoUrl: company.logoUrl || assets?.logoUrl || "",
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
      kraPin: company.kraPin,
      vatPin: company.vatPin,
      documentTitle: showTitle ? title : "",
      documentSubtitle: subtitle,
      meta: company.meta || {},
    });
  }

  if (!showTitle) return "";

  return `
    <div class="print-simple-header">
      <div>
        <div class="print-document-title">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="print-document-subtitle">${escapeHtml(subtitle)}</div>` : ""}
      </div>
    </div>
  `;
};

const buildPrintedMetaHtml = ({
  printedBy,
  printedByMeta,
  printedAt,
  showPrintedMeta,
}) => {
  if (!showPrintedMeta) return "";

  const left = printedBy
    ? `Printed by: ${escapeHtml(printedBy)}`
    : "Generated document";

  const metaText = Object.entries(printedByMeta || {})
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value)}`)
    .join(" · ");

  return `
    <div class="print-meta-footer">
      <div>${left}${metaText ? ` · ${metaText}` : ""}</div>
      <div>Printed: ${escapeHtml(printedAt)}</div>
    </div>
  `;
};

const buildDefaultPrintCss = ({
  pageSize,
  margin,
  scale,
  showHeader,
  showFooter,
  headerClearance,
  footerClearance,
  leftMargin,
  rightMargin,
  includeGlobalStyles,
  globalCss,
  customCss,
}) => `
  @page {
    size: ${pageSize};
    margin: ${margin};
  }

  ${includeGlobalStyles ? globalCss : ""}

  :root {
    --print-text: #0f172a;
    --print-muted: #64748b;
    --print-border: #cbd5e1;
    --print-soft-border: #e2e8f0;
    --print-surface: #ffffff;
    --print-soft-bg: #f8fafc;
    --print-primary: #2563eb;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff !important;
    color: var(--print-text);
    font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    transform-origin: top left;
    transform: scale(${scale});
    width: calc(100% / ${scale});
  }

  img {
    max-width: 100%;
    height: auto;
  }

  .print-root {
    width: 100%;
  }

  .print-header {
    display: ${showHeader ? "block" : "none"};
  }

  .print-footer {
    display: ${showFooter ? "block" : "none"};
  }

  .print-body {
    width: 100%;
  }

  .print-letterhead {
    width: 100%;
    background: #ffffff;
  }

  .print-letterhead-main {
    display: grid;
    grid-template-columns: 92px 1fr minmax(150px, 240px);
    align-items: center;
    gap: 14px;
  }

  .print-letterhead-logo-wrap {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    min-height: 58px;
  }

  .print-letterhead-logo {
    max-height: 58px;
    max-width: 86px;
    object-fit: contain;
  }

  .print-letterhead-name {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: var(--print-text);
    text-transform: uppercase;
  }

  .print-letterhead-tagline {
    margin-top: 3px;
    font-size: 10.5px;
    color: var(--print-muted);
  }

  .print-letterhead-contacts {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    color: var(--print-muted);
    font-size: 9.5px;
  }

  .print-letterhead-doc {
    text-align: right;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .print-letterhead-doc-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--print-text);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .print-letterhead-doc-subtitle {
    margin-top: 4px;
    font-size: 9.5px;
    color: var(--print-muted);
  }

  .print-letterhead-meta {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 9.5px;
    color: var(--print-muted);
  }

  .print-letterhead-rule {
    margin-top: 10px;
    height: 2px;
    background: linear-gradient(90deg, var(--print-primary), #94a3b8);
  }

  .print-simple-header {
    padding-bottom: 10px;
    border-bottom: 2px solid var(--print-primary);
  }

  .print-document-title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--print-text);
  }

  .print-document-subtitle {
    margin-top: 3px;
    color: var(--print-muted);
    font-size: 10px;
  }

  .print-meta-footer {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    font-size: 9.5px;
    color: var(--print-muted);
    border-top: 1px solid var(--print-soft-border);
    padding-top: 6px;
  }

  .print-footer-custom {
    margin-bottom: 6px;
  }

  .page-break {
    break-before: page;
    page-break-before: always;
  }

  .avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: auto;
  }

  thead {
    display: table-header-group;
  }

  tfoot {
    display: table-footer-group;
  }

  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  th,
  td {
    padding: 7px 8px;
    border-bottom: 1px solid var(--print-soft-border);
    vertical-align: top;
  }

  th {
    background: var(--print-soft-bg);
    color: var(--print-text);
    font-weight: 700;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: left;
  }

  td {
    font-size: 10px;
  }

  .print-card {
    border: 1px solid var(--print-soft-border);
    border-radius: 10px;
    padding: 12px;
    background: #ffffff;
    break-inside: avoid;
  }

  .print-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .print-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .print-kpi {
    border: 1px solid var(--print-soft-border);
    border-radius: 9px;
    padding: 9px;
    background: var(--print-soft-bg);
  }

  .print-kpi-label {
    color: var(--print-muted);
    font-size: 9px;
  }

  .print-kpi-value {
    margin-top: 3px;
    color: var(--print-text);
    font-size: 13px;
    font-weight: 700;
  }

  @media print {
    html,
    body {
      width: 100%;
    }

    .no-print {
      display: none !important;
    }

    .print-header {
      position: fixed;
      top: 0;
      left: ${leftMargin};
      right: ${rightMargin};
      padding: 0 0 8px 0;
      background: #ffffff;
      z-index: 9999;
    }

    .print-footer {
      position: fixed;
      bottom: 0;
      left: ${leftMargin};
      right: ${rightMargin};
      padding: 6px 0 0 0;
      background: #ffffff;
      z-index: 9999;
    }

    .print-body {
      margin-top: ${showHeader ? headerClearance : "0"};
      margin-bottom: ${showFooter ? footerClearance : "0"};
    }
  }

  ${customCss || ""}
`;

const createHiddenIframe = () => {
  const iframe = document.createElement("iframe");

  iframe.setAttribute("title", "Print frame");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("sandbox", "allow-modals allow-same-origin allow-scripts");

  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });

  document.body.appendChild(iframe);

  return iframe;
};

const waitForDocumentReady = async (win, timeoutMs) => {
  await new Promise((resolve) => {
    const startedAt = Date.now();

    const tick = () => {
      const ready = win.document.readyState === "complete";
      const timedOut = Date.now() - startedAt >= timeoutMs;

      if (ready || timedOut) {
        resolve();
        return;
      }

      setTimeout(tick, 50);
    };

    tick();
  });
};

const waitForImages = async (win, timeoutMs) => {
  const images = Array.from(win.document.images || []);

  if (!images.length) return;

  const promises = images.map((img) => {
    if (img.complete) {
      if (typeof img.decode === "function") {
        return img.decode().catch(() => {});
      }

      return Promise.resolve();
    }

    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  });

  await Promise.race([
    Promise.all(promises),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
};

const waitForFonts = async (win, timeoutMs) => {
  if (!win.document.fonts || typeof win.document.fonts.ready?.then !== "function") {
    return;
  }

  await Promise.race([
    win.document.fonts.ready.catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
};

const waitForPrintReady = async (win, timeoutMs) => {
  await waitForDocumentReady(win, timeoutMs);
  await waitForImages(win, timeoutMs);
  await waitForFonts(win, timeoutMs);
};

export async function globalPrint(options = {}) {
  if (!isBrowser()) {
    console.error("globalPrint: window/document is not available.");
    return false;
  }

  const config = {
    ...PRINT_DEFAULTS,
    ...options,
    assets: {
      ...PRINT_DEFAULTS.assets,
      ...(options.assets || {}),
    },
  };

  const {
    title,
    subtitle,
    content,
    styles,
    includeGlobalStyles,
    orientation,
    paperSize,
    margin,
    scale,
    header,
    footer,
    showHeader,
    showFooter,
    showTitle,
    showPrintedMeta,
    showPageNumbers,
    printedBy,
    printedByMeta,
    company,
    assets,
    waitTimeoutMs,
    closeDelayMs,
    debug,
  } = config;

  if (!isNonEmptyString(content)) {
    console.error("globalPrint: No content supplied.");
    return false;
  }

  const safeScale = clampScale(scale);
  const safeMargin = normalizeMargin(margin);
  const pageSize = resolvePageSize(paperSize, orientation);
  const margins = getHorizontalMargins(safeMargin);

  const printedAt = new Date().toLocaleString("en-GB");

  let iframe = null;

  try {
    const logoUrl = company?.logoUrl || assets?.logoUrl || "";
    const embeddedLogo = await fetchAsDataUrl(logoUrl, debug);

    const normalizedAssets = {
      ...assets,
      logoUrl: embeddedLogo || logoUrl || "",
    };

    const rawHeader =
      isNonEmptyString(header)
        ? header
        : buildDefaultHeader({
            title,
            subtitle,
            company: company
              ? {
                  ...company,
                  logoUrl: normalizedAssets.logoUrl,
                }
              : null,
            assets: normalizedAssets,
            showTitle,
          });

    const printedMetaHtml = buildPrintedMetaHtml({
      printedBy,
      printedByMeta,
      printedAt,
      showPrintedMeta,
    });

    const rawFooter = `
      ${isNonEmptyString(footer) ? `<div class="print-footer-custom">${footer}</div>` : ""}
      ${printedMetaHtml}
    `;

    let headerHtml = rawHeader;
    let footerHtml = rawFooter;
    let contentHtml = content;

    headerHtml = await replaceAllImageSourcesWithDataUrls(headerHtml, debug);
    footerHtml = await replaceAllImageSourcesWithDataUrls(footerHtml, debug);
    contentHtml = await replaceAllImageSourcesWithDataUrls(contentHtml, debug);

    headerHtml = await replacePrintAssetTokens(headerHtml, assets?.images, debug);
    footerHtml = await replacePrintAssetTokens(footerHtml, assets?.images, debug);
    contentHtml = await replacePrintAssetTokens(contentHtml, assets?.images, debug);

    const globalCss = includeGlobalStyles ? collectGlobalCss() : "";

    const headerClearance = company || isNonEmptyString(header)
      ? "122px"
      : showTitle
      ? "58px"
      : "0";

    const footerClearance = showFooter ? "42px" : "0";

    const finalCss = buildDefaultPrintCss({
      pageSize,
      margin: safeMargin,
      scale: safeScale,
      showHeader: showHeader && isNonEmptyString(headerHtml),
      showFooter,
      headerClearance,
      footerClearance,
      leftMargin: margins.left,
      rightMargin: margins.right,
      includeGlobalStyles,
      globalCss,
      customCss: styles,
    });

    const pageNumberHtml = showPageNumbers
      ? `<span class="print-page-number"></span>`
      : "";

    const finalHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          <style>${finalCss}</style>
        </head>

        <body>
          <div class="print-root">
            ${
              showHeader && isNonEmptyString(headerHtml)
                ? `<header class="print-header">${headerHtml}</header>`
                : ""
            }

            <main class="print-body">
              ${contentHtml}
            </main>

            ${
              showFooter
                ? `<footer class="print-footer">${footerHtml}${pageNumberHtml}</footer>`
                : ""
            }
          </div>
        </body>
      </html>
    `;

    iframe = createHiddenIframe();

    const win = iframe.contentWindow;
    const doc = win.document;

    await new Promise((resolve) => {
      iframe.onload = resolve;

      doc.open();
      doc.write(finalHtml);
      doc.close();

      // Some browsers do not reliably trigger iframe.onload after doc.write.
      setTimeout(resolve, 100);
    });

    await waitForPrintReady(win, waitTimeoutMs);

    await new Promise((resolve) => setTimeout(resolve, 120));

    win.focus();
    win.print();

    setTimeout(() => {
      try {
        iframe?.parentNode?.removeChild(iframe);
      } catch {
        // Ignore cleanup errors.
      }
    }, closeDelayMs);

    return true;
  } catch (error) {
    console.error("globalPrint error:", error);

    try {
      iframe?.parentNode?.removeChild(iframe);
    } catch {
      // Ignore cleanup errors.
    }

    return false;
  }
}

// --------------------------------------------------------------------------------------------------
// Optional helper: convert a simple array of objects into printable table HTML.
// --------------------------------------------------------------------------------------------------
export function buildPrintableTable({
  columns = [],
  rows = [],
  emptyText = "No records found.",
  className = "",
} = {}) {
  if (!Array.isArray(columns) || !columns.length) {
    return `<div class="print-card">${escapeHtml(emptyText)}</div>`;
  }

  const safeRows = Array.isArray(rows) ? rows : [];

  const headerHtml = columns
    .map((column) => `<th>${escapeHtml(column.label || column.key || "")}</th>`)
    .join("");

  const bodyHtml = safeRows.length
    ? safeRows
        .map((row) => {
          const cells = columns
            .map((column) => {
              const value =
                typeof column.render === "function"
                  ? column.render(row)
                  : row?.[column.key];

              return `<td>${value === undefined || value === null ? "" : String(value)}</td>`;
            })
            .join("");

          return `<tr>${cells}</tr>`;
        })
        .join("")
    : `<tr><td colspan="${columns.length}" style="text-align:center;color:#64748b;padding:18px;">${escapeHtml(
        emptyText
      )}</td></tr>`;

  return `
    <table class="${escapeHtml(className)}">
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${bodyHtml}
      </tbody>
    </table>
  `;
}