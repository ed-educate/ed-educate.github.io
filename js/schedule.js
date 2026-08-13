(function () {
  "use strict";

  var DAY_MS = 24 * 60 * 60 * 1000;
  var WEEK_MS = 7 * DAY_MS;
  var MINUTE_MS = 60 * 1000;
  var HOUR_MS = 60 * MINUTE_MS;
  var SESSION_AFTER_CUTOFF_MS = 19 * HOUR_MS + 25 * MINUTE_MS;
  var FIRST_CUTOFF_MS = Date.parse("2026-08-11T21:00:00Z");
  var THEME_PERIOD_MS = 7 * WEEK_MS;
  var MOSCOW_TIME_ZONE = "Europe/Moscow";

  var ARTICLE_THEMES = {
    stuk: {
      name: "Стук",
      firstSessionStartMs: Date.parse("2026-08-05T16:25:00Z")
    },
    sluh: {
      name: "Слух",
      firstSessionStartMs: Date.parse("2026-08-12T16:25:00Z")
    }
  };

  var dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: MOSCOW_TIME_ZONE
  });

  function getSchedule(nowMs) {
    var weeksSinceFirst = nowMs < FIRST_CUTOFF_MS
      ? 0
      : Math.floor((nowMs - FIRST_CUTOFF_MS) / WEEK_MS) + 1;
    var cutoffMs = FIRST_CUTOFF_MS + weeksSinceFirst * WEEK_MS;

    return {
      cutoffMs: cutoffMs,
      sessionStartMs: cutoffMs + SESSION_AFTER_CUTOFF_MS,
      sessionWeekday: "среду",
      sessionWeekdayTitle: "Среда",
      cutoffWeekday: "вторника",
      sessionTime: "19:25"
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

  function getWord(value, one, few, many) {
    var lastTwoDigits = value % 100;
    var lastDigit = value % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return many;
    if (lastDigit === 1) return one;
    if (lastDigit >= 2 && lastDigit <= 4) return few;
    return many;
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

  function formatThemeCountdown(milliseconds) {
    var totalMinutes = Math.max(0, Math.ceil(milliseconds / MINUTE_MS));
    var weeks = Math.floor(totalMinutes / (7 * 24 * 60));
    var days = Math.floor((totalMinutes % (7 * 24 * 60)) / (24 * 60));
    var hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    var minutes = totalMinutes % 60;
    var parts = [];

    if (weeks > 0) {
      parts.push(weeks + " " + getWord(weeks, "неделя", "недели", "недель"));
      if (days > 0) parts.push(days + " " + getDayWord(days));
      return parts.join(" ");
    }

    if (days > 0) parts.push(days + " " + getDayWord(days));
    if (hours > 0) parts.push(hours + " " + getWord(hours, "час", "часа", "часов"));
    if (days === 0 && minutes > 0) {
      parts.push(minutes + " " + getWord(minutes, "минута", "минуты", "минут"));
    }

    return parts.length > 0 ? parts.join(" ") : "меньше минуты";
  }

  function getThemeSchedule(themeKey, nowMs) {
    var theme = ARTICLE_THEMES[themeKey];
    if (!theme) return null;

    var firstCutoffMs = theme.firstSessionStartMs - SESSION_AFTER_CUTOFF_MS;
    var periodsSinceFirst = nowMs < firstCutoffMs
      ? 0
      : Math.floor((nowMs - firstCutoffMs) / THEME_PERIOD_MS) + 1;
    var sessionStartMs = theme.firstSessionStartMs + periodsSinceFirst * THEME_PERIOD_MS;
    var cutoffMs = sessionStartMs - SESSION_AFTER_CUTOFF_MS;
    var weeklySchedule = getSchedule(nowMs);

    return {
      name: theme.name,
      sessionStartMs: sessionStartMs,
      cutoffMs: cutoffMs,
      followingSessionStartMs: sessionStartMs + THEME_PERIOD_MS,
      isNearestSession: sessionStartMs === weeklySchedule.sessionStartMs
    };
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

  function updateTextInside(container, selector, value) {
    container.querySelectorAll(selector).forEach(function (element) {
      element.textContent = value;
    });
  }

  function updateTimeInside(container, selector, timestamp, displayTimestamp) {
    var isoDate = new Date(timestamp).toISOString();
    var label = dateFormatter.format(new Date(displayTimestamp === undefined ? timestamp : displayTimestamp));

    container.querySelectorAll(selector).forEach(function (element) {
      element.textContent = label;
      element.setAttribute("datetime", isoDate);
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

  function renderThemeSchedules(nowMs) {
    document.querySelectorAll("[data-theme-schedule]").forEach(function (container) {
      var schedule = getThemeSchedule(container.getAttribute("data-theme-schedule"), nowMs);
      if (!schedule) return;

      var isNearestSession = schedule.isNearestSession;
      var invite = container.closest(".invite");
      var primaryButton = invite ? invite.querySelector("[data-theme-primary]") : null;
      var deadline = container.querySelector("[data-theme-deadline]");

      updateTextInside(
        container,
        "[data-theme-window-label]",
        isNearestSession ? "Ближайшая встреча — «" + schedule.name + "»" : "Следующий «" + schedule.name + "»"
      );
      updateTimeInside(container, "[data-theme-date]", schedule.sessionStartMs);
      updateTextInside(container, "[data-theme-time]", "19:25");
      updateTextInside(
        container,
        "[data-theme-countdown-label]",
        "До встречи"
      );
      updateTextInside(
        container,
        "[data-theme-countdown]",
        formatThemeCountdown(schedule.sessionStartMs - nowMs)
      );

      if (deadline) {
        deadline.hidden = !isNearestSession;
        updateTimeInside(deadline, "[data-theme-cutoff-date]", schedule.cutoffMs, schedule.cutoffMs - 1);
      }

      updateTextInside(
        container,
        "[data-theme-cadence]",
        isNearestSession
          ? "Метафора возвращается раз в семь недель. После этой встречи следующий «" + schedule.name + "» — " + dateFormatter.format(new Date(schedule.followingSessionStartMs)) + "."
          : "Метафора возвращается раз в семь недель."
      );

      if (primaryButton) {
        primaryButton.textContent = isNearestSession
          ? "Прийти на «" + schedule.name + "» — 1 900 ₽"
          : "Прийти на ближайшую встречу — 1 900 ₽";
      }
    });
  }

  function startSchedule() {
    var nowMs = Date.now();
    renderSchedule(nowMs);
    renderThemeSchedules(nowMs);
    window.setInterval(function () {
      var currentNowMs = Date.now();
      renderSchedule(currentNowMs);
      renderThemeSchedules(currentNowMs);
    }, 1000);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      FIRST_CUTOFF_MS: FIRST_CUTOFF_MS,
      THEME_PERIOD_MS: THEME_PERIOD_MS,
      WEEK_MS: WEEK_MS,
      formatCountdown: formatCountdown,
      formatThemeCountdown: formatThemeCountdown,
      getSchedule: getSchedule,
      getThemeSchedule: getThemeSchedule
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
