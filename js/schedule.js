(function () {
  "use strict";

  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  var HOUR_MS = 60 * 60 * 1000;
  var REFERENCE_CUTOFF_MS = Date.parse("2026-07-17T21:00:00Z");
  var ONE_OFF_ACTIVE_FROM_MS = REFERENCE_CUTOFF_MS;
  var ONE_OFF_CUTOFF_MS = Date.parse("2026-07-25T21:00:00Z");
  var MOSCOW_TIME_ZONE = "Europe/Moscow";

  var dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: MOSCOW_TIME_ZONE
  });

  function getSchedule(nowMs) {
    if (nowMs >= ONE_OFF_ACTIVE_FROM_MS && nowMs < ONE_OFF_CUTOFF_MS) {
      return {
        cutoffMs: ONE_OFF_CUTOFF_MS,
        sessionStartMs: ONE_OFF_CUTOFF_MS + 12 * HOUR_MS,
        sessionWeekday: "воскресенье",
        cutoffWeekday: "субботы"
      };
    }

    var weeksSinceReference = Math.floor((nowMs - REFERENCE_CUTOFF_MS) / WEEK_MS) + 1;
    var cutoffMs = REFERENCE_CUTOFF_MS + weeksSinceReference * WEEK_MS;

    return {
      cutoffMs: cutoffMs,
      sessionStartMs: cutoffMs + 12 * HOUR_MS,
      sessionWeekday: "субботу",
      cutoffWeekday: "пятницы"
    };
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
    updateTextElements("[data-cutoff-weekday]", schedule.cutoffWeekday);

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
      REFERENCE_CUTOFF_MS: REFERENCE_CUTOFF_MS,
      ONE_OFF_ACTIVE_FROM_MS: ONE_OFF_ACTIVE_FROM_MS,
      ONE_OFF_CUTOFF_MS: ONE_OFF_CUTOFF_MS,
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
