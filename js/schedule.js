(function () {
  "use strict";

  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  var MINUTE_MS = 60 * 1000;
  var HOUR_MS = 60 * MINUTE_MS;
  var FIRST_CUTOFF_MS = Date.parse("2026-08-11T21:00:00Z");
  var RESCHEDULE_WINDOW_START_MS = Date.parse("2026-08-18T21:00:00Z");
  var RESCHEDULED_CUTOFF_MS = Date.parse("2026-08-29T21:00:00Z");
  var RESCHEDULED_SESSION_START_MS = Date.parse("2026-08-30T09:00:00Z");
  var MOSCOW_TIME_ZONE = "Europe/Moscow";

  var dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: MOSCOW_TIME_ZONE
  });

  function getRegularSchedule(nowMs) {
    var weeksSinceFirst = nowMs < FIRST_CUTOFF_MS
      ? 0
      : Math.floor((nowMs - FIRST_CUTOFF_MS) / WEEK_MS) + 1;
    var cutoffMs = FIRST_CUTOFF_MS + weeksSinceFirst * WEEK_MS;

    return {
      cutoffMs: cutoffMs,
      sessionStartMs: cutoffMs + 19 * HOUR_MS + 25 * MINUTE_MS,
      sessionWeekday: "среду",
      sessionWeekdayTitle: "Среда",
      cutoffWeekday: "вторника",
      sessionTime: "19:25"
    };
  }

  function getSchedule(nowMs) {
    if (nowMs >= RESCHEDULE_WINDOW_START_MS && nowMs < RESCHEDULED_CUTOFF_MS) {
      return {
        cutoffMs: RESCHEDULED_CUTOFF_MS,
        sessionStartMs: RESCHEDULED_SESSION_START_MS,
        sessionWeekday: "воскресенье",
        sessionWeekdayTitle: "Воскресенье",
        cutoffWeekday: "субботы",
        sessionTime: "12:00"
      };
    }

    return getRegularSchedule(nowMs);
  }

  function getDayWord(days) {
    var lastTwoDigits = days % 100;
    var lastDigit = days % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "дней";
    if (lastDigit === 1) return "день";
    if (lastDigit >= 2 && lastDigit <= 4) return "дня";
    return "дней";
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatCountdown(milliseconds) {
    var totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    var clock = pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);

    return days > 0 ? days + " " + getDayWord(days) + " " + clock : clock;
  }

  function updateTimeElements(selector, timestamp, displayTimestamp) {
    var isoDate = new Date(timestamp).toISOString();
    var label = dateFormatter.format(new Date(displayTimestamp === undefined ? timestamp : displayTimestamp));

    document.querySelectorAll(selector).forEach(function (element) {
      element.textContent = label;
      element.setAttribute("datetime", isoDate);
    });
  }

  function updateTextElements(selector, value) {
    document.querySelectorAll(selector).forEach(function (element) {
      element.textContent = value;
    });
  }

  function renderSchedule(nowMs) {
    var schedule = getSchedule(nowMs);

    updateTimeElements("[data-session-date]", schedule.sessionStartMs);
    updateTimeElements("[data-cutoff-date]", schedule.cutoffMs, schedule.cutoffMs - 1);
    updateTextElements("[data-session-weekday]", schedule.sessionWeekday);
    updateTextElements("[data-session-weekday-title]", schedule.sessionWeekdayTitle);
    updateTextElements("[data-cutoff-weekday]", schedule.cutoffWeekday);
    updateTextElements("[data-session-time]", schedule.sessionTime);

    document.querySelectorAll("[data-signup-countdown]").forEach(function (element) {
      element.textContent = formatCountdown(schedule.cutoffMs - nowMs);
    });

    return schedule;
  }

  function startSchedule() {
    renderSchedule(Date.now());
    window.setInterval(function () {
      renderSchedule(Date.now());
    }, 1000);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      FIRST_CUTOFF_MS: FIRST_CUTOFF_MS,
      RESCHEDULE_WINDOW_START_MS: RESCHEDULE_WINDOW_START_MS,
      RESCHEDULED_CUTOFF_MS: RESCHEDULED_CUTOFF_MS,
      RESCHEDULED_SESSION_START_MS: RESCHEDULED_SESSION_START_MS,
      WEEK_MS: WEEK_MS,
      formatCountdown: formatCountdown,
      getSchedule: getSchedule
    };
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startSchedule);
    } else {
      startSchedule();
    }
  }
})();
