(function () {
  var productionHosts = ["skrizhali.surge.sh", "ed-educate.github.io"];
  var noticeKey = "doverie_cookie_notice_v1";
  var counterId = 109811961;

  if (productionHosts.indexOf(window.location.hostname) !== -1 && window.location.protocol === "http:") {
    window.location.replace("https://" + window.location.host + window.location.pathname + window.location.search + window.location.hash);
    return;
  }

  function isNoticeClosed() {
    try {
      return window.localStorage.getItem(noticeKey) === "closed";
    } catch (error) {
      return window.__doverieCookieNoticeClosed === true;
    }
  }

  function closeNotice() {
    try {
      window.localStorage.setItem(noticeKey, "closed");
    } catch (error) {
      window.__doverieCookieNoticeClosed = true;
    }
  }

  function loadMetrika() {
    if (window.__doverieMetrikaLoaded) return;
    window.__doverieMetrikaLoaded = true;

    window.ym = window.ym || function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = 1 * new Date();

    if (!document.querySelector('script[src^="https://mc.yandex.ru/metrika/tag.js"]')) {
      var script = document.createElement("script");
      script.async = true;
      script.src = "https://mc.yandex.ru/metrika/tag.js?id=" + counterId;
      document.head.appendChild(script);
    }

    window.ym(counterId, "init", {
      ssr: true,
      webvisor: false,
      clickmap: false,
      accurateTrackBounce: true,
      trackLinks: true
    });
  }

  function readReactionState() {
    try {
      return JSON.parse(window.localStorage.getItem("doverie_reactions_v1") || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function writeReactionState(state) {
    try {
      window.localStorage.setItem("doverie_reactions_v1", JSON.stringify(state));
    } catch (error) {
      window.__doverieReactionState = state;
    }
  }

  function trackReaction(card, type, active, count) {
    var payload = {
      card: card,
      reaction: type,
      active: active,
      count: count
    };

    window.__doverieReactionEvents = window.__doverieReactionEvents || [];
    window.__doverieReactionEvents.push(payload);

    if (typeof window.ym === "function") {
      window.ym(counterId, "reachGoal", "reaction_click", payload);
    }
  }

  function setupReactions() {
    var buttons = document.querySelectorAll("[data-reaction-card][data-reaction-type]");
    if (!buttons.length) return;

    var state = readReactionState();

    buttons.forEach(function (button) {
      var key = button.getAttribute("data-reaction-card") + ":" + button.getAttribute("data-reaction-type");
      var base = parseInt(button.getAttribute("data-reaction-base") || "0", 10);
      var count = button.querySelector("[data-reaction-count]");
      var active = state[key] === true;

      button.setAttribute("aria-pressed", active ? "true" : "false");
      if (count) count.textContent = String(base + (active ? 1 : 0));

      button.addEventListener("click", function () {
        state[key] = state[key] !== true;
        writeReactionState(state);

        var isActive = state[key] === true;
        var nextCount = base + (isActive ? 1 : 0);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
        if (count) count.textContent = String(nextCount);

        trackReaction(
          button.getAttribute("data-reaction-card"),
          button.getAttribute("data-reaction-type"),
          isActive,
          nextCount
        );
      });
    });
  }

  function showBanner() {
    var banner = document.querySelector("[data-cookie-consent]");
    if (banner) banner.hidden = false;
  }

  function hideBanner() {
    var banner = document.querySelector("[data-cookie-consent]");
    if (banner) banner.hidden = true;
  }

  document.addEventListener("click", function (event) {
    var close = event.target.closest("[data-cookie-close]");
    if (close) {
      closeNotice();
      hideBanner();
    }
  });

  loadMetrika();
  setupReactions();

  if (!isNoticeClosed()) {
    showBanner();
  }
})();
