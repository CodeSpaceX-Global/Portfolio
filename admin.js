(() => {
  const $ = s => document.querySelector(s);
  const enc = s => btoa(unescape(encodeURIComponent(s)));
  const dec = b => decodeURIComponent(escape(atob(b.replace(/\n/g, ""))));
  let cfg = null, products = [], sha = null, editing = null, imgData = null;

  const api = (path, opt = {}) =>
    fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/${path}`, {
      ...opt,
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json", ...(opt.headers || {}) }
    });

  async function start(c) {
    cfg = c;
    const r = await api("");
    if (!r.ok) throw new Error(r.status === 401 ? "Token is wrong or expired." : "Repository not found. Check username and repo name.");
    const j = await r.json();
    if (!j.permissions || !j.permissions.push) throw new Error("This token cannot write to the repo. Give it Contents: Read and write.");
    sessionStorage.setItem("cfg", JSON.stringify(cfg));
    $("#login").hidden = true; $("#dash").hidden = false;
    $("#who").textContent = `Logged in as ${cfg.owner} on ${cfg.repo}`;
    await load();
  }

  async function load() {
    const r = await api("contents/products.json?t=" + Date.now());
    if (r.status === 404) { products = []; sha = null; }
    else { const j = await r.json(); sha = j.sha; products = JSON.parse(dec(j.content)); }
    render();
  }

  async function saveAll(message) {
    const body = { message, content: enc(JSON.stringify(products, null, 2)) };
    if (sha) body.sha = sha;
    const r = await api("contents/products.json", { method: "PUT", body: JSON.stringify(body) });
    if (!r.ok) throw new Error("Save failed (" + r.status + "). Reload and try again.");
    sha = (await r.json()).content.sha;
  }

  async function uploadImage() {
    const path = `images/p-${Date.now()}.jpg`;
    const r = await api("contents/" + path, { method: "PUT", body: JSON.stringify({ message: "Add product image", content: imgData }) });
    if (!r.ok) throw new Error("Image upload failed (" + r.status + ").");
    return path;
  }

  function render() {
    const ul = $("#list"); ul.replaceChildren();
    $("#cats").replaceChildren(...[...new Set(products.map(p => p.cat).filter(Boolean))].map(c => Object.assign(document.createElement("option"), { value: c })));
    if (!products.length) ul.textContent = "No products yet. Add your first one above.";
    products.forEach(p => {
      const li = document.createElement("li");
      let im;
      if (p.image) { im = document.createElement("img"); im.src = p.image; im.alt = ""; } else { im = document.createElement("div"); im.className = "ph"; }
      const info = document.createElement("div"); info.className = "info";
      const b = document.createElement("b"); b.textContent = p.title;
      const s = document.createElement("span"); s.className = "muted"; s.textContent = [p.cat, p.price].filter(Boolean).join(" | ");
      info.append(b, s);
      const e = document.createElement("button"); e.textContent = "Edit"; e.onclick = () => edit(p);
      const d = document.createElement("button"); d.textContent = "Delete"; d.className = "del"; d.onclick = () => remove(p);
      li.append(im, info, e, d); ul.append(li);
    });
  }

  function edit(p) {
    editing = p.id;
    ["title", "desc", "cat", "price", "link"].forEach(k => $("#" + k).value = p[k] || "");
    $("#imgurl").value = p.image || ""; imgData = null; $("#file").value = "";
    showPreview(p.image);
    $("#formTitle").textContent = "Edit product"; $("#cancel").hidden = false;
    scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() {
    editing = null; imgData = null; $("#pform").reset(); showPreview("");
    $("#formTitle").textContent = "Add product"; $("#cancel").hidden = true;
  }
  function showPreview(src) { const i = $("#preview"); i.src = src || ""; i.style.display = src ? "block" : "none"; }

  async function remove(p) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try { products = products.filter(x => x.id !== p.id); await saveAll("Delete product"); render(); }
    catch (err) { alert(err.message); await load(); }
  }

  // Resize image in the browser so uploads stay small
  $("#file").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", 0.82);
      imgData = url.split(",")[1]; showPreview(url);
    };
    img.src = URL.createObjectURL(f);
  });

  $("#pform").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("#msg"), btn = $("#saveBtn");
    btn.disabled = true; msg.textContent = "Saving...";
    try {
      const old = products.find(p => p.id === editing);
      let image = $("#imgurl").value.trim();
      if (imgData) image = await uploadImage();
      const p = {
        id: editing || Date.now().toString(36),
        title: $("#title").value.trim(), desc: $("#desc").value.trim(),
        cat: $("#cat").value.trim() || "Other", price: $("#price").value.trim(),
        link: $("#link").value.trim(), image
      };
      if (old) products[products.indexOf(old)] = p; else products.unshift(p);
      await saveAll(old ? "Update product" : "Add product");
      msg.textContent = "Saved. It will appear on your site in 1 to 2 minutes.";
      reset(); render();
    } catch (err) { msg.textContent = err.message; await load(); }
    btn.disabled = false;
  });
  $("#cancel").onclick = reset;

  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const m = $("#loginMsg"); m.textContent = "Checking...";
    try { await start({ owner: $("#owner").value.trim(), repo: $("#repo").value.trim(), token: $("#token").value.trim() }); m.textContent = ""; }
    catch (err) { m.textContent = err.message; }
  });
  $("#logout").onclick = () => { sessionStorage.removeItem("cfg"); location.reload(); };

  try { const s = sessionStorage.getItem("cfg"); if (s) start(JSON.parse(s)).catch(() => sessionStorage.removeItem("cfg")); } catch (e) {}
})();
