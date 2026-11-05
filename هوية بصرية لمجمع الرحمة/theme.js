(function () {
  const KEY = "rahma-theme";
  const D = {
    FFFFFF:"#102739",F5F8F8:"#0B1E2E",EEF2F3:"#16324A",F0F3F4:"#16324A",F0F4F4:"#16324A",E3EBEC:"#1F3A52",D5E0E1:"#2A4762",DCE7E8:"#24425C",
    B0F2328:"#1C9DA4",
    "0F2328":"#E8F1F3","4F6368":"#B4C4CA","6B7F84":"#9DB0B8","8A9A9E":"#8399A3",B8C4C6:"#4C6475",B7C4C7:"#4C6475",
    "0F7A82":"#1C9DA4","0C5F67":"#7FD3D6",EAF6F6:"#0F3A44",D2ECEC:"#145059",A6D8DA:"#2C6E76",C9E4E5:"#1E5560","1A8A91":"#3BB5BB",E6F1F1:"#12333F",
    "157A50":"#4CD49A",E6F6EE:"#0F3A2E","1FA971":"#2BC28E",
    "2F6FDB":"#6A9BF0",EAF1FD:"#13294A","2459B8":"#8AB0F5","1F56B5":"#8AB0F5","1C468F":"#A5C2F7",F5F9FF:"#112440",E7EDF3:"#182E46",
    "8A520B":"#F2B866",FDF3E2:"#3A2A12",B86E0A:"#E9A23B",C9861F:"#E2A447",FEF6E4:"#33270F",FFFBF3:"#2C2312",
    E5484D:"#F06A6E",B4262B:"#FF8A8D",FDECEC:"#3D1A1D",F6C9CA:"#5A2328",C2373B:"#F07A7D",FFF7F7:"#2E1719",F3C7C8:"#5A2328",
    "7C4DDB":"#A585F0",F1ECFC:"#271D45","45238F":"#C4AEF7",
    EF7A2E:"#F59A5B",FDEFE5:"#3B2314",C25A14:"#F5A36B",
    "102C44":"#16324A",T102C44:"#9FB4C6",T0A3A40:"#BFE3E5",T062528:"#E8F1F3",C6D3DF:"#C6D3DF",F4FAFA:"#103440",E8EEEF:"#1F3A52",BFE6D1:"#1E5A44",F2FBF6:"#0F3A2E",F6DDB0:"#5A4320",FFF6F6:"#2E1719",B97D10:"#E9A23B",F3F6F6:"#13293C",F5C3A0:"#5A3520",DCE4E5:"#24425C",FBFCFC:"#0E2234",F3D199:"#5A4320",FFFBF5:"#2C2312",FEF8EC:"#2C2312",FEF3F3:"#2E1719",F4F8FD:"#112440",FAFBFB:"#0E2234",C6EBD7:"#1E5A44",EEF3F3:"#0B1E2E",M163F66:"#E6F0F2",M17A07A:"#2BC28E",B163F66:"#E6F0F2"
  };
  const css = ":root[data-theme=dark]{color-scheme:dark;" + Object.entries(D).map(([k,v]) => "--k" + k + ":" + v).join(";") + "}";
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const apply = t => { document.documentElement.dataset.theme = t; document.querySelectorAll("theme-toggle").forEach(el => el.render && el.render()); };
  apply(get() || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  window.rahmaTheme = { get: () => document.documentElement.dataset.theme, set: t => { try { localStorage.setItem(KEY, t); } catch (e) {} apply(t); }, toggle: () => window.rahmaTheme.set(window.rahmaTheme.get() === "dark" ? "light" : "dark") };
  addEventListener("storage", e => { if (e.key === KEY && e.newValue) apply(e.newValue); });
  const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  const MOON = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
  class T extends HTMLElement {
    connectedCallback() { if (!this.shadowRoot) this.attachShadow({ mode: "open" }); this.style.display = "inline-flex"; this.render(); this.onclick = () => window.rahmaTheme.toggle(); }
    render() {
      const dark = window.rahmaTheme.get() === "dark", lbl = this.hasAttribute("label");
      if (!this.shadowRoot) return; this.shadowRoot.innerHTML = '<button type="button" title="' + (dark ? "الوضع الفاتح" : "الوضع الداكن") + '" style="display:flex;align-items:center;gap:8px;height:40px;padding:0 ' + (lbl ? "14px" : "0") + ';' + (lbl ? "" : "width:40px;justify-content:center;") + 'white-space:nowrap;border-radius:999px;border:1px solid var(--kE3EBEC,#E3EBEC);background:var(--kFFFFFF,#fff);color:var(--k4F6368,#4F6368);font:600 13px \'Readex Pro\',sans-serif;cursor:pointer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (dark ? SUN : MOON) + '</svg>' + (lbl ? (dark ? "الوضع الفاتح" : "الوضع الداكن") : "") + '</button>';
    }
  }
  if (!customElements.get("theme-toggle")) customElements.define("theme-toggle", T);
})();
