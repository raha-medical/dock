// <lc-icon name="stethoscope" size="20" stroke="1.75"> — renders Lucide icons (same names as lucide-react, kebab-case).
(function () {
  if (customElements.get('lc-icon')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const pascal = n => n.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  const ALIAS = { 'chart-column': ['BarChart3', 'ChartColumn'], 'house': ['Home', 'House'], 'circle-check': ['CheckCircle2', 'CircleCheck'], 'circle-x': ['XCircle', 'CircleX'], 'triangle-alert': ['AlertTriangle', 'TriangleAlert'], 'circle-alert': ['AlertCircle', 'CircleAlert'], 'hand-coins': ['HandCoins'], 'file-heart': ['FileHeart'], 'user-round': ['UserRound', 'User'], 'users-round': ['UsersRound', 'Users'], 'chart-line': ['LineChart', 'ChartLine'], 'square-pen': ['PenSquare', 'SquarePen'] };
  function findNode(L, name) {
    const tries = [pascal(name)].concat(ALIAS[name] || []);
    for (const k of tries) if (L.icons[k]) return L.icons[k];
    return null;
  }
  function kids(node) {
    if (Array.isArray(node) && node[0] === 'svg') return node[2] || [];
    return node;
  }
  class LcIcon extends HTMLElement {
    static get observedAttributes() { return ['name', 'size', 'color', 'stroke']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      const size = this.getAttribute('size') || '20';
      Object.assign(this.style, { display: 'inline-flex', flexShrink: '0', width: size + 'px', height: size + 'px', alignItems: 'center', justifyContent: 'center' });
      const L = window.lucide;
      if (!L || !L.icons) return;
      const name = this.getAttribute('name') || 'circle';
      let node = findNode(L, name);
      if (!node) { console.warn('[lc-icon] missing icon:', name); node = findNode(L, 'circle-help') || findNode(L, 'circle'); }
      const svg = document.createElementNS(NS, 'svg');
      const a = { xmlns: NS, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: this.getAttribute('color') || 'currentColor', 'stroke-width': this.getAttribute('stroke') || '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      for (const k in a) svg.setAttribute(k, a[k]);
      for (const [tag, attrs] of kids(node)) {
        const el = document.createElementNS(NS, tag);
        for (const k in attrs) if (k !== 'key') el.setAttribute(k, attrs[k]);
        svg.appendChild(el);
      }
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      svg.style.display = 'block';
      root.replaceChildren(svg);
    }
  }
  customElements.define('lc-icon', LcIcon);
  if (!window.lucide && !document.getElementById('lucide-umd')) {
    const s = document.createElement('script');
    s.id = 'lucide-umd';
    s.src = 'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js';
    s.onload = () => document.querySelectorAll('lc-icon').forEach(e => e.render());
    document.head.appendChild(s);
  }
})();
