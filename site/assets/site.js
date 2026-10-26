/* Global behaviour: theme, navigation, copy buttons, filters. */
(function () {
  "use strict";

  let root = document.documentElement;
  let THEME_KEY = "rea-site-theme";

  let applyTheme = function (theme) {
    root.dataset.theme = theme;
    let button = document.querySelector("[data-theme-toggle]");
    if (button) {
      let dark = theme === "dark";
      button.setAttribute(
        "aria-label",
        dark ? "Switch to the light theme" : "Switch to the dark theme",
      );
      button.setAttribute("title", button.getAttribute("aria-label"));
      button.querySelector("[data-theme-icon='sun']").hidden = !dark;
      button.querySelector("[data-theme-icon='moon']").hidden = dark;
    }
  };

  applyTheme(root.dataset.theme || "dark");

  let toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.addEventListener("click", function () {
      let next = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        void error;
      }
    });
  }

  let navToggle = document.querySelector("[data-nav-toggle]");
  let nav = document.querySelector("[data-nav]");
  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      let open = nav.hidden;
      nav.hidden = !open;
      navToggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a") && window.innerWidth <= 940) {
        nav.hidden = true;
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  let copy = function (text, button) {
    let done = function () {
      let label = button.dataset.label || button.textContent;
      button.dataset.label = label;
      button.textContent = "Copied";
      button.dataset.copied = "true";
      window.setTimeout(function () {
        button.textContent = label;
        button.dataset.copied = "false";
      }, 1400);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () {});
      return;
    }
    let area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (error) {
      void error;
    }
    document.body.removeChild(area);
  };

  document.addEventListener("click", function (event) {
    let button = event.target.closest("[data-copy], [data-copy-text]");
    if (!button) return;
    if (button.hasAttribute("data-copy-text")) {
      copy(button.getAttribute("data-copy-text"), button);
      return;
    }
    let selector = button.getAttribute("data-copy");
    let source =
      selector === ""
        ? button.parentElement.querySelector("code, pre")
        : document.querySelector(selector);
    if (!source) return;
    copy((source.textContent || "").trim(), button);
  });

  /* Generic filter: search text plus one optional kind chip row. */
  document.querySelectorAll("[data-filter]").forEach(function (scope) {
    let input = scope.querySelector("[data-filter-search]");
    let counter = scope.querySelector("[data-filter-count]");
    let chips = Array.prototype.slice.call(
      scope.querySelectorAll("[data-filter-kind]"),
    );
    let items = Array.prototype.slice.call(
      scope.querySelectorAll("[data-filter-item]"),
    );
    let active = "all";
    let total = items.length;

    let update = function () {
      let needle = input ? input.value.trim().toLowerCase() : "";
      let shown = 0;
      items.forEach(function (item) {
        let kind = item.dataset.kind || "";
        let haystack = (item.dataset.text || "").toLowerCase();
        let matchesKind = active === "all" || kind === active;
        let matchesText = needle === "" || haystack.indexOf(needle) !== -1;
        let visible = matchesKind && matchesText;
        item.hidden = !visible;
        if (visible) shown += 1;
      });
      if (counter)
        counter.textContent =
          shown === total ? total + " total" : shown + " of " + total;
      let empty = scope.querySelector("[data-filter-empty]");
      if (empty) empty.hidden = shown !== 0 || total === 0;
    };

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        active = chip.dataset.filterKind;
        chips.forEach(function (other) {
          other.setAttribute(
            "aria-pressed",
            String(other.dataset.filterKind === active),
          );
        });
        update();
      });
    });

    if (input) input.addEventListener("input", update);
    update();
  });
})();
