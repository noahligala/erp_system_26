// src/scenes/calendar/calendar.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { formatDate } from "@fullcalendar/core";

import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Chip,
  Divider,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  Paper,
  MenuItem,
} from "@mui/material";

import dayjs from "dayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useAuth } from "../../api/AuthProvider";
import { toast } from "react-toastify";

/* -----------------------------
   API paths
------------------------------ */
const FEED_PATH = "/calendar/feed"; // adjust if your route differs
const EVENTS_PATH = "/calendar/events";

/* -----------------------------
   Categories (manual only)
------------------------------ */
const CATEGORIES = [
  { value: "TODO", label: "To-Do" },
  { value: "REMINDER", label: "Reminder" },
];

/* -----------------------------
   Color presets (MUST match backend)
------------------------------ */
const COLOR_PRESETS = [
  { value: "#2ECC71", label: "Green" },
  { value: "#3498DB", label: "Blue" },
  { value: "#9B59B6", label: "Purple" },
  { value: "#E67E22", label: "Orange" },
  { value: "#E74C3C", label: "Red" },
  { value: "#95A5A6", label: "Gray" },
];

const defaultColorByCategory = (cat) => {
  if (cat === "TODO") return "#3498DB";
  if (cat === "REMINDER") return "#2ECC71";
  return "#2ECC71";
};

/* -----------------------------
   Holidays (Public API)
------------------------------ */
const HOLIDAYS_API = "https://date.nager.at/api/v3/PublicHolidays";
const COUNTRY_CODE = "KE";

const normalizeHoliday = (h) => ({
  id: `holiday-${h.date}-${String(h.name || h.localName || "holiday").replace(/\s+/g, "-")}`,
  title: h.localName || h.name || "Holiday",
  start: h.date,
  allDay: true,
  display: "background",
  backgroundColor: "rgba(219, 79, 74, 0.12)",
  borderColor: "rgba(219, 79, 74, 0.12)",
  extendedProps: {
    category: "HOLIDAY",
    source: "nager",
    name: h.name,
    localName: h.localName,
    types: h.types || null,
  },
  editable: false,
  startEditable: false,
  durationEditable: false,
});

/* -----------------------------
   Form defaults
------------------------------ */
const emptyForm = {
  id: null,
  title: "",
  category: "REMINDER",
  description: "",
  location: "",
  start: dayjs(),
  end: dayjs().add(1, "hour"),
  allDay: false,
  color: defaultColorByCategory("REMINDER"),
  is_done: false,
};

const Calendar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { apiClient } = useAuth();

  const calendarRef = useRef(null);

  /* -----------------------------
     State
  ------------------------------ */
  const [events, setEvents] = useState([]); // FEED events (manual + leave/offday/awol/company)
  const [fetching, setFetching] = useState(false);

  const [holidays, setHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const [snack, setSnack] = useState({ open: false, severity: "success", msg: "" });
  const showSnack = (severity, msg) => setSnack({ open: true, severity, msg });
  const closeSnack = () => setSnack((p) => ({ ...p, open: false }));

  /* -----------------------------
     Helpers
  ------------------------------ */
  const extractLaravelError = (error, fallback = "Request failed.") => {
    const data = error?.response?.data;
    const msg = data?.message || data?.error || fallback;
    if (data?.errors && typeof data.errors === "object") {
      const k = Object.keys(data.errors)[0];
      return data.errors[k]?.[0] || msg;
    }
    return msg;
  };

  const isHolidayOrBackground = (ev) =>
    ev?.extendedProps?.category === "HOLIDAY" || ev?.display === "background";

  const isManualSource = (source) => source === "manual";
  const isManualEvent = (ev) => isManualSource(ev?.extendedProps?.source);

  /* -----------------------------
     Normalize FEED events
     (Feed already sends FullCalendar-friendly shapes)
  ------------------------------ */
  const normalizeFromFeed = useCallback((e) => {
    const source = e?.extendedProps?.source || e?.source;
    const cat = e?.extendedProps?.category || e?.category || "REMINDER";
    const isDone = !!e?.extendedProps?.is_done;

    const isManual = source === "manual";

    const bg = e.backgroundColor || e.color || defaultColorByCategory(cat);
    const br = e.borderColor || e.color || defaultColorByCategory(cat);

    return {
      id: String(e.id),
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: !!e.allDay,

      // ✅ only manual items can be edited/moved/resized
      editable: isManual,
      startEditable: isManual,
      durationEditable: isManual,

      display: e.display,
      backgroundColor: bg,
      borderColor: br,

      extendedProps: {
        ...(e.extendedProps || {}),
        source,
        category: cat,
        is_done: isDone,
        color: e?.extendedProps?.color || e.color || bg,
      },

      classNames: isDone ? ["ligco-event-done"] : [],
    };
  }, []);

  /* -----------------------------
     Fetch FEED by visible range
  ------------------------------ */
  const fetchFeed = useCallback(
    async ({ start, end }) => {
      if (!apiClient) return;
      setFetching(true);

      try {
        const res = await apiClient.get(FEED_PATH, {
          params: {
            start: dayjs(start).toISOString(),
            end: dayjs(end).toISOString(),
          },
        });

        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setEvents(list.map(normalizeFromFeed));
      } catch (error) {
        console.error("Calendar feed fetch failed:", error?.response?.data || error);
        const msg = extractLaravelError(error, "Failed to load calendar feed.");
        toast.error(msg);
        showSnack("error", msg);
      } finally {
        setFetching(false);
      }
    },
    [apiClient, normalizeFromFeed]
  );

  /* -----------------------------
     Holidays fetch (cache + abort)
  ------------------------------ */
  const loadedYearsRef = useRef(new Set());
  const holidaysCacheRef = useRef(new Map()); // year -> holiday events[]
  const holidayAbortRef = useRef(null);

  const fetchHolidaysForYear = useCallback(async (year) => {
    if (holidaysCacheRef.current.has(year)) {
      return holidaysCacheRef.current.get(year);
    }

    if (holidayAbortRef.current) holidayAbortRef.current.abort();
    const controller = new AbortController();
    holidayAbortRef.current = controller;

    setHolidaysLoading(true);
    try {
      const res = await fetch(`${HOLIDAYS_API}/${year}/${COUNTRY_CODE}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Holidays API failed: ${res.status}`);
      const data = await res.json();

      const normalized = Array.isArray(data) ? data.map(normalizeHoliday) : [];
      holidaysCacheRef.current.set(year, normalized);
      return normalized;
    } finally {
      setHolidaysLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const y = dayjs().year();
        loadedYearsRef.current.add(y);
        loadedYearsRef.current.add(y + 1);

        const [a, b] = await Promise.all([fetchHolidaysForYear(y), fetchHolidaysForYear(y + 1)]);
        if (!cancelled) setHolidays([...a, ...b]);
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error(e);
          toast.warning("Could not load public holidays.");
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      if (holidayAbortRef.current) holidayAbortRef.current.abort();
    };
  }, [fetchHolidaysForYear]);

  /* -----------------------------
     Debounced datesSet (prevents spam)
  ------------------------------ */
  const datesSetTimerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (datesSetTimerRef.current) clearTimeout(datesSetTimerRef.current);
    };
  }, []);

  const handleDatesSet = useCallback(
    (arg) => {
      if (datesSetTimerRef.current) clearTimeout(datesSetTimerRef.current);

      datesSetTimerRef.current = setTimeout(() => {
        // 1) fetch feed for range
        fetchFeed({ start: arg.start, end: arg.end });

        // 2) ensure holidays for that year
        const y = dayjs(arg.start).year();
        if (loadedYearsRef.current.has(y)) return;
        loadedYearsRef.current.add(y);

        fetchHolidaysForYear(y)
          .then((list) => {
            setHolidays((prev) => {
              const ids = new Set(prev.map((x) => x.id));
              const next = [...prev];
              for (const h of list) if (!ids.has(h.id)) next.push(h);
              return next;
            });
          })
          .catch((e) => {
            if (e?.name !== "AbortError") {
              console.error(e);
              toast.warning("Could not load public holidays for that year.");
            }
          });
      }, 150);
    },
    [fetchFeed, fetchHolidaysForYear]
  );

  /* -----------------------------
     Merge events + holidays
  ------------------------------ */
  const mergedEvents = useMemo(() => [...events, ...holidays], [events, holidays]);

  const upcoming = useMemo(() => {
    const now = dayjs();
    return [...events]
      .filter((e) => dayjs(e.start).isAfter(now.subtract(1, "day")))
      .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())
      .slice(0, 12);
  }, [events]);

  /* -----------------------------
     Scroll time near "now"
  ------------------------------ */
  const getScrollTime = () => {
    const now = dayjs();
    const hour = Math.max(0, now.hour() - 1);
    return `${String(hour).padStart(2, "0")}:00:00`;
  };
  const [scrollTime, setScrollTime] = useState(getScrollTime());
  useEffect(() => {
    const t = setInterval(() => setScrollTime(getScrollTime()), 60_000);
    return () => clearInterval(t);
  }, []);

  /* -----------------------------
     Prevent selecting/moving into the past
  ------------------------------ */
  const handleSelectAllow = useCallback((selectInfo) => {
    const start = dayjs(selectInfo.start);
    return !start.isBefore(dayjs().startOf("day"));
  }, []);

  const handleEventAllow = useCallback((dropInfo, draggedEvent) => {
    const start = dayjs(dropInfo.start);
    const t0 = dayjs().startOf("day");

    // holidays/background events blocked
    if (isHolidayOrBackground(draggedEvent)) return false;

    // non-manual feed items blocked
    if (!isManualEvent(draggedEvent)) return false;

    return !start.isBefore(t0);
  }, []);

  /* -----------------------------
     Dialog open/close
  ------------------------------ */
  const openCreateDialog = (selected) => {
    const start = dayjs(selected.startStr || selected.start);
    const t0 = dayjs().startOf("day");

    if (start.isBefore(t0)) {
      showSnack("warning", "You can't create events in the past.");
      return;
    }

    setMode("create");

    // FullCalendar gives end as exclusive for allDay selections
    const end = selected.endStr ? dayjs(selected.endStr) : start.add(1, "hour");

    setForm({
      ...emptyForm,
      start,
      end,
      allDay: !!selected.allDay,
      category: "REMINDER",
      color: defaultColorByCategory("REMINDER"),
      is_done: false,
    });

    setOpenDialog(true);
  };

  const openEditDialog = (clickInfo) => {
    const ev = clickInfo.event;

    // block holidays/background and non-manual feed items
    if (isHolidayOrBackground(ev)) return;
    if (!isManualEvent(ev)) {
      showSnack("info", "This item comes from HR/Company feed and cannot be edited here.");
      return;
    }

    setMode("edit");
    setForm({
      id: ev.id,
      title: ev.title || "",
      category: ev.extendedProps?.category || "REMINDER",
      description: ev.extendedProps?.description || "",
      location: ev.extendedProps?.location || "",
      start: dayjs(ev.start),
      end: ev.end ? dayjs(ev.end) : dayjs(ev.start).add(1, "hour"),
      allDay: !!ev.allDay,
      color: ev.extendedProps?.color || ev.backgroundColor || defaultColorByCategory(ev.extendedProps?.category),
      is_done: !!ev.extendedProps?.is_done,
    });

    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setForm(emptyForm);
  };

  /* -----------------------------
     Validation + CRUD (manual only)
  ------------------------------ */
  const validateForm = useCallback(() => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.start) return "Start is required.";

    if (!form.allDay) {
      if (!form.end) return "End is required for timed events.";
      if (dayjs(form.end).isBefore(dayjs(form.start))) return "End time must be after start time.";
    }

    if (!["TODO", "REMINDER"].includes(form.category)) return "Invalid category.";

    const presetValues = new Set(COLOR_PRESETS.map((x) => x.value));
    if (!presetValues.has(form.color)) return "Please select a valid preset color.";

    const t0 = dayjs().startOf("day");
    if (dayjs(form.start).isBefore(t0)) return "You can't create or move events to past dates.";

    return null;
  }, [form]);

  const formError = useMemo(() => validateForm(), [validateForm]);

  const refreshVisibleRange = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const view = api.view;
    fetchFeed({ start: view.activeStart, end: view.activeEnd });
  }, [fetchFeed]);

  const handleSave = async () => {
    const errMsg = validateForm();
    if (errMsg) return showSnack("warning", errMsg);
    if (!apiClient) return showSnack("error", "API client not ready.");

    setBusy(true);
    try {
      const payload = {
        title: form.title,
        category: form.category,
        description: form.description || null,
        location: form.location || null,
        start: dayjs(form.start).toISOString(),
        end: form.allDay ? null : dayjs(form.end).toISOString(),
        all_day: !!form.allDay,
        color: form.color,
        is_done: !!form.is_done,
      };

      if (mode === "create") {
        await apiClient.post(EVENTS_PATH, payload);
        toast.success("Event created.");
        showSnack("success", "Event created.");
      } else {
        await apiClient.put(`${EVENTS_PATH}/${form.id}`, payload);
        toast.success("Event updated.");
        showSnack("success", "Event updated.");
      }

      closeDialog();
      refreshVisibleRange();
    } catch (error) {
      console.error("Calendar save failed:", error?.response?.data || error);
      const msg = extractLaravelError(error, "Failed to save event.");
      toast.error(msg);
      showSnack("error", msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!apiClient) return showSnack("error", "API client not ready.");

    const ok = window.confirm(`Delete event "${form.title}"?`);
    if (!ok) return;

    setBusy(true);
    try {
      await apiClient.delete(`${EVENTS_PATH}/${form.id}`);
      toast.success("Event deleted.");
      showSnack("success", "Event deleted.");
      closeDialog();
      refreshVisibleRange();
    } catch (error) {
      console.error("Calendar delete failed:", error?.response?.data || error);
      const msg = extractLaravelError(error, "Failed to delete event.");
      toast.error(msg);
      showSnack("error", msg);
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = async (eventId, nextDone) => {
    if (!apiClient) return showSnack("error", "API client not ready.");

    setBusy(true);
    try {
      await apiClient.patch(`${EVENTS_PATH}/${eventId}/done`, { is_done: !!nextDone });

      toast.success(nextDone ? "Marked done." : "Marked not done.");
      showSnack("success", nextDone ? "Marked done." : "Marked not done.");
      refreshVisibleRange();
    } catch (error) {
      console.error("Toggle done failed:", error?.response?.data || error);
      const msg = extractLaravelError(error, "Failed to update done status.");
      toast.error(msg);
      showSnack("error", msg);
    } finally {
      setBusy(false);
    }
  };

  const handleEventDrop = async (changeInfo) => {
    const ev = changeInfo.event;
    if (!apiClient) return;

    // block non-manual and holidays/background
    if (!isManualEvent(ev) || isHolidayOrBackground(ev)) {
      changeInfo.revert();
      return;
    }

    if (dayjs(ev.start).isBefore(dayjs().startOf("day"))) {
      showSnack("warning", "You can't move events to past dates.");
      changeInfo.revert();
      return;
    }

    try {
      await apiClient.patch(`${EVENTS_PATH}/${ev.id}/move`, {
        start: ev.start?.toISOString(),
        end: ev.allDay ? null : ev.end?.toISOString(),
        all_day: !!ev.allDay,
      });

      showSnack("success", "Event moved.");
      refreshVisibleRange();
    } catch (error) {
      showSnack("error", extractLaravelError(error, "Move failed. Reverting."));
      changeInfo.revert();
    }
  };

  const handleEventResize = async (changeInfo) => {
    const ev = changeInfo.event;
    if (!apiClient) return;

    if (!isManualEvent(ev) || isHolidayOrBackground(ev)) {
      changeInfo.revert();
      return;
    }

    if (dayjs(ev.start).isBefore(dayjs().startOf("day"))) {
      showSnack("warning", "You can't resize events to past dates.");
      changeInfo.revert();
      return;
    }

    try {
      await apiClient.patch(`${EVENTS_PATH}/${ev.id}/resize`, {
        end: ev.end?.toISOString(),
      });

      showSnack("success", "Event resized.");
      refreshVisibleRange();
    } catch (error) {
      showSnack("error", extractLaravelError(error, "Resize failed. Reverting."));
      changeInfo.revert();
    }
  };

  /* -----------------------------
     Year navigation helpers (sidebar)
  ------------------------------ */
  const gotoToday = () => calendarRef.current?.getApi()?.today();
  const gotoPrev = () => calendarRef.current?.getApi()?.prev();
  const gotoNext = () => calendarRef.current?.getApi()?.next();

  const changeYear = (delta) => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const d = dayjs(api.getDate()).add(delta, "year").toDate();
    api.gotoDate(d);
  };

  /* -----------------------------
     Better event rendering in calendar
  ------------------------------ */
  const renderEventContent = useCallback((arg) => {
    const cat = arg.event.extendedProps?.category || "REMINDER";
    const isDone = !!arg.event.extendedProps?.is_done;

    const icon =
      cat === "TODO"
        ? "📝"
        : cat === "REMINDER"
        ? "⏰"
        : cat === "LEAVE"
        ? "🌴"
        : cat === "OFFDAY"
        ? "🏖️"
        : cat === "AWOL"
        ? "⚠️"
        : cat === "COMPANY"
        ? "🏢"
        : "🎉";

    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0, opacity: isDone ? 0.55 : 1 }}>
        <span>{icon}</span>
        <span
          style={{
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textDecoration: isDone ? "line-through" : "none",
          }}
        >
          {arg.event.title}
        </span>
      </div>
    );
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box m="20px" className="ligco-calendar">
        <Header title="Calendar" subtitle="To-Dos, reminders, HR items, company events, and holidays" />

        <Box display="flex" gap="15px" sx={{ flexDirection: { xs: "column", md: "row" } }}>
          {/* SIDEBAR */}
          <Box
            flex="1 1 25%"
            component={Paper}
            sx={{
              backgroundColor: colors.primary[400],
              p: 2,
              borderRadius: 2,
              boxShadow: 2,
              minWidth: 280,
              height: "fit-content",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h5" fontWeight={900}>
                Upcoming
              </Typography>
              <Chip label={`${events.length} items`} size="small" />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Button variant="outlined" onClick={gotoPrev} fullWidth>
                Prev
              </Button>
              <Button variant="outlined" onClick={gotoToday} fullWidth>
                Today
              </Button>
              <Button variant="outlined" onClick={gotoNext} fullWidth>
                Next
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button variant="outlined" onClick={() => changeYear(-1)} fullWidth>
                - Year
              </Button>
              <Button variant="outlined" onClick={() => changeYear(1)} fullWidth>
                + Year
              </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {fetching ? (
              <Box display="flex" alignItems="center" gap={2}>
                <CircularProgress size={18} />
                <Typography variant="body2">Loading…</Typography>
              </Box>
            ) : (
              <List dense>
                {upcoming.map((event) => {
                  const isDone = !!event.extendedProps?.is_done;
                  const cat = event.extendedProps?.category || "REMINDER";
                  const source = event.extendedProps?.source || "manual";
                  const manual = isManualSource(source);
                  const isAllDay = !!event.allDay;

                  return (
                    <ListItem
                      key={event.id}
                      sx={{
                        backgroundColor: colors.primary[500],
                        mb: 1,
                        borderRadius: 2,
                        borderLeft: `6px solid ${event.backgroundColor}`,
                        opacity: isDone ? 0.7 : 1,
                      }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography fontWeight={900} sx={{ textDecoration: isDone ? "line-through" : "none" }}>
                              {event.title}
                            </Typography>

                            <Chip size="small" label={cat} sx={{ fontWeight: 800 }} />
                            <Chip size="small" variant="outlined" label={source} sx={{ opacity: 0.8 }} />

                            {manual && (cat === "TODO" || cat === "REMINDER") && (
                              <Chip
                                size="small"
                                label={isDone ? "Done" : "Open"}
                                color={isDone ? "success" : "default"}
                                variant={isDone ? "filled" : "outlined"}
                                onClick={() => toggleDone(event.id, !isDone)}
                                disabled={busy}
                                sx={{ cursor: "pointer" }}
                              />
                            )}
                          </Stack>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {formatDate(event.start, isAllDay
                              ? { year: "numeric", month: "short", day: "numeric" }
                              : { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </Typography>
                        }
                      />
                    </ListItem>
                  );
                })}

                {upcoming.length === 0 && (
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    No upcoming items.
                  </Typography>
                )}
              </List>
            )}

            <Divider sx={{ my: 2 }} />

            <Tooltip title="Reload feed">
              <Button variant="outlined" onClick={refreshVisibleRange} fullWidth disabled={fetching}>
                Refresh
              </Button>
            </Tooltip>

            <Alert severity="info" sx={{ mt: 2 }}>
              Kenya public holidays auto-load. {holidaysLoading ? "Loading…" : `(${holidays.length} loaded)`}
              <br />
              Past dates are blocked (create/move/resize). Only manual items can be edited.
            </Alert>
          </Box>

          {/* CALENDAR */}
          <Box
            flex="1 1 75%"
            component={Paper}
            sx={{
              backgroundColor: colors.primary[400],
              p: 2,
              borderRadius: 2,
              boxShadow: 2,
            }}
          >
            <Box sx={{ position: "relative" }}>
              {fetching && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(2px)",
                    backgroundColor: "rgba(0,0,0,0.06)",
                    borderRadius: 2,
                  }}
                >
                  <Stack alignItems="center" spacing={1}>
                    <CircularProgress size={26} />
                    <Typography variant="body2">Loading calendar…</Typography>
                  </Stack>
                </Box>
              )}

              <FullCalendar
                ref={calendarRef}
                height="75vh"
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                headerToolbar={{
                  left: "prevYear,prev,next,nextYear today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
                }}
                initialView="dayGridMonth"
                timeZone="local"
                editable
                selectable
                selectMirror
                dayMaxEvents
                events={mergedEvents}
                eventContent={renderEventContent}
                select={openCreateDialog}
                selectAllow={handleSelectAllow}
                eventAllow={handleEventAllow}
                eventClick={openEditDialog}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                datesSet={handleDatesSet}
                nowIndicator
                scrollTime={scrollTime}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
              />
            </Box>
          </Box>
        </Box>

        {/* CREATE / EDIT DIALOG (manual events only) */}
        <Dialog open={openDialog} onClose={closeDialog} fullWidth maxWidth="sm">
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" fontWeight={900}>
                {mode === "create" ? "Create event" : "Edit event"}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Manual items only. To-Do/Reminder can be marked done.
              </Typography>
            </Box>
            <IconButton onClick={closeDialog} disabled={busy}>
              ✕
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="Title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                fullWidth
                required
              />

              <TextField
                select
                label="Category"
                value={form.category}
                onChange={(e) => {
                  const nextCat = e.target.value;
                  setForm((p) => ({
                    ...p,
                    category: nextCat,
                    // snap to default per category (consistent + predictable)
                    color: defaultColorByCategory(nextCat),
                  }));
                }}
                fullWidth
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Location"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                fullWidth
              />

              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
              />

              {/* All-day toggle + Done toggle */}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  label={form.allDay ? "All day" : "Timed"}
                  onClick={() =>
                    setForm((p) => {
                      const nextAllDay = !p.allDay;
                      const nextStart = p.start || dayjs();
                      const nextEnd = nextAllDay ? nextStart : (p.end && !dayjs(p.end).isBefore(nextStart) ? p.end : nextStart.add(1, "hour"));
                      return { ...p, allDay: nextAllDay, start: nextStart, end: nextEnd };
                    })
                  }
                  variant={form.allDay ? "filled" : "outlined"}
                  disabled={busy}
                  sx={{ cursor: "pointer" }}
                />

                {(form.category === "TODO" || form.category === "REMINDER") && (
                  <Chip
                    label={form.is_done ? "Done" : "Open"}
                    onClick={() => setForm((p) => ({ ...p, is_done: !p.is_done }))}
                    color={form.is_done ? "success" : "default"}
                    variant={form.is_done ? "filled" : "outlined"}
                    disabled={busy}
                    sx={{ cursor: "pointer" }}
                  />
                )}
              </Stack>

              {/* Date pickers: DatePicker for all-day, DateTimePicker for timed */}
              {form.allDay ? (
                <DatePicker
                  label="Date"
                  value={form.start}
                  onChange={(v) => setForm((p) => ({ ...p, start: v || dayjs(), end: v || dayjs() }))}
                />
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <DateTimePicker
                    label="Start"
                    value={form.start}
                    onChange={(v) => setForm((p) => ({ ...p, start: v || dayjs() }))}
                    sx={{ flex: 1 }}
                  />
                  <DateTimePicker
                    label="End"
                    value={form.end}
                    onChange={(v) => setForm((p) => ({ ...p, end: v || dayjs().add(1, "hour") }))}
                    sx={{ flex: 1 }}
                  />
                </Stack>
              )}

              {/* PRESET COLOR CHIPS */}
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 900 }}>
                  Color
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {COLOR_PRESETS.map((c) => {
                    const selected = form.color === c.value;
                    return (
                      <Chip
                        key={c.value}
                        label={c.label}
                        onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                        variant={selected ? "filled" : "outlined"}
                        disabled={busy}
                        sx={{
                          cursor: "pointer",
                          borderColor: c.value,
                          ...(selected ? { outline: `2px solid ${c.value}` } : {}),
                        }}
                      />
                    );
                  })}
                </Stack>
                <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.75 }}>
                  Only preset colors are allowed.
                </Typography>
              </Box>

              {!!formError && <Alert severity="warning">{formError}</Alert>}
              <Alert severity="info">Past dates are blocked. HR/company items are read-only.</Alert>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            {mode === "edit" && (
              <Button color="error" variant="outlined" onClick={handleDelete} disabled={busy}>
                Delete
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" onClick={closeDialog} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={busy || !!formError}
              startIcon={busy ? <CircularProgress size={16} /> : null}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snack.open} autoHideDuration={3500} onClose={closeSnack}>
          <Alert severity={snack.severity} variant="filled" onClose={closeSnack}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default Calendar;

