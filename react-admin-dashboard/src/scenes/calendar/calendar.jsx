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
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useAuth } from "../../api/AuthProvider";
import { toast } from "react-toastify";

/* -----------------------------
   Categories
------------------------------ */
const CATEGORIES = [
  { value: "TODO", label: "To-Do" },
  { value: "REMINDER", label: "Reminder" },
];

const categoryColor = (cat, colors) => {
  switch (cat) {
    case "TODO":
      return colors.blueAccent[500];
    case "REMINDER":
      return colors.greenAccent[500];
    case "HOLIDAY":
      return colors.redAccent[400];
    default:
      return colors.greenAccent[500];
  }
};

/* -----------------------------
   Holidays (Public API)
   NOTE: In production, best to proxy via your backend to avoid CORS/rate limits.
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
  color: "",
};

const Calendar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { apiClient } = useAuth();

  const calendarRef = useRef(null);

  /* -----------------------------
     State
  ------------------------------ */
  const [events, setEvents] = useState([]);
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

  const normalizeFromLaravel = useCallback(
    (e) => {
      const cat = e.category || "REMINDER";
      const fallbackColor = categoryColor(cat, colors);

      return {
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end,
        allDay: !!e.all_day,
        backgroundColor: e.color || fallbackColor,
        borderColor: e.color || fallbackColor,
        extendedProps: {
          category: cat,
          description: e.description,
          location: e.location,
          createdBy: e.created_by,
          updatedAt: e.updated_at,
          color: e.color,
        },
      };
    },
    [colors]
  );

  /* -----------------------------
     Events fetch (backend)
  ------------------------------ */
  const fetchEvents = useCallback(async () => {
    if (!apiClient) return;
    setFetching(true);
    try {
      const res = await apiClient.get("/calendar/events");
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setEvents(list.map(normalizeFromLaravel));
    } catch (error) {
      console.error("Calendar fetch failed:", error?.response?.data || error);
      const msg = extractLaravelError(error, "Failed to load calendar events.");
      toast.error(msg);
      showSnack("error", msg);
    } finally {
      setFetching(false);
    }
  }, [apiClient, normalizeFromLaravel]);

  // Fetch once when apiClient becomes ready
  useEffect(() => {
    if (apiClient) fetchEvents();
    // intentionally only depend on apiClient to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiClient]);

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

    // abort prior holiday request
    if (holidayAbortRef.current) holidayAbortRef.current.abort();
    const controller = new AbortController();
    holidayAbortRef.current = controller;

    setHolidaysLoading(true);
    try {
      const res = await fetch(`${HOLIDAYS_API}/${year}/${COUNTRY_CODE}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Holidays API failed: ${res.status}`);
      const data = await res.json();

      const normalized = Array.isArray(data) ? data.map(normalizeHoliday) : [];
      holidaysCacheRef.current.set(year, normalized);
      return normalized;
    } finally {
      setHolidaysLoading(false);
    }
  }, []);

  // Preload current year + next year
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

  // When calendar view changes, auto-fetch holidays for that viewed year
  const handleDatesSet = useCallback(
    async (arg) => {
      const y = dayjs(arg.start).year();
      if (loadedYearsRef.current.has(y)) return;

      loadedYearsRef.current.add(y);

      try {
        const list = await fetchHolidaysForYear(y);
        setHolidays((prev) => {
          const ids = new Set(prev.map((x) => x.id));
          const next = [...prev];
          for (const h of list) if (!ids.has(h.id)) next.push(h);
          return next;
        });
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error(e);
          toast.warning("Could not load public holidays for that year.");
        }
      }
    },
    [fetchHolidaysForYear]
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
  const todayStart = useMemo(() => dayjs().startOf("day"), []);

  const handleSelectAllow = useCallback((selectInfo) => {
    const start = dayjs(selectInfo.start);
    return !start.isBefore(dayjs().startOf("day"));
  }, []);

  const handleEventAllow = useCallback((dropInfo, draggedEvent) => {
    const start = dayjs(dropInfo.start);
    const t0 = dayjs().startOf("day");

    if (draggedEvent?.extendedProps?.category === "HOLIDAY" || draggedEvent?.display === "background") {
      return false;
    }
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
    const end = selected.endStr ? dayjs(selected.endStr) : start.add(1, "hour");

    setForm({
      ...emptyForm,
      start,
      end,
      allDay: !!selected.allDay,
      category: "REMINDER",
      color: "",
    });
    setOpenDialog(true);
  };

  const openEditDialog = (clickInfo) => {
    const ev = clickInfo.event;
    if (ev.extendedProps?.category === "HOLIDAY" || ev.display === "background") return;

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
      color: ev.extendedProps?.color || ev.backgroundColor || "",
    });
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setForm(emptyForm);
  };

  /* -----------------------------
     Validation + CRUD
  ------------------------------ */
  const validateForm = () => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.start) return "Start is required.";
    if (!form.allDay && !form.end) return "End is required for timed events.";
    if (form.end && dayjs(form.end).isBefore(dayjs(form.start))) return "End time must be after start time.";
    if (!["TODO", "REMINDER"].includes(form.category)) return "Invalid category.";

    const t0 = dayjs().startOf("day");
    if (dayjs(form.start).isBefore(t0)) return "You can't create or move events to past dates.";

    return null;
  };

  const handleSave = async () => {
    const errMsg = validateForm();
    if (errMsg) return showSnack("warning", errMsg);
    if (!apiClient) return showSnack("error", "API client not ready.");

    setBusy(true);
    try {
      const fallbackColor = categoryColor(form.category, colors);

      const payload = {
        title: form.title,
        category: form.category,
        description: form.description || null,
        location: form.location || null,
        start: form.start.toISOString(),
        end: form.allDay ? null : form.end.toISOString(),
        all_day: !!form.allDay,
        color: form.color || fallbackColor,
      };

      if (mode === "create") {
        await apiClient.post("/calendar/events", payload);
        toast.success("Event created.");
        showSnack("success", "Event created.");
      } else {
        await apiClient.put(`/calendar/events/${form.id}`, payload);
        toast.success("Event updated.");
        showSnack("success", "Event updated.");
      }

      closeDialog();
      fetchEvents();
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
      await apiClient.delete(`/calendar/events/${form.id}`);
      toast.success("Event deleted.");
      showSnack("success", "Event deleted.");
      closeDialog();
      fetchEvents();
    } catch (error) {
      console.error("Calendar delete failed:", error?.response?.data || error);
      const msg = extractLaravelError(error, "Failed to delete event.");
      toast.error(msg);
      showSnack("error", msg);
    } finally {
      setBusy(false);
    }
  };

  const handleEventDrop = async (changeInfo) => {
    const ev = changeInfo.event;
    if (!apiClient) return;

    if (ev.extendedProps?.category === "HOLIDAY" || ev.display === "background") {
      changeInfo.revert();
      return;
    }

    if (dayjs(ev.start).isBefore(dayjs().startOf("day"))) {
      showSnack("warning", "You can't move events to past dates.");
      changeInfo.revert();
      return;
    }

    try {
      await apiClient.patch(`/calendar/events/${ev.id}/move`, {
        start: ev.start?.toISOString(),
        end: ev.allDay ? null : ev.end?.toISOString(),
        all_day: !!ev.allDay,
      });
      showSnack("success", "Event moved.");
    } catch (error) {
      showSnack("error", extractLaravelError(error, "Move failed. Reverting."));
      changeInfo.revert();
    }
  };

  const handleEventResize = async (changeInfo) => {
    const ev = changeInfo.event;
    if (!apiClient) return;

    if (ev.extendedProps?.category === "HOLIDAY" || ev.display === "background") {
      changeInfo.revert();
      return;
    }

    if (dayjs(ev.start).isBefore(dayjs().startOf("day"))) {
      showSnack("warning", "You can't move events to past dates.");
      changeInfo.revert();
      return;
    }

    try {
      await apiClient.patch(`/calendar/events/${ev.id}/resize`, {
        end: ev.end?.toISOString(),
      });
      showSnack("success", "Event resized.");
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
    const icon = cat === "TODO" ? "📝" : cat === "REMINDER" ? "⏰" : "🎉";

    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
        <span>{icon}</span>
        <span
          style={{
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
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
        <Header title="Calendar" subtitle="To-Dos, reminders, and holidays" />

        <Box display="flex" gap="15px">
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
              <Typography variant="h5">Upcoming</Typography>
              <Chip label={`${events.length} events`} size="small" />
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Navigation controls incl. years */}
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
                <Typography variant="body2">Loading events…</Typography>
              </Box>
            ) : (
              <List dense>
                {upcoming.map((event) => (
                  <ListItem
                    key={event.id}
                    sx={{
                      backgroundColor: colors.primary[500],
                      mb: 1,
                      borderRadius: 2,
                      borderLeft: `6px solid ${event.backgroundColor}`,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={800}>{event.title}</Typography>
                          <Chip
                            size="small"
                            label={event.extendedProps?.category || "REMINDER"}
                            sx={{ fontWeight: 800 }}
                          />
                        </Stack>
                      }
                      secondary={
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {formatDate(event.start, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}

                {upcoming.length === 0 && (
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    No upcoming events.
                  </Typography>
                )}
              </List>
            )}

            <Divider sx={{ my: 2 }} />

            <Tooltip title="Reload events">
              <Button variant="outlined" onClick={fetchEvents} fullWidth disabled={fetching}>
                Refresh
              </Button>
            </Tooltip>

            <Alert severity="info" sx={{ mt: 2 }}>
              Holidays auto-load for Kenya. {holidaysLoading ? "Loading…" : `(${holidays.length} loaded)`}
              <br />
              Past dates are blocked (create/move/resize).
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
              opacity: fetching ? 0.9 : 1,
            }}
          >
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

        {/* CREATE / EDIT DIALOG */}
        <Dialog open={openDialog} onClose={closeDialog} fullWidth maxWidth="sm">
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {mode === "create" ? "Create event" : "Edit event"}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Category: To-Do or Reminder (no past dates)
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
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
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

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <DateTimePicker
                  label="Start"
                  value={form.start}
                  onChange={(v) => setForm((p) => ({ ...p, start: v }))}
                  sx={{ flex: 1 }}
                />
                <DateTimePicker
                  label="End"
                  value={form.end}
                  onChange={(v) => setForm((p) => ({ ...p, end: v }))}
                  sx={{ flex: 1 }}
                  disabled={form.allDay}
                />
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Color"
                  type="color"
                  value={form.color || categoryColor(form.category, colors)}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  sx={{ width: 140 }}
                  InputLabelProps={{ shrink: true }}
                />

                <Chip
                  label={form.allDay ? "All day" : "Timed"}
                  onClick={() =>
                    setForm((p) => {
                      const nextAllDay = !p.allDay;
                      // if turning timed back on and end missing, ensure end exists
                      const nextEnd =
                        !nextAllDay && (!p.end || dayjs(p.end).isBefore(dayjs(p.start)))
                          ? dayjs(p.start).add(1, "hour")
                          : p.end;
                      return { ...p, allDay: nextAllDay, end: nextEnd };
                    })
                  }
                  variant={form.allDay ? "filled" : "outlined"}
                  disabled={busy}
                />
              </Stack>

              {form.allDay && <Alert severity="info">All-day events don’t require an end time.</Alert>}
              <Alert severity="warning">Past dates are not allowed.</Alert>
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
            <Button variant="contained" onClick={handleSave} disabled={busy}>
              {busy ? "Saving..." : "Save"}
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
