// --------------------------------------------------------------------------------------------------
// GLOBAL PRINT UTILITY (ROBUST: LETTERHEAD/LOGO PREFETCH + PRINTED BY + ASSET WAIT)
// --------------------------------------------------------------------------------------------------
// Usage:
// globalPrint({
//   title: "Journal Entries",
//   content: "<div>...</div>",
//   header: buildLetterheadHtml({ companyName, logoUrl }),
//   printedBy: user?.name,
//   printedByMeta: { role: user?.role, email: user?.email },
//   footer: "<div>...</div>",
// });
//
// IMPORTANT:
// - If you pass a logoUrl inside the header HTML, ALSO pass it via `assets.logoUrl`
//   to guarantee it gets embedded (base64) even when remote images are blocked on print.
// --------------------------------------------------------------------------------------------------

export async function globalPrint({
  title = "Document",
  content,
  styles = "",
  includeGlobalStyles = true,
  orientation = "portrait", // "portrait" | "landscape"
  scale = 1,
  margin = "15mm",
  footer = "",
  header = "",

  // ✅ New: who printed
  printedBy = "", // string
  printedByMeta = {}, // { role, email, phone, ... } optional

  // ✅ New: allow explicit assets to be embedded (base64) for reliability
  assets = {
    // logoUrl: "https://.../logo.png"  OR  "data:image/png;base64,..."
    logoUrl: "%PUBLIC_URL%/vendswift_badge_logo.png" ,
    // optional extra images you want embedded
    images: [], // [{ id: "sig1", url: "https://..." }, ...]
  },

  // ✅ New: robustness options
  waitTimeoutMs = 12000, // max wait for assets
  debug = false,
} = {}) {
  try {
    if (!content) {
      console.error("globalPrint: No content supplied");
      return;
    }

    // ----------------------------
    // Helpers
    // ----------------------------
    const log = (...args) => debug && console.log("[globalPrint]", ...args);

    const escapeHtml = (s) =>
      String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const now = new Date();
    const printedAt = now.toLocaleString("en-GB");
    const printedByLine = printedBy
      ? `Printed by: ${escapeHtml(printedBy)}`
      : `Printed: ${escapeHtml(printedAt)}`;

    const printedByMetaLine = Object.keys(printedByMeta || {}).length
      ? Object.entries(printedByMeta)
          .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
          .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`)
          .join(" · ")
      : "";

    const toDataUrlIfPossible = async (url) => {
      if (!url) return "";
      if (String(url).startsWith("data:")) return url; // already embedded

      // Remote fetch attempt. If CORS blocks it, we fail gracefully.
      try {
        const res = await fetch(url, { mode: "cors", cache: "force-cache" });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
        return dataUrl;
      } catch (e) {
        log("Could not embed asset (CORS/blocked):", url, e?.message);
        return ""; // fallback to normal <img src="..."> if present in header HTML
      }
    };

    // Replace <img src="..."> to data url (same-origin + cors-allowed)
    const embedImagesInHtml = async (html) => {
      if (!html) return html;

      // Find src="...".
      // Basic parser (good enough): capture src attribute values
      const srcMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
      if (!srcMatches.length) return html;

      const uniqueSrc = [...new Set(srcMatches.map((m) => m[1]).filter(Boolean))];

      const conversions = {};
      await Promise.all(
        uniqueSrc.map(async (src) => {
          // Only try to embed http(s) and same-origin. data: already ok.
          if (src.startsWith("data:")) return;

          // For reliability: same-origin is almost always embeddable.
          // Cross-origin may fail due to CORS; we try anyway.
          const dataUrl = await toDataUrlIfPossible(src);
          if (dataUrl) conversions[src] = dataUrl;
        })
      );

      let out = html;
      Object.entries(conversions).forEach(([src, dataUrl]) => {
        // Replace all occurrences of that src
        out = out.replaceAll(`src="${src}"`, `src="${dataUrl}"`);
        out = out.replaceAll(`src='${src}'`, `src='${dataUrl}'`);
      });

      return out;
    };

    // Collect global CSS from same-origin stylesheets only
    const collectGlobalCss = () => {
      let globalCss = "";
      if (!includeGlobalStyles) return globalCss;

      const styleSheets = Array.from(document.styleSheets);
      styleSheets.forEach((sheet) => {
        try {
          // Skip cross-origin http stylesheets (CORS)
          if (
            sheet.href &&
            sheet.href.startsWith(window.location.origin) === false &&
            sheet.href.startsWith("http") === true
          )
            return;

          if (!sheet.cssRules) return;

          for (let rule of sheet.cssRules) {
            globalCss += rule.cssText;
          }
        } catch (err) {
          // Ignore CORS/security errors
        }
      });

      return globalCss;
    };

    // Extract left/right margin for header/footer constraint
    const marginParts = margin.trim().split(/\s+/);
    const marginLeft = marginParts[3] || marginParts[1] || marginParts[0];
    const marginRight = marginParts[1] || marginParts[0];

    const HEADER_CLEARANCE_HEIGHT = "140px"; // slightly safer default
    const FOOTER_CLEARANCE_HEIGHT = "70px";

    // ----------------------------
    // Asset embedding strategy
    // ----------------------------
    // 1) Embed explicit logoUrl if provided (best reliability)
    // 2) Embed images inside header/footer/content HTML when possible
    const explicitLogoDataUrl = assets?.logoUrl
      ? await toDataUrlIfPossible(assets.logoUrl)
      : "";

    // If they passed a logoUrl but embedding fails (CORS), we still proceed.
    // We'll also optionally inject an <img> if they didn't put one in header.
    const headerHasImg = /<img[\s\S]*?>/i.test(header || "");
    const injectedLogo =
      explicitLogoDataUrl && !headerHasImg
        ? `<img src="${explicitLogoDataUrl}" alt="Logo" style="height:52px;max-width:180px;object-fit:contain;" />`
        : "";

    // Embed images inside header/footer/content
    let headerHtml = header || "";
    let footerHtml = footer || "";
    let contentHtml = content;

    // If logo is embeddable AND header already has a logo URL, replace it as well
    // (handled by embedImagesInHtml)
    headerHtml = await embedImagesInHtml(headerHtml);
    footerHtml = await embedImagesInHtml(footerHtml);
    contentHtml = await embedImagesInHtml(contentHtml);

    // If explicit images list was provided, force-inject them (optional)
    // This is useful for signatures, stamps etc.
    // You can reference them in your html: <img src="__PRINT_ASSET_sig1__" />
    if (Array.isArray(assets?.images) && assets.images.length) {
      const map = {};
      await Promise.all(
        assets.images.map(async (img) => {
          const dataUrl = await toDataUrlIfPossible(img.url);
          if (dataUrl) map[`__PRINT_ASSET_${img.id}__`] = dataUrl;
        })
      );

      const replaceTokens = (html) => {
        let out = html;
        Object.entries(map).forEach(([token, dataUrl]) => {
          out = out.replaceAll(token, dataUrl);
        });
        return out;
      };

      headerHtml = replaceTokens(headerHtml);
      footerHtml = replaceTokens(footerHtml);
      contentHtml = replaceTokens(contentHtml);
    }

    // Inject "Printed by" line into footer (always)
    const printedByBlock = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;width:100%;font-size:11px;color:#333;">
        <div>${printedByLine}${printedByMetaLine ? ` · ${printedByMetaLine}` : ""}</div>
        <div>Printed: ${escapeHtml(printedAt)}</div>
      </div>
    `;

    // If footer is empty, create a basic footer with printed info
    // If footer exists, append printed info neatly.
    const finalFooterHtml = footerHtml
      ? `${footerHtml}<div style="height:6px;"></div>${printedByBlock}`
      : printedByBlock;

    // If header doesn't include an image and we have a safe embedded logo, prepend it.
    const finalHeaderHtml = injectedLogo
      ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>${injectedLogo}</div>
          <div style="flex:1;"></div>
        </div>
        <div style="height:6px;"></div>
        ${headerHtml}
      `
      : headerHtml;

    // ----------------------------
    // Build iframe
    // ----------------------------
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.setAttribute("sandbox", "allow-modals allow-same-origin allow-scripts");
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    const globalCss = collectGlobalCss();

    // NOTE: Put @page rules first to reduce browser variance
    const finalHtml = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>

          <style>
            @page { size: ${orientation}; margin: ${margin}; }

            /* Inject global CSS */
            ${globalCss}

            /* Inject custom CSS */
            ${styles}

            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              transform-origin: top left;
              transform: scale(${scale});
              width: calc(100% / ${scale});
            }

            .page-break { page-break-before: always; }

            table { page-break-inside: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { page-break-inside: avoid !important; page-break-after: auto; }

            @media print {
              .print-header {
                display: block;
                position: fixed;
                top: 0;
                left: ${marginLeft};
                right: ${marginRight};
                padding: 6px 0;
                background: white;
                z-index: 9999;
              }

              .print-footer {
                display: block;
                position: fixed;
                bottom: 0;
                left: ${marginLeft};
                right: ${marginRight};
                padding: 6px 0;
                background: white;
                z-index: 9999;
              }

              .print-body {
                margin-top: ${HEADER_CLEARANCE_HEIGHT};
                margin-bottom: ${FOOTER_CLEARANCE_HEIGHT};
              }
            }
          </style>
        </head>

        <body>
          ${finalHeaderHtml ? `<div class="print-header">${finalHeaderHtml}</div>` : ""}
          <div class="print-body">${contentHtml}</div>
          <div class="print-footer">${finalFooterHtml}</div>
        </body>
      </html>
    `;

    // Write HTML into iframe
    doc.open();
    doc.write(finalHtml);
    doc.close();

    // ----------------------------
    // Wait for readiness (more robust)
    // ----------------------------
    const waitForReady = async () => {
      const win = iframe.contentWindow;

      // 1) Wait document complete or timeout
      await new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
          const ready = win.document.readyState === "complete";
          const timedOut = Date.now() - start > waitTimeoutMs;
          if (ready || timedOut) return resolve();
          setTimeout(tick, 50);
        };
        tick();
      });

      // 2) Wait images decode
      const imgs = Array.from(win.document.images || []);
      const imgPromises = imgs.map((img) => {
        // If broken or already complete, resolve
        if (img.complete) {
          // decode() can still help on some browsers
          if (typeof img.decode === "function") return img.decode().catch(() => {});
          return Promise.resolve();
        }
        // Otherwise wait load/error
        return new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      });

      await Promise.race([
        Promise.all(imgPromises),
        new Promise((resolve) => setTimeout(resolve, waitTimeoutMs)),
      ]);

      // 3) Wait fonts (if supported)
      if (win.document.fonts && typeof win.document.fonts.ready?.then === "function") {
        await Promise.race([
          win.document.fonts.ready.catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, waitTimeoutMs)),
        ]);
      }
    };

    // onload is not always enough for fonts/images; we still wait
    iframe.onload = async () => {
      try {
        await waitForReady();
      } catch (e) {
        log("waitForReady error:", e?.message);
      }

      // Print
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } finally {
          // Cleanup
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch (_) {}
          }, 800);
        }
      }, 200);
    };
  } catch (e) {
    console.error("globalPrint error:", e);
  }
}
