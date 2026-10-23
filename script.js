(function () {
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const root = document.documentElement;

  // Theme (remembered in browser)
  try {
    const saved = localStorage.getItem("theme");
    if (saved) root.dataset.theme = saved;
    else if (matchMedia("(prefers-color-scheme: dark)").matches) root.dataset.theme = "dark";
  } catch (e) {}
  $("#theme").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  // Mobile menu
  const burger = $("#burger"), menu = $("#menu");
  burger.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  $$("#menu a").forEach(a => a.addEventListener("click", () => {
    menu.classList.remove("open");
    burger.setAttribute("aria-expanded", false);
  }));

  // Typing roles in hero
  const roles = ["fast websites.", "clean interfaces.", "web apps.", "ideas that work."];
  const el = $("#role");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = roles[0];
  } else {
    let r = 0, c = 0, del = false;
    (function tick() {
      const word = roles[r];
      el.textContent = word.slice(0, c);
      if (!del && c === word.length) { del = true; return setTimeout(tick, 1400); }
      if (del && c === 0) { del = false; r = (r + 1) % roles.length; }
      c += del ? -1 : 1;
      setTimeout(tick, del ? 40 : 90);
    })();
  }

  // Skill bars + counters when visible
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const t = e.target;
      if (t.dataset.w) t.style.width = t.dataset.w + "%";
      if (t.dataset.to) {
        const to = +t.dataset.to; let n = 0;
        const step = setInterval(() => {
          n++; t.textContent = n;
          if (n >= to) clearInterval(step);
        }, 60);
      }
      io.unobserve(t);
    });
  }, { threshold: 0.4 });
  $$("[data-w],[data-to]").forEach(n => io.observe(n));

  // Products (loaded from products.json, managed in admin.html)
  const grid = $("#grid"), filters = $("#filters");
  function card(p) {
    const a = document.createElement("article");
    a.className = "card"; a.dataset.cat = p.cat || "other";
    let t;
    if (p.image) { t = document.createElement("img"); t.src = p.image; t.alt = p.title; t.loading = "lazy"; t.className = "thumb thumb-img"; }
    else { t = document.createElement("div"); t.className = "thumb t1"; t.textContent = (p.title || "?")[0]; }
    const h = document.createElement("h3"); h.textContent = p.title;
    const d = document.createElement("p"); d.textContent = p.desc || "";
    a.append(t, h, d);
    if (p.price) { const pr = document.createElement("p"); pr.className = "price"; pr.textContent = p.price; a.append(pr); }
    if (/^https?:\/\//.test(p.link || "")) {
      const l = document.createElement("a"); l.href = p.link; l.target = "_blank"; l.rel = "noopener"; l.className = "btn small"; l.textContent = "View product"; a.append(l);
    }
    return a;
  }
  fetch("products.json?v=" + Date.now()).then(r => r.json()).then(list => {
    grid.replaceChildren(...list.map(card));
    if (!list.length) grid.textContent = "No products yet.";
    const cats = ["all", ...new Set(list.map(p => p.cat).filter(Boolean))];
    cats.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "chip" + (i ? "" : " active"); b.dataset.f = c; b.textContent = c === "all" ? "All" : c;
      b.addEventListener("click", () => {
        $$(".chip", filters).forEach(x => x.classList.remove("active")); b.classList.add("active");
        $$(".card", grid).forEach(k => k.classList.toggle("hide", c !== "all" && k.dataset.cat !== c));
      });
      filters.append(b);
    });
  }).catch(() => { grid.textContent = "Could not load products."; });

  // Contact form (no backend: opens the visitor's email app)
  const MY_EMAIL = "youremail@example.com"; // <-- apna email yahan likho
  $("#form").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#name"), email = $("#email"), msg = $("#msg"), status = $("#status");
    let ok = true;
    [name, email, msg].forEach(f => {
      const bad = !f.value.trim() || (f === email && !/^\S+@\S+\.\S+$/.test(f.value));
      f.classList.toggle("err", bad);
      if (bad) ok = false;
    });
    if (!ok) { status.textContent = "Please fill every field with valid details."; return; }
    const body = `${msg.value}\n\nFrom: ${name.value} (${email.value})`;
    location.href = `mailto:${MY_EMAIL}?subject=${encodeURIComponent("Portfolio message from " + name.value)}&body=${encodeURIComponent(body)}`;
    status.textContent = "Opening your email app...";
  });

  $("#year").textContent = new Date().getFullYear();
})();
