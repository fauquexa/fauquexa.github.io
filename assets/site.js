/* ---------- theme toggle (remembered per browser) ---------- */
(function () {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  root.dataset.theme = saved || "dark";   // dark by default; the button switches and remembers

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".theme-btn");
    if (btn) {
      const label = () => {
        const dark = root.dataset.theme
          ? root.dataset.theme === "dark"
          : matchMedia("(prefers-color-scheme: dark)").matches;
        btn.textContent = dark ? "Light mode" : "Dark mode";
      };
      label();
      btn.addEventListener("click", () => {
        const dark = root.dataset.theme
          ? root.dataset.theme === "dark"
          : matchMedia("(prefers-color-scheme: dark)").matches;
        root.dataset.theme = dark ? "light" : "dark";
        try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
        label();
      });
    }

    /* email, assembled here so it isn't plain text in the HTML */
    const email = ["alain_fq", "berkeley.edu"].join("@");
    document.querySelectorAll("[data-email]").forEach((el) => {
      el.href = "mailto:" + email;
      if (el.dataset.email === "text") el.textContent = email;
    });

    /* links to other websites open in a new tab, so visitors keep this page */
    document.querySelectorAll("a[href]").forEach((el) => {
      let url; try { url = new URL(el.getAttribute("href"), location.href); } catch (e) { return; }
      if (/^https?:$/.test(url.protocol) && url.origin !== location.origin) { el.target = "_blank"; el.rel = "noopener noreferrer"; }
    });

    /* highlight nav entry for the section in view */
    const links = [...document.querySelectorAll(".side nav a[href^='#']")].filter((a) => a.getAttribute("href") !== "#play");   // the playground column is always on screen
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    if ("IntersectionObserver" in window && map.size) {
      const io = new IntersectionObserver((ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.remove("active"));
            const a = map.get(e.target.id);
            if (a) a.classList.add("active");
          }
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  });
})();
