/**
 * 🦔 Hedgehog Humidity Card
 * Compact pill card showing humidity range across multiple sensors.
 * Click pill → sensor overview popup
 * Click sensor pill → time-range graph popup (1h/3h/6h/12h/24h)
 * GitHub: https://github.com/jamesmcginnis/hedgehog-humidity-card
 */

// ─── Editor: Colour field definitions ────────────────────────────────────────
const HEDGEHOG_COLOUR_FIELDS = [
  { key: 'pill_bg',      label: 'Pill Background',  desc: 'Background colour of the main pill card.',                      default: '#1c1c1e' },
  { key: 'text_color',   label: 'Text',              desc: 'Primary text colour for humidity values and labels.',           default: '#ffffff' },
  { key: 'accent_color', label: 'Accent / In-range', desc: 'Graph line colour for readings within the normal range, and accent highlights.', default: '#32ADE6' },
  { key: 'low_color',    label: 'Low humidity',      desc: 'Graph line colour for readings below the minimum threshold.',  default: '#FF9F0A' },
  { key: 'high_color',   label: 'High humidity',     desc: 'Graph line colour for readings above the maximum threshold.',  default: '#30D158' },
  { key: 'popup_bg',     label: 'Popup Background',  desc: 'Background colour of all popup dialogs.',                     default: '#1c1c1e' },
  { key: 'icon_color',   label: 'Humidity Icon',     desc: 'Colour of the droplet icon on the pill card.',                default: '#32ADE6' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Main Card
// ─────────────────────────────────────────────────────────────────────────────
class HedgehogHumidityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._popupOverlay = null;
    this._graphPopup   = null;
    this._graphHours   = 24;
  }

  static getConfigElement() {
    return document.createElement('hedgehog-humidity-card-editor');
  }

  static getStubConfig() {
    return {
      type:            'custom:hedgehog-humidity-card',
      entities:        [],
      title:           '',
      decimals:        1,
      accent_color:    '#32ADE6',
      low_color:       '#FF9F0A',
      high_color:      '#30D158',
      low_threshold:   null,
      high_threshold:  null,
      pill_bg:         '#1c1c1e',
      text_color:      '#ffffff',
      popup_bg:        '#1c1c1e',
      icon_color:      '#32ADE6',
    };
  }

  setConfig(config) {
    this._config = {
      title:           '',
      decimals:        1,
      accent_color:    '#32ADE6',
      low_color:       '#FF9F0A',
      high_color:      '#30D158',
      low_threshold:   null,
      high_threshold:  null,
      pill_bg:         '#1c1c1e',
      text_color:      '#ffffff',
      popup_bg:        '#1c1c1e',
      icon_color:      '#32ADE6',
      ...config
    };
    if (this.shadowRoot.innerHTML) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) this._render();
    else this._update();
  }

  connectedCallback() {}
  disconnectedCallback() {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  _entities() {
    return (this._config.entities || []).filter(e => e && this._hass?.states[e]);
  }

  _humidVal(entityId) {
    const s = this._hass?.states[entityId];
    if (!s) return null;
    const v = parseFloat(s.state);
    return isNaN(v) ? null : v;
  }

  _fmt(val) {
    if (val === null || val === undefined) return '—';
    const dec = parseInt(this._config.decimals ?? 1);
    return parseFloat(val).toFixed(isNaN(dec) ? 1 : dec);
  }

  _unit(entityId) {
    return this._hass?.states[entityId]?.attributes?.unit_of_measurement || '%';
  }

  _name(entityId) {
    const fn = this._config.friendly_names?.[entityId];
    if (fn) return fn;
    const s = this._hass?.states[entityId];
    if (!s) return entityId;
    return s.attributes?.friendly_name || entityId.split('.').pop().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  _hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '50,173,230';
  }

  // ── Threshold helpers ─────────────────────────────────────────────────────
  _lo() { const v = parseFloat(this._config.low_threshold);  return isNaN(v) ? null : v; }
  _hi() { const v = parseFloat(this._config.high_threshold); return isNaN(v) ? null : v; }

  _graphColor(val) {
    const lo = this._lo(), hi = this._hi();
    const accent = this._config.accent_color || '#32ADE6';
    if (lo !== null && val < lo) return this._config.low_color  || '#FF9F0A';
    if (hi !== null && val > hi) return this._config.high_color || '#30D158';
    return accent;
  }

  // ── Render main pill card ─────────────────────────────────────────────────

  _render() {
    const cfg = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: inherit; }
        ha-card {
          height: 56px;
          border-radius: 28px;
          background: ${cfg.pill_bg || '#1c1c1e'};
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0 18px;
          gap: 12px;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          transition: transform 0.15s ease;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 2px 12px rgba(0,0,0,0.35);
        }
        ha-card:active { transform: scale(0.97); }
        .icon-wrap {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(${this._hexToRgb(cfg.icon_color || '#32ADE6')}, 0.15);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .icon-wrap svg { display: block; }
        .content { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .label { font-size: 13px; color: ${cfg.text_color || '#fff'}; opacity: 0.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
        .range { font-size: 14px; color: ${cfg.text_color || '#fff'}; white-space: nowrap; letter-spacing: -0.3px; }
        .no-entities { font-size: 12px; color: rgba(255,255,255,0.35); }
      </style>
      <ha-card id="mainCard">
        <div class="icon-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${cfg.icon_color || '#32ADE6'}">
            <path d="M12 2C9.5 7 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-3.5-7-6-12zm0 16a4 4 0 0 1-4-4c0-1.5 1-3.5 2.5-5.5C11.5 10 12.5 11.5 13 13c.5 1 .8 2 .8 3A3.8 3.8 0 0 1 12 18z"/>
          </svg>
        </div>
        <div class="content" id="content">
          <span class="no-entities">Select entities in editor</span>
        </div>
      </ha-card>`;

    this.shadowRoot.getElementById('mainCard').addEventListener('click', () => this._openOverviewPopup());
    this._update();
  }

  _update() {
    const content = this.shadowRoot.getElementById('content');
    if (!content) return;

    const entities = this._entities();
    const cfg      = this._config;

    if (!entities.length) {
      content.innerHTML = `<span class="no-entities">Select entities in editor</span>`;
      return;
    }

    const vals  = entities.map(e => this._humidVal(e)).filter(v => v !== null);
    const unit  = entities.length ? this._unit(entities[0]) : '%';
    const label = (cfg.title || '').trim();

    if (!vals.length) {
      content.innerHTML = `<span style="font-size:13px;color:${cfg.text_color||'#fff'};opacity:0.55;">${label}</span><span style="font-size:14px;color:${cfg.text_color||'#fff'};">—</span>`;
      return;
    }

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const rangeText = vals.length === 1
      ? `${this._fmt(vals[0])}${unit}`
      : `${this._fmt(min)}–${this._fmt(max)}${unit}`;

    content.innerHTML = label
      ? `<span class="label">${label}</span><span class="range">${rangeText}</span>`
      : `<span class="range">${rangeText}</span>`;
  }

  // ── Overview Popup ────────────────────────────────────────────────────────

  _openOverviewPopup() {
    if (this._popupOverlay) return;
    const entities = this._entities();
    const cfg      = this._config;
    if (!entities.length) return;

    const popupBg = cfg.popup_bg     || '#1c1c1e';
    const accent  = cfg.accent_color || '#32ADE6';
    const textCol = cfg.text_color   || '#ffffff';

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes hedgehogFadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes hedgehogSlideUp { from{transform:translateY(24px) scale(0.97);opacity:0} to{transform:none;opacity:1} }
      .hedgehog-popup  { animation: hedgehogSlideUp 0.28s cubic-bezier(0.34,1.28,0.64,1); }
      #hedgehog-overlay { animation: hedgehogFadeIn 0.2s ease; }
      .hedgehog-sensor-pill {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 14px 10px; border-radius: 20px; cursor: pointer;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
        transition: transform 0.15s ease, background 0.15s ease;
        min-width: 0; flex: 1; gap: 5px;
        font-family: var(--primary-font-family, inherit);
      }
      .hedgehog-sensor-pill:active { transform: scale(0.95); background: rgba(255,255,255,0.12); }
      .hedgehog-sensor-pill:hover  { background: rgba(255,255,255,0.1); }
      .hedgehog-pill-humid { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }
      .hedgehog-pill-name  { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.45); text-align: center; letter-spacing: 0.02em; line-height: 1.3; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .hedgehog-pill-icon  { font-size: 16px; line-height: 1; }
      .hedgehog-close-btn:hover { background:rgba(255,255,255,0.22)!important; }
    `;

    const popup = document.createElement('div');
    popup.className = 'hedgehog-popup';
    popup.style.cssText = `background:${popupBg};backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);border:1px solid rgba(255,255,255,0.13);border-radius:28px;box-shadow:0 28px 72px rgba(0,0,0,0.65);padding:20px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;color:${textCol};font-family:${this._haFont()};`;
    popup.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });

    // Header
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;';
    headerRow.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${accent}22;display:flex;align-items:center;justify-content:center;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${accent}"><path d="M12 2C9.5 7 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-3.5-7-6-12zm0 16a4 4 0 0 1-4-4c0-1.5 1-3.5 2.5-5.5C11.5 10 12.5 11.5 13 13c.5 1 .8 2 .8 3A3.8 3.8 0 0 1 12 18z"/></svg>
        </div>
        <span style="font-size:15px;font-weight:700;color:${textCol};">${cfg.title || 'Humidity'}</span>
      </div>
      <button class="hedgehog-close-btn" style="background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.65);font-size:16px;line-height:1;padding:0;transition:background 0.15s;flex-shrink:0;">✕</button>`;
    headerRow.querySelector('.hedgehog-close-btn').addEventListener('click', () => this._closeOverviewPopup());

    // Stats bar
    const vals   = entities.map(e => this._humidVal(e)).filter(v => v !== null);
    const unit   = this._unit(entities[0]);
    const minVal = vals.length ? Math.min(...vals) : null;
    const maxVal = vals.length ? Math.max(...vals) : null;
    const lo = this._lo(), hi = this._hi();
    const inRangeEntities = (lo !== null && hi !== null)
      ? entities.filter(e => { const v = this._humidVal(e); return v !== null && v >= lo && v <= hi; })
      : [];
    const inRangeVal = (lo !== null && hi !== null) ? inRangeEntities.length : null;

    // Stats bar — clicking highlights the matching sensor pill(s) in place
    const statsRow = document.createElement('div');
    statsRow.style.cssText = 'display:flex;gap:8px;margin-bottom:18px;';

    // Sensor pills label and grid declared here so functions below can reference them
    const pillsLabel = document.createElement('div');
    pillsLabel.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:10px;';
    pillsLabel.textContent = `${entities.length} Sensor${entities.length !== 1 ? 's' : ''}`;

    const pillsGrid = document.createElement('div');
    pillsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;';

    const allVals = entities.map(e => this._humidVal(e)).filter(v => v !== null);

    let activeSort = null;

    // Build the entity → pill map so we can highlight by entity id
    const pillMap = new Map();
    entities.forEach(entityId => {
      const val   = this._humidVal(entityId);
      const name  = this._name(entityId);
      const unit2 = this._unit(entityId);
      const pill  = document.createElement('div');
      pill.className = 'hedgehog-sensor-pill';
      const humidColor = this._humidColor(val, allVals, accent);
      pill.innerHTML = `
        <div class="hedgehog-pill-icon">💧</div>
        <div class="hedgehog-pill-humid" style="color:${humidColor}">${val !== null ? this._fmt(val)+unit2 : '—'}</div>
        <div class="hedgehog-pill-name">${name}</div>`;
      pill.addEventListener('click', ev => { ev.stopPropagation(); this._openGraphPopup(entityId); });
      pillsGrid.appendChild(pill);
      pillMap.set(entityId, pill);
    });

    const highlightPills = (targetIds) => {
      pillMap.forEach((pill, entityId) => {
        const isHighlighted = targetIds.includes(entityId);
        const isDimmed = targetIds.length > 0 && !isHighlighted;
        pill.style.outline       = isHighlighted ? `2px solid ${accent}` : '';
        pill.style.opacity       = isDimmed ? '0.35' : '1';
        pill.style.outlineOffset = isHighlighted ? '-2px' : '';
      });
    };

    const getTargetEntities = (mode) => {
      if (!mode) return [];
      const withVals = entities.map(e => ({ e, v: this._humidVal(e) })).filter(x => x.v !== null);
      if (mode === 'low')   { const min = Math.min(...withVals.map(x => x.v)); return withVals.filter(x => x.v === min).map(x => x.e); }
      if (mode === 'high')  { const max = Math.max(...withVals.map(x => x.v)); return withVals.filter(x => x.v === max).map(x => x.e); }
      if (mode === 'range') return inRangeEntities;
      return [];
    };

    const makeStatPill = (label, displayVal, mode, clickable = true) => {
      const el = document.createElement('div');
      el.style.cssText = `flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px 8px;text-align:center;${clickable ? 'cursor:pointer;' : ''}transition:background 0.15s ease,border-color 0.15s ease;`;
      el.innerHTML = `
        <div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">${label}</div>
        <div style="font-size:17px;font-weight:700;letter-spacing:-0.3px;color:${textCol};">${displayVal}</div>`;
      if (clickable) {
        el.addEventListener('mouseenter', () => { if (activeSort !== mode) el.style.background = 'rgba(255,255,255,0.1)'; });
        el.addEventListener('mouseleave', () => { if (activeSort !== mode) el.style.background = 'rgba(255,255,255,0.06)'; });
        el.addEventListener('click', ev => {
          ev.stopPropagation();
          const newMode = activeSort === mode ? null : mode;
          activeSort = newMode;
          statsRow.querySelectorAll('.hedgehog-stat-pill').forEach(p => {
            const isActive = p.dataset.mode === activeSort;
            p.style.background  = isActive ? `${accent}33` : 'rgba(255,255,255,0.06)';
            p.style.borderColor = isActive ? accent         : 'rgba(255,255,255,0.08)';
          });
          highlightPills(getTargetEntities(activeSort));
        });
        el.classList.add('hedgehog-stat-pill');
        el.dataset.mode = mode;
      }
      return el;
    };

    const inRangeClickable = inRangeVal !== null;
    const inRangeDisplay   = inRangeVal !== null ? `${inRangeVal} / ${entities.length}` : '—';
    statsRow.appendChild(makeStatPill('Low',      minVal !== null ? this._fmt(minVal)+unit : '—', 'low'));
    statsRow.appendChild(makeStatPill('In Range', inRangeDisplay, 'range', inRangeClickable));
    statsRow.appendChild(makeStatPill('High',     maxVal !== null ? this._fmt(maxVal)+unit : '—', 'high'));

    popup.appendChild(style);
    popup.appendChild(headerRow);
    popup.appendChild(statsRow);
    popup.appendChild(pillsLabel);
    popup.appendChild(pillsGrid);

    overlay.id = 'hedgehog-overlay';
    overlay.appendChild(popup);
    overlay.addEventListener('click', e => { if (e.target === overlay) this._closeOverviewPopup(); });
    document.body.appendChild(overlay);
    this._popupOverlay = overlay;
  }

  _closeOverviewPopup() {
    if (!this._popupOverlay) return;
    this._popupOverlay.style.transition = 'opacity 0.18s ease';
    this._popupOverlay.style.opacity = '0';
    setTimeout(() => {
      if (this._popupOverlay?.parentNode) this._popupOverlay.parentNode.removeChild(this._popupOverlay);
      this._popupOverlay = null;
    }, 180);
  }

  // ── Comfort level helper ──────────────────────────────────────────────────
  _comfortMessage(val) {
    if (val === null) return null;

    // Use user-configured thresholds if set
    const lo = this._lo(), hi = this._hi();
    if (lo !== null && hi !== null) {
      if (val < lo) return { emoji: '🏜️', text: 'Too dry — consider a humidifier',  color: '#FF9F0A' };
      if (val > hi) return { emoji: '💦', text: 'Too humid — consider a dehumidifier', color: '#30D158' };
      return              { emoji: '😊', text: 'Humidity is just right',              color: '#32ADE6' };
    }

    // Fallback: standard indoor comfort bands (% RH)
    if (val < 20)       return { emoji: '🏜️', text: 'Very dry — skin and airways may suffer', color: '#FF6B35' };
    if (val < 30)       return { emoji: '🌵', text: 'Quite dry — a humidifier may help',      color: '#FF9F0A' };
    if (val < 40)       return { emoji: '😌', text: 'Slightly dry but comfortable',            color: '#FFD60A' };
    if (val <= 60)      return { emoji: '😊', text: 'Ideal humidity — very comfortable',       color: '#32ADE6' };
    if (val <= 70)      return { emoji: '🌫️', text: 'Getting humid — feeling a bit muggy',     color: '#30D158' };
    if (val <= 80)      return { emoji: '💦', text: 'Quite humid — mould risk increases',      color: '#34C759' };
    return              { emoji: '🌧️', text: 'Very humid — consider a dehumidifier',           color: '#5E5CE6' };
  }

  _humidColor(val, allVals, accent) {
    if (val === null || !allVals.length) return accent;
    const min = Math.min(...allVals), max = Math.max(...allVals);
    if (min === max) return accent;
    const t = (val - min) / (max - min);
    if (t < 0.33) return '#FF9F0A';
    if (t < 0.66) return accent;
    return '#30D158';
  }

  // ── Graph Popup ───────────────────────────────────────────────────────────

  async _openGraphPopup(entityId) {
    if (this._graphPopup) {
      if (this._graphPopup.parentNode) this._graphPopup.parentNode.removeChild(this._graphPopup);
      this._graphPopup = null;
    }

    const cfg     = this._config;
    const popupBg = cfg.popup_bg     || '#1c1c1e';
    const accent  = cfg.accent_color || '#32ADE6';
    const textCol = cfg.text_color   || '#ffffff';
    const name    = this._name(entityId);
    const val     = this._humidVal(entityId);
    const unit    = this._unit(entityId);
    const stateObj= this._hass?.states[entityId];
    const attrs   = stateObj?.attributes || {};

    this._graphHours = 24;

    const graphOverlay = document.createElement('div');
    graphOverlay.style.cssText = `position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);`;

    const closeGraph = () => {
      graphOverlay.style.transition = 'opacity 0.15s ease';
      graphOverlay.style.opacity = '0';
      setTimeout(() => { if (graphOverlay.parentNode) graphOverlay.parentNode.removeChild(graphOverlay); this._graphPopup = null; }, 150);
    };

    const style = document.createElement('style');
    style.textContent = `
      @keyframes hedgehogGraphUp { from{transform:translateY(20px) scale(0.97);opacity:0} to{transform:none;opacity:1} }
      .hedgehog-graph-popup { animation: hedgehogGraphUp 0.26s cubic-bezier(0.34,1.28,0.64,1); }
      .hedgehog-close-btn:hover { background:rgba(255,255,255,0.22)!important; }
      .hedgehog-info-row { display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.07); }
      .hedgehog-info-row:last-child { border-bottom:none; }
      .hedgehog-info-label { font-size:12px;color:rgba(255,255,255,0.45);font-weight:500; }
      .hedgehog-info-value { font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);text-align:right; }
      .hedgehog-seg-btn { flex:1;text-align:center;padding:7px 4px;font-size:12px;font-weight:600;border-radius:7px;cursor:pointer;color:rgba(255,255,255,0.55);border:none;background:none;transition:all 0.2s;font-family:inherit;touch-action:manipulation; }
      .hedgehog-seg-btn.active { background:${accent};color:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.35); }
    `;

    const popup = document.createElement('div');
    popup.className = 'hedgehog-graph-popup';
    popup.style.cssText = `background:${popupBg};backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);border:1px solid rgba(255,255,255,0.13);border-radius:26px;box-shadow:0 28px 72px rgba(0,0,0,0.65);padding:20px;width:100%;max-width:400px;max-height:85vh;overflow-y:auto;color:${textCol};font-family:${this._haFont()};`;
    popup.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });

    // Header
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
    headerRow.innerHTML = `
      <span style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.4);">${name}</span>
      <button class="hedgehog-close-btn" style="background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.65);font-size:16px;line-height:1;padding:0;transition:background 0.15s;flex-shrink:0;">✕</button>`;
    headerRow.querySelector('.hedgehog-close-btn').addEventListener('click', closeGraph);

    // Current reading — colour matches the sensor pill in the overview popup
    const allVals    = this._entities().map(e => this._humidVal(e)).filter(v => v !== null);
    const humidColor = this._humidColor(val, allVals, accent);
    const readingRow = document.createElement('div');
    readingRow.style.cssText = 'display:flex;align-items:baseline;gap:6px;margin-bottom:14px;';
    readingRow.innerHTML = `
      <span style="font-size:52px;font-weight:700;letter-spacing:-2px;color:${humidColor};line-height:1;">${val !== null ? this._fmt(val) : '—'}</span>
      <span style="font-size:16px;color:rgba(255,255,255,0.4);font-weight:500;padding-bottom:6px;">${unit}</span>`;

    // Comfort message banner
    const comfort = this._comfortMessage(val);
    const comfortBanner = document.createElement('div');
    if (comfort) {
      comfortBanner.style.cssText = `display:flex;align-items:center;gap:9px;background:${comfort.color}18;border:1px solid ${comfort.color}40;border-radius:12px;padding:9px 13px;margin-bottom:12px;`;
      comfortBanner.innerHTML = `
        <span style="font-size:20px;line-height:1;">${comfort.emoji}</span>
        <span style="font-size:13px;font-weight:600;color:${comfort.color};">${comfort.text}</span>`;
    }

    // Time-range segmented control
    const segWrap = document.createElement('div');
    segWrap.style.cssText = 'display:flex;background:rgba(118,118,128,0.2);border-radius:10px;padding:3px;gap:2px;margin-bottom:12px;';
    [1, 3, 6, 12, 24].forEach(h => {
      const btn = document.createElement('button');
      btn.className = 'hedgehog-seg-btn' + (h === this._graphHours ? ' active' : '');
      btn.textContent = `${h}h`;
      btn.dataset.hours = h;
      const switchHours = e => {
        if (e.type === 'touchend') e.preventDefault();
        this._graphHours = h;
        segWrap.querySelectorAll('.hedgehog-seg-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.hours) === h));
        graphWrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.25);font-size:12px;">Loading…</div>`;
        this._loadHumidGraph(entityId, graphWrap, accent, h);
      };
      btn.addEventListener('click', switchHours);
      btn.addEventListener('touchend', switchHours);
      segWrap.appendChild(btn);
    });

    // Graph container
    const graphWrap = document.createElement('div');
    graphWrap.style.cssText = 'height:150px;margin-bottom:16px;position:relative;border-radius:14px;overflow:hidden;background:rgba(255,255,255,0.03);padding:4px;';
    graphWrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.25);font-size:12px;">Loading…</div>`;

    // Info rows
    const infoWrap = document.createElement('div');
    const lastChanged = stateObj?.last_changed || stateObj?.last_updated;
    let timeAgo = '—';
    if (lastChanged) {
      const mins = Math.floor((Date.now() - new Date(lastChanged).getTime()) / 60000);
      timeAgo = mins < 1 ? 'Just now' : mins < 60 ? `${mins} min ago` : `${Math.floor(mins/60)}h ago`;
    }
    const infoRows = [{ label: 'Last updated', value: timeAgo }];
    if (attrs.min           !== undefined) infoRows.push({ label: 'Min (attr)',   value: `${attrs.min}${unit}` });
    if (attrs.max           !== undefined) infoRows.push({ label: 'Max (attr)',   value: `${attrs.max}${unit}` });
    if (attrs.battery_level !== undefined) infoRows.push({ label: 'Battery',      value: `${attrs.battery_level}%` });
    if (attrs.device_class) infoRows.push({
      label: 'Device class',
      value: String(attrs.device_class).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    });

    infoRows.forEach(({ label, value }) => {
      const row = document.createElement('div');
      row.className = 'hedgehog-info-row';
      row.innerHTML = `<span class="hedgehog-info-label">${label}</span><span class="hedgehog-info-value">${value}</span>`;
      infoWrap.appendChild(row);
    });

    popup.appendChild(style);
    popup.appendChild(headerRow);
    popup.appendChild(readingRow);
    if (comfort) popup.appendChild(comfortBanner);
    popup.appendChild(segWrap);
    popup.appendChild(graphWrap);
    popup.appendChild(infoWrap);

    graphOverlay.appendChild(popup);
    graphOverlay.addEventListener('click', e => { if (e.target === graphOverlay) closeGraph(); });
    document.body.appendChild(graphOverlay);
    this._graphPopup = graphOverlay;

    this._loadHumidGraph(entityId, graphWrap, accent, this._graphHours);
  }

  async _loadHumidGraph(entityId, container, accent, hours) {
    try {
      const end   = new Date();
      const start = new Date(end - hours * 3600000);
      const resp  = await this._hass.callApi('GET',
        `history/period/${start.toISOString()}?filter_entity_id=${entityId}&end_time=${end.toISOString()}&minimal_response=true&no_attributes=true`
      );
      const raw   = resp?.[0] || [];
      const valid = raw.filter(s => !isNaN(parseFloat(s.state)));

      if (valid.length < 2) {
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.25);font-size:12px;">Not enough history</div>`;
        return;
      }

      const values     = valid.map(s => parseFloat(s.state));
      const timestamps = valid.map(s => s.last_changed || s.last_updated);
      container.innerHTML = this._buildHumidGraph(values, timestamps, accent);
      const svg = container.querySelector('svg');
      if (svg) this._attachHumidCrosshair(svg, values, timestamps, this._unit(entityId));
    } catch(e) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.25);font-size:12px;">Could not load history</div>`;
    }
  }

  _attachHumidCrosshair(svg, values, times, unit) {
    const W     = 380, H = 140;
    const pad   = { top: 12, right: 10, bottom: 22, left: 34 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top  - pad.bottom;

    let crosshairGroup = null;
    let isDragging     = false;

    const fmtTime = ts => {
      if (!ts) return '';
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    };

    const clientXtoSvgX = clientX => {
      const rect   = svg.getBoundingClientRect();
      const scaleX = W / rect.width;
      return (clientX - rect.left) * scaleX;
    };

    const showCrosshair = svgX => {
      const cx       = Math.max(pad.left, Math.min(W - pad.right, svgX));
      const xRatio   = (cx - pad.left) / plotW;
      const exactIdx = xRatio * (values.length - 1);
      const lIdx     = Math.floor(exactIdx);
      const rIdx     = Math.min(lIdx + 1, values.length - 1);
      const frac     = exactIdx - lIdx;
      const val      = values[lIdx] + (values[rIdx] - values[lIdx]) * frac;
      const dec      = parseInt(this._config.decimals ?? 1);
      const label    = val.toFixed(isNaN(dec) ? 1 : dec) + (unit || '%');
      const color    = this._graphColor(val);

      const snapIdx = frac < 0.5 ? lIdx : rIdx;
      const timeStr = times ? fmtTime(times[snapIdx]) : '';
      const hasTime = timeStr.length > 0;

      if (crosshairGroup) crosshairGroup.remove();
      crosshairGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      // Dotted vertical line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', cx.toFixed(1));
      line.setAttribute('y1', pad.top.toString());
      line.setAttribute('x2', cx.toFixed(1));
      line.setAttribute('y2', (pad.top + plotH).toString());
      line.setAttribute('stroke', 'rgba(255,255,255,0.75)');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '4 3');

      // Pill dimensions
      const lblW = hasTime ? 64 : 54;
      const lblH = hasTime ? 44 : 26;
      const lblX = Math.max(pad.left + lblW / 2, Math.min(W - pad.right - lblW / 2, cx));
      const lblY = pad.top + 1;

      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x',            (lblX - lblW / 2).toFixed(1));
      bgRect.setAttribute('y',            lblY.toFixed(1));
      bgRect.setAttribute('width',        lblW.toString());
      bgRect.setAttribute('height',       lblH.toString());
      bgRect.setAttribute('rx',           '6');
      bgRect.setAttribute('fill',         'rgba(0,0,0,0.80)');
      bgRect.setAttribute('stroke',       color);
      bgRect.setAttribute('stroke-width', '1.5');

      const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valText.setAttribute('x',           lblX.toFixed(1));
      valText.setAttribute('y',           (lblY + (hasTime ? 16 : 18)).toFixed(1));
      valText.setAttribute('fill',        color);
      valText.setAttribute('font-size',   '17');
      valText.setAttribute('font-weight', '700');
      valText.setAttribute('text-anchor', 'middle');
      valText.setAttribute('font-family', this._haFont());
      valText.textContent = label;

      crosshairGroup.appendChild(line);
      crosshairGroup.appendChild(bgRect);
      crosshairGroup.appendChild(valText);

      if (hasTime) {
        const timeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        timeText.setAttribute('x',           lblX.toFixed(1));
        timeText.setAttribute('y',           (lblY + 36).toFixed(1));
        timeText.setAttribute('fill',        'rgba(255,255,255,0.65)');
        timeText.setAttribute('font-size',   '12');
        timeText.setAttribute('font-weight', '500');
        timeText.setAttribute('text-anchor', 'middle');
        timeText.setAttribute('font-family', this._haFont());
        timeText.textContent = timeStr;
        crosshairGroup.appendChild(timeText);
      }

      svg.appendChild(crosshairGroup);
    };

    const clearCrosshair = () => {
      if (crosshairGroup) { crosshairGroup.remove(); crosshairGroup = null; }
    };

    svg.style.cursor = 'crosshair';

    // ── Touch (iOS/Android) ──
    svg.addEventListener('touchstart', e => {
      e.stopPropagation();
      e.preventDefault();
      const svgX = clientXtoSvgX(e.touches[0].clientX);
      if (svgX < pad.left || svgX > W - pad.right) return;
      isDragging = true;
      showCrosshair(svgX);
    }, { passive: false });

    svg.addEventListener('touchmove', e => {
      if (!isDragging) return;
      e.stopPropagation();
      e.preventDefault();
      const svgX = clientXtoSvgX(e.touches[0].clientX);
      if (svgX >= pad.left && svgX <= W - pad.right) showCrosshair(svgX);
    }, { passive: false });

    svg.addEventListener('touchend', e => {
      e.stopPropagation();
      isDragging = false;
    }, { passive: false });

    svg.addEventListener('touchcancel', () => { isDragging = false; });

    // ── Mouse (desktop) ──
    svg.addEventListener('mousedown', e => {
      e.stopPropagation();
      const svgX = clientXtoSvgX(e.clientX);
      if (svgX < pad.left || svgX > W - pad.right) return;
      isDragging = true;
      showCrosshair(svgX);
    });

    svg.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const svgX = clientXtoSvgX(e.clientX);
      if (svgX >= pad.left && svgX <= W - pad.right) showCrosshair(svgX);
    });

    svg.addEventListener('mouseup', e => {
      e.stopPropagation();
      if (!isDragging) return;
      isDragging = false;
      const svgX = clientXtoSvgX(e.clientX);
      if (svgX < pad.left || svgX > W - pad.right) clearCrosshair();
    });

    svg.addEventListener('mouseleave', () => { isDragging = false; });

    svg.addEventListener('click', e => {
      e.stopPropagation();
      const svgX = clientXtoSvgX(e.clientX);
      if (svgX < pad.left || svgX > W - pad.right) clearCrosshair();
    });
  }

  // Returns the computed font-family from the card element itself.
  // Since this element lives in the real HA DOM (not shadow DOM), its
  // computed font reflects exactly what the active theme applies — no more,
  // no less. This is used to stamp the correct font onto popups which are
  // appended to document.body and would otherwise inherit whatever HA's
  // body styles set.
  _haFont() {
    return getComputedStyle(this).fontFamily || 'inherit';
  }

  _buildHumidGraph(values, timestamps, accent) {
    const W = 380, H = 140;
    const pad = { top: 12, right: 10, bottom: 22, left: 34 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const rawMin = Math.min(...values), rawMax = Math.max(...values);
    const lo     = this._lo(), hi = this._hi();
    const hasThresholds = lo !== null && hi !== null;

    const vpad = Math.max((rawMax - rawMin) * 0.18, 0.5);
    const min  = hasThresholds ? Math.min(rawMin - vpad, lo * 0.9) : rawMin - vpad;
    const max  = hasThresholds ? Math.max(rawMax + vpad, hi * 1.1) : rawMax + vpad;
    const range = max - min;

    const xs = values.map((_, i) => pad.left + (i / (values.length - 1)) * plotW);
    const ys = values.map(v    => pad.top  + plotH - ((v - min) / range) * plotH);

    const clampY = v => Math.max(pad.top, Math.min(pad.top + plotH, pad.top + plotH - ((v - min) / range) * plotH));

    let segments = '';
    for (let i = 1; i < values.length; i++) {
      const mid = (values[i-1] + values[i]) / 2;
      const c   = this._graphColor(mid);
      segments += `<line x1="${xs[i-1].toFixed(1)}" y1="${ys[i-1].toFixed(1)}" x2="${xs[i].toFixed(1)}" y2="${ys[i].toFixed(1)}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`;
    }

    const linePath = xs.map((x, i) => `${i===0?'M':'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const fillPath = linePath + ` L${xs[xs.length-1].toFixed(1)},${(pad.top+plotH).toFixed(1)} L${pad.left},${(pad.top+plotH).toFixed(1)} Z`;

    const steps = 4;
    const dec   = Math.min(parseInt(this._config.decimals ?? 1), 1);
    const svgFont = this._haFont();
    let yLabels = '';
    for (let i = 0; i <= steps; i++) {
      const v = min + (range * i / steps);
      const y = pad.top + plotH - (i / steps) * plotH;
      yLabels += `<text x="${pad.left - 4}" y="${(y + 3).toFixed(1)}" fill="rgba(255,255,255,0.25)" font-size="7.5" text-anchor="end" font-family="${svgFont}">${v.toFixed(dec)}</text>`;
      yLabels += `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${W-pad.right}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    }

    let thresholdLines = '';
    if (hasThresholds) {
      const loY    = clampY(lo), hiY = clampY(hi);
      const lowCol = this._config.low_color  || '#FF9F0A';
      const hiCol  = this._config.high_color || '#30D158';
      const dec2   = parseInt(this._config.decimals ?? 1);
      thresholdLines = `
        <line x1="${pad.left}" y1="${loY.toFixed(1)}" x2="${W-pad.right}" y2="${loY.toFixed(1)}" stroke="${lowCol}" stroke-width="1" stroke-dasharray="4 3" opacity="0.5"/>
        <text x="${pad.left - 3}" y="${(loY + 3).toFixed(1)}" fill="${lowCol}" font-size="7" text-anchor="end" opacity="0.75" font-family="${svgFont}">${lo.toFixed(isNaN(dec2)?1:dec2)}</text>
        <line x1="${pad.left}" y1="${hiY.toFixed(1)}" x2="${W-pad.right}" y2="${hiY.toFixed(1)}" stroke="${hiCol}" stroke-width="1" stroke-dasharray="4 3" opacity="0.5"/>
        <text x="${pad.left - 3}" y="${(hiY + 3).toFixed(1)}" fill="${hiCol}" font-size="7" text-anchor="end" opacity="0.75" font-family="${svgFont}">${hi.toFixed(isNaN(dec2)?1:dec2)}</text>`;
    }

    const fmt = ts => { try { const d = new Date(ts); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; } catch { return ''; } };
    let xLabels = '';
    if (timestamps.length >= 2) {
      xLabels = `
        <text x="${pad.left+2}" y="${H-7}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="start" font-family="${svgFont}">${fmt(timestamps[0])}</text>
        <text x="${(W/2).toFixed(0)}" y="${H-7}" fill="rgba(255,255,255,0.2)" font-size="8" text-anchor="middle" font-family="${svgFont}">${fmt(timestamps[Math.floor(timestamps.length/2)])}</text>
        <text x="${W-pad.right-2}" y="${H-7}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="end" font-family="${svgFont}">${fmt(timestamps[timestamps.length-1])}</text>`;
    }

    const dec2    = parseInt(this._config.decimals ?? 1);
    const lastX   = xs[xs.length-1].toFixed(1);
    const lastY   = ys[ys.length-1].toFixed(1);
    const lastVal = values[values.length-1];
    const lastLbl = lastVal.toFixed(isNaN(dec2) ? 1 : dec2);
    const dotColor = this._graphColor(lastVal);

    let minMaxMarks = '';
    if (!hasThresholds) {
      const minIdx = values.indexOf(rawMin);
      const maxIdx = values.indexOf(rawMax);
      minMaxMarks = `
        <text x="${xs[minIdx].toFixed(1)}" y="${(ys[minIdx]+12).toFixed(1)}" fill="#FF9F0A" font-size="7" text-anchor="middle" font-family="${svgFont}">${rawMin.toFixed(isNaN(dec2)?1:dec2)}</text>
        <text x="${xs[maxIdx].toFixed(1)}" y="${(ys[maxIdx]-5).toFixed(1)}" fill="#30D158" font-size="7" text-anchor="middle" font-family="${svgFont}">${rawMax.toFixed(isNaN(dec2)?1:dec2)}</text>`;
    }

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="overflow:visible;display:block;">
      <defs>
        <linearGradient id="hedgehogGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0.02"/>
        </linearGradient>
        <clipPath id="hedgehogClip"><rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}"/></clipPath>
      </defs>
      ${yLabels}
      ${thresholdLines}
      <path d="${fillPath}" fill="url(#hedgehogGrad)" clip-path="url(#hedgehogClip)"/>
      <g clip-path="url(#hedgehogClip)">${segments}</g>
      <circle cx="${lastX}" cy="${lastY}" r="4.5" fill="${dotColor}" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/>
      <text x="${parseFloat(lastX)+8}" y="${(parseFloat(lastY)+4).toFixed(1)}" fill="${dotColor}" font-size="9" font-weight="700" font-family="${svgFont}">${lastLbl}</text>
      ${minMaxMarks}
      ${xLabels}
    </svg>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Visual Editor
// ─────────────────────────────────────────────────────────────────────────────
class HedgehogHumidityCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config       = {};
    this._hass         = null;
    this._searchTerm   = '';
    this._allEntities  = [];
    this._rendered     = false;
    this._debounceTimers = {};
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config && Object.keys(this._config).length) {
      if (!this._rendered) this._renderEditor();
    }
  }

  setConfig(config) {
    const prev = this._config;
    this._config = { ...config };

    if (!this._rendered) {
      if (this._hass) this._renderEditor();
      return;
    }

    this._syncFieldValues(prev);
  }

  _syncFieldValues(prev) {
    const cfg     = this._config;
    const root    = this.shadowRoot;
    const focused = root.activeElement || document.activeElement;

    const maybeSet = (el, val) => {
      if (!el || el === focused || el.contains(focused)) return;
      el.value = val;
    };

    maybeSet(root.getElementById('title'), cfg.title || '');
    maybeSet(root.getElementById('decimals'), cfg.decimals ?? 1);

    const loEl2 = root.getElementById('low_threshold');
    if (loEl2 && loEl2 !== focused) {
      loEl2.value = (cfg.low_threshold !== null && cfg.low_threshold !== undefined) ? cfg.low_threshold : '';
    }
    const hiEl2 = root.getElementById('high_threshold');
    if (hiEl2 && hiEl2 !== focused) {
      hiEl2.value = (cfg.high_threshold !== null && cfg.high_threshold !== undefined) ? cfg.high_threshold : '';
    }

    HEDGEHOG_COLOUR_FIELDS.forEach(field => {
      const card = root.querySelector(`.colour-card[data-key="${field.key}"]`);
      if (!card) return;
      const val = cfg[field.key] || field.default;
      if (prev[field.key] === val) return;
      const preview = card.querySelector('.colour-swatch-preview');
      const dot     = card.querySelector('.colour-dot');
      const picker  = card.querySelector('input[type=color]');
      const hexIn   = card.querySelector('.colour-hex');
      if (preview) preview.style.background = val;
      if (dot)     dot.style.background     = val;
      if (picker && picker !== focused) picker.value = val;
      if (hexIn  && hexIn  !== focused) hexIn.value  = val;
    });

    if (JSON.stringify(prev.entities) !== JSON.stringify(cfg.entities)) {
      this._syncEntityChecks();
    }
  }

  _syncEntityChecks() {
    const root     = this.shadowRoot;
    const selected = this._config.entities || [];
    const fn       = this._config.friendly_names || {};
    root.querySelectorAll('.check-item').forEach(item => {
      const id  = item.dataset.id;
      const cb  = item.querySelector('input[type=checkbox]');
      if (cb) cb.checked = selected.includes(id);
      item.draggable = selected.includes(id);
      const fnRow   = item.querySelector('.fn-row');
      if (fnRow) fnRow.classList.toggle('visible', selected.includes(id));
      const fnInput = item.querySelector('.fn-input');
      if (fnInput && fnInput !== root.activeElement) fnInput.value = fn[id] || '';
    });
  }

  // Detect humidity sensors by unit_of_measurement === '%' and device_class === 'humidity'
  _allHumidEntities() {
    if (!this._hass) return [];
    return Object.keys(this._hass.states)
      .filter(id => {
        const dom  = id.split('.')[0];
        if (!['sensor'].includes(dom)) return false;
        const attrs = this._hass.states[id].attributes || {};
        const unit  = attrs.unit_of_measurement || '';
        const dc    = attrs.device_class || '';
        // Accept % unit with humidity device_class, or % unit with "humid" in name/id as fallback
        return unit === '%' && (dc === 'humidity' || id.toLowerCase().includes('humid') || (attrs.friendly_name || '').toLowerCase().includes('humid'));
      })
      .sort((a, b) => {
        const na = this._hass.states[a]?.attributes?.friendly_name || a;
        const nb = this._hass.states[b]?.attributes?.friendly_name || b;
        return na.localeCompare(nb);
      });
  }

  _renderEditor() {
    this._rendered    = true;
    this._allEntities = this._allHumidEntities();
    const cfg         = this._config;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--primary-font-family, inherit); }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--secondary-text-color); margin-bottom: 8px; padding: 0 2px; display:flex;align-items:center;gap:6px; }
        .card-block { background: var(--card-background-color); border-radius: 12px; overflow: hidden; border: 1px solid var(--divider-color, rgba(0,0,0,0.1)); }
        .field-row { padding: 10px 14px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.07)); }
        .field-row:last-child { border-bottom: none; }
        .field-label { flex: 1; font-size: 13px; font-weight: 500; color: var(--primary-text-color); }
        .field-desc  { font-size: 11px; color: var(--secondary-text-color); margin-top: 1px; }
        .text-input { padding: 8px 10px; border: 1px solid var(--divider-color, rgba(0,0,0,0.15)); border-radius: 8px; background: var(--secondary-background-color); color: var(--primary-text-color); font-size: 14px; font-family: inherit; flex: 1; min-width: 0; outline: none; -webkit-appearance: none; }
        .text-input:focus { border-color: #32ADE6; }
        .num-input  { padding: 8px 10px; border: 1px solid var(--divider-color, rgba(0,0,0,0.15)); border-radius: 8px; background: var(--secondary-background-color); color: var(--primary-text-color); font-size: 14px; font-family: inherit; width: 64px; text-align: center; outline: none; -webkit-appearance: none; }
        .num-input:focus { border-color: #32ADE6; }
        .search-wrap { padding: 8px 10px; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.07)); }
        .search-box { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid var(--divider-color, rgba(0,0,0,0.15)); border-radius: 8px; background: var(--secondary-background-color); color: var(--primary-text-color); font-size: 14px; font-family: inherit; outline: none; -webkit-appearance: none; }
        .search-box::placeholder { color: var(--secondary-text-color); }
        .search-box:focus { border-color: #32ADE6; }
        .checklist { max-height: 340px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .check-item { display: flex; flex-direction: column; padding: 10px 12px; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.06)); background: var(--card-background-color); gap: 6px; user-select: none; }
        .check-item:last-child { border-bottom: none; }
        .check-item.dragging { opacity: 0.45; background: var(--secondary-background-color) !important; }
        .check-item-row { display: flex; align-items: center; gap: 8px; min-height: 36px; }
        .drag-handle { cursor: grab; padding: 4px 6px; color: var(--secondary-text-color); flex-shrink: 0; touch-action: none; line-height: 1; }
        .drag-handle:active { cursor: grabbing; }
        .entity-name { font-size: 13px; font-weight: 500; color: var(--primary-text-color); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .entity-id   { font-size: 10px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .entity-val  { font-size: 12px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; flex-shrink: 0; }
        .fn-row { display: none; padding: 0 2px 2px 32px; }
        .fn-row.visible { display: flex; align-items: center; gap: 6px; }
        .fn-label { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; flex-shrink: 0; }
        .fn-input { flex: 1; padding: 5px 8px; border: 1px solid var(--divider-color, rgba(0,0,0,0.15)); border-radius: 7px; background: var(--secondary-background-color); color: var(--primary-text-color); font-size: 12px; font-family: inherit; outline: none; -webkit-appearance: none; min-width: 0; }
        .fn-input:focus { border-color: #32ADE6; }
        .fn-input::placeholder { color: var(--secondary-text-color); opacity: 0.7; }
        .toggle-switch { position: relative; width: 44px; height: 26px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-track { position: absolute; inset: 0; border-radius: 26px; background: rgba(120,120,128,0.32); cursor: pointer; transition: background 0.25s ease; }
        .toggle-track::after { content: ''; position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #fff; top: 2px; left: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform 0.25s ease; }
        .toggle-switch input:checked + .toggle-track { background: #34C759; }
        .toggle-switch input:checked + .toggle-track::after { transform: translateX(18px); }
        .colour-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; }
        .colour-card  { background: var(--secondary-background-color); border-radius: 10px; padding: 10px; display: flex; gap: 10px; align-items: flex-start; }
        .colour-swatch { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
        .colour-swatch-preview { width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.15); flex-shrink: 0; }
        .colour-swatch input[type=color] { opacity: 0; width: 0; height: 0; position: absolute; }
        .colour-info  { flex: 1; min-width: 0; }
        .colour-label { font-size: 12px; font-weight: 600; color: var(--primary-text-color); }
        .colour-desc  { font-size: 10px; color: var(--secondary-text-color); margin: 2px 0 4px; line-height: 1.3; }
        .colour-hex-row { display: flex; align-items: center; gap: 4px; }
        .colour-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .colour-hex   { font-size: 11px; border: 1px solid var(--divider-color); border-radius: 5px; padding: 3px 5px; background: var(--card-background-color); color: var(--primary-text-color); font-family: monospace; width: 70px; outline: none; -webkit-appearance: none; }
        .colour-hex:focus { border-color: #32ADE6; }
        .colour-edit-icon { font-size: 12px; color: var(--secondary-text-color); }
        .auto-badge { font-size: 9px; background: #34C75922; color: #34C759; border: 1px solid #34C75944; border-radius: 6px; padding: 1px 6px; font-weight: 700; }
      </style>

      <!-- Card Settings -->
      <div class="section">
        <div class="section-title">Card Settings</div>
        <div class="card-block">
          <div class="field-row">
            <div>
              <div class="field-label">Title <span style="font-size:10px;color:var(--secondary-text-color);font-weight:400;">(optional)</span></div>
              <div class="field-desc">Label shown on the pill card. Leave blank to hide.</div>
            </div>
            <input class="text-input" id="title" type="text" value="${cfg.title || ''}" placeholder="e.g. Humidity" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          </div>
          <div class="field-row">
            <div>
              <div class="field-label">Decimal Places</div>
              <div class="field-desc">Humidity display precision (0–3).</div>
            </div>
            <input class="num-input" id="decimals" type="number" min="0" max="3" step="1" value="${cfg.decimals ?? 1}" inputmode="numeric">
          </div>
        </div>
      </div>

      <!-- Humidity Thresholds -->
      <div class="section">
        <div class="section-title">Graph Thresholds <span style="font-size:9px;font-weight:400;text-transform:none;letter-spacing:0;opacity:0.6;">(optional)</span></div>
        <div class="card-block">
          <div style="padding:10px 14px 6px;font-size:11px;color:var(--secondary-text-color);line-height:1.5;">
            Set a minimum and maximum humidity. The graph line will change colour — warm amber below minimum, your accent colour in range, fresh green above maximum.
          </div>
          <div class="field-row">
            <div>
              <div class="field-label">Minimum humidity</div>
              <div class="field-desc">Graph line turns warm amber below this value.</div>
            </div>
            <input class="num-input" id="low_threshold" type="number" step="0.1" placeholder="e.g. 30" value="" inputmode="decimal">
          </div>
          <div class="field-row">
            <div>
              <div class="field-label">Maximum humidity</div>
              <div class="field-desc">Graph line turns fresh green above this value.</div>
            </div>
            <input class="num-input" id="high_threshold" type="number" step="0.1" placeholder="e.g. 60" value="" inputmode="decimal">
          </div>
        </div>
      </div>

      <!-- Entity selection -->
      <div class="section">
        <div class="section-title">
          Humidity Sensors
          <span class="auto-badge">AUTO-DETECTED</span>
        </div>
        <div class="card-block">
          <div class="search-wrap">
            <input class="search-box" id="entity-search" type="search" placeholder="Search sensors…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          </div>
          <div class="checklist" id="entity-list"></div>
        </div>
        <div style="font-size:10px;color:var(--secondary-text-color);padding:4px 2px;">
          Shows only sensors with humidity device class and % unit. Toggle to select, drag grip to reorder.
        </div>
      </div>

      <!-- Colours -->
      <div class="section">
        <div class="section-title">Colours</div>
        <div class="card-block">
          <div class="colour-grid" id="colour-grid"></div>
        </div>
      </div>
    `;

    // Wire title
    const titleEl = this.shadowRoot.getElementById('title');
    titleEl.addEventListener('blur', () => this._commitConfig('title', titleEl.value.trim()));
    titleEl.addEventListener('keydown', e => { if (e.key === 'Enter') titleEl.blur(); });

    // Wire decimals
    const decimalsEl = this.shadowRoot.getElementById('decimals');
    decimalsEl.addEventListener('change', () => {
      const v = parseInt(decimalsEl.value);
      this._commitConfig('decimals', isNaN(v) ? 1 : Math.max(0, Math.min(3, v)));
    });

    // Wire thresholds
    const loEl = this.shadowRoot.getElementById('low_threshold');
    const hiEl = this.shadowRoot.getElementById('high_threshold');
    if (loEl) {
      const loVal = this._config.low_threshold;
      loEl.value = (loVal !== null && loVal !== undefined) ? loVal : '';
      loEl.addEventListener('blur', () => {
        const v = loEl.value.trim() === '' ? null : parseFloat(loEl.value);
        this._commitConfig('low_threshold', isNaN(v) ? null : v);
      });
      loEl.addEventListener('keydown', e => { if (e.key === 'Enter') loEl.blur(); });
    }
    if (hiEl) {
      const hiVal = this._config.high_threshold;
      hiEl.value = (hiVal !== null && hiVal !== undefined) ? hiVal : '';
      hiEl.addEventListener('blur', () => {
        const v = hiEl.value.trim() === '' ? null : parseFloat(hiEl.value);
        this._commitConfig('high_threshold', isNaN(v) ? null : v);
      });
      hiEl.addEventListener('keydown', e => { if (e.key === 'Enter') hiEl.blur(); });
    }

    // Wire search
    const searchEl = this.shadowRoot.getElementById('entity-search');
    searchEl.addEventListener('input', () => {
      this._searchTerm = searchEl.value;
      this._filterEntityList();
    });

    this._renderEntityList();
    this._buildColourGrid();
    this._setupReordering();
  }

  _renderEntityList() {
    const list     = this.shadowRoot.getElementById('entity-list');
    if (!list) return;
    const selected = this._config.entities      || [];
    const fn       = this._config.friendly_names || {};
    const all      = this._allEntities;

    list.innerHTML = '';

    if (!all.length) {
      list.innerHTML = `<div style="padding:14px;font-size:12px;color:var(--secondary-text-color);">No humidity sensors found. Make sure your sensors have device_class: humidity set.</div>`;
      return;
    }

    const selectedInOrder = selected.filter(id => all.includes(id));
    const unselected      = all.filter(id => !selected.includes(id));
    const ordered         = [...selectedInOrder, ...unselected];

    ordered.forEach(entityId => {
      const isChecked  = selected.includes(entityId);
      const stateObj   = this._hass?.states[entityId];
      const haName     = stateObj?.attributes?.friendly_name || entityId.split('.').pop().replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      const unit       = stateObj?.attributes?.unit_of_measurement || '%';
      const rawVal     = parseFloat(stateObj?.state);
      const dec        = parseInt(this._config.decimals ?? 1);
      const valStr     = isNaN(rawVal) ? '—' : `${rawVal.toFixed(isNaN(dec)?1:dec)}${unit}`;
      const searchKey  = (haName + ' ' + entityId).toLowerCase();
      const savedFn    = fn[entityId] || '';

      const item = document.createElement('div');
      item.className       = 'check-item';
      item.dataset.id      = entityId;
      item.dataset.search  = searchKey;
      item.draggable       = isChecked;

      item.innerHTML = `
        <div class="check-item-row">
          <div class="drag-handle" title="Drag to reorder">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;display:block;"><path d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z"/></svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div class="entity-name">${haName}</div>
            <div class="entity-id">${entityId}</div>
          </div>
          <span class="entity-val">${valStr}</span>
          <label class="toggle-switch">
            <input type="checkbox" ${isChecked ? 'checked' : ''} data-id="${entityId}">
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="fn-row ${isChecked ? 'visible' : ''}">
          <span class="fn-label">Display name</span>
          <input class="fn-input" type="text" value="${savedFn}" placeholder="${haName}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>`;

      item.querySelector('input[type=checkbox]').addEventListener('change', e => {
        const current = [...(this._config.entities || [])];
        const id      = e.target.dataset.id;
        const fnRow   = item.querySelector('.fn-row');
        if (e.target.checked) {
          if (!current.includes(id)) current.push(id);
          item.draggable = true;
          if (fnRow) fnRow.classList.add('visible');
        } else {
          const idx = current.indexOf(id);
          if (idx !== -1) current.splice(idx, 1);
          item.draggable = false;
          if (fnRow) fnRow.classList.remove('visible');
        }
        this._commitConfig('entities', current);
      });

      const fnInput = item.querySelector('.fn-input');
      fnInput.addEventListener('blur', () => {
        const names = { ...(this._config.friendly_names || {}) };
        const val   = fnInput.value.trim();
        if (val) names[entityId] = val;
        else     delete names[entityId];
        this._commitConfig('friendly_names', names);
      });
      fnInput.addEventListener('keydown', e => { if (e.key === 'Enter') fnInput.blur(); });

      list.appendChild(item);
    });

    this._filterEntityList();
  }

  _filterEntityList() {
    const list = this.shadowRoot.getElementById('entity-list');
    if (!list) return;
    const term = this._searchTerm.toLowerCase().trim();
    list.querySelectorAll('.check-item').forEach(item => {
      item.style.display = (!term || item.dataset.search.includes(term)) ? 'flex' : 'none';
    });
  }

  _setupReordering() {
    const list = this.shadowRoot.getElementById('entity-list');
    if (!list) return;
    let draggedItem = null;

    list.addEventListener('dragstart', e => {
      draggedItem = e.target.closest('.check-item');
      if (!draggedItem?.draggable || !draggedItem.querySelector('input[type=checkbox]')?.checked) {
        e.preventDefault(); draggedItem = null; return;
      }
      setTimeout(() => draggedItem?.classList.add('dragging'), 0);
    });
    list.addEventListener('dragover', e => {
      e.preventDefault();
      if (!draggedItem) return;
      const after = this._dragAfterElement(list, e.clientY);
      if (after == null) list.appendChild(draggedItem);
      else list.insertBefore(draggedItem, after);
    });
    list.addEventListener('dragend', () => {
      draggedItem?.classList.remove('dragging');
      draggedItem = null;
      this._saveOrder();
    });

    list.addEventListener('touchstart', e => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;
      const item = handle.closest('.check-item');
      if (!item?.querySelector('input[type=checkbox]')?.checked) return;
      draggedItem = item;
      draggedItem.classList.add('dragging');
    }, { passive: true });
    list.addEventListener('touchmove', e => {
      if (!draggedItem) return;
      e.preventDefault();
      const after = this._dragAfterElement(list, e.touches[0].clientY);
      if (after == null) list.appendChild(draggedItem);
      else list.insertBefore(draggedItem, after);
    }, { passive: false });
    list.addEventListener('touchend', () => {
      if (!draggedItem) return;
      draggedItem.classList.remove('dragging');
      draggedItem = null;
      this._saveOrder();
    });
  }

  _dragAfterElement(container, y) {
    const items = [...container.querySelectorAll('.check-item:not(.dragging)')].filter(i => i.style.display !== 'none');
    return items.reduce((closest, child) => {
      const box    = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  _saveOrder() {
    const list = this.shadowRoot.getElementById('entity-list');
    if (!list) return;
    const newOrder = [...list.querySelectorAll('.check-item')]
      .filter(i => i.querySelector('input[type=checkbox]')?.checked)
      .map(i => i.dataset.id);
    this._commitConfig('entities', newOrder);
  }

  _buildColourGrid() {
    const grid = this.shadowRoot.getElementById('colour-grid');
    if (!grid) return;
    grid.innerHTML = '';

    HEDGEHOG_COLOUR_FIELDS.forEach(field => {
      const savedVal = this._config[field.key] || field.default;

      const card = document.createElement('div');
      card.className   = 'colour-card';
      card.dataset.key = field.key;
      card.innerHTML = `
        <label class="colour-swatch">
          <div class="colour-swatch-preview" style="background:${savedVal}"></div>
          <input type="color" value="${savedVal}">
        </label>
        <div class="colour-info">
          <div class="colour-label">${field.label}</div>
          <div class="colour-desc">${field.desc}</div>
          <div class="colour-hex-row">
            <div class="colour-dot" style="background:${savedVal}"></div>
            <input class="colour-hex" type="text" value="${savedVal}" maxlength="7" placeholder="${field.default}" spellcheck="false" autocomplete="off">
            <span class="colour-edit-icon">✎</span>
          </div>
        </div>`;

      const picker  = card.querySelector('input[type=color]');
      const hexIn   = card.querySelector('.colour-hex');
      const preview = card.querySelector('.colour-swatch-preview');
      const dot     = card.querySelector('.colour-dot');

      const applyVisual = hex => {
        preview.style.background = hex;
        dot.style.background     = hex;
        picker.value             = hex;
        hexIn.value              = hex;
      };

      picker.addEventListener('input',  () => applyVisual(picker.value));
      picker.addEventListener('change', () => { applyVisual(picker.value); this._commitConfig(field.key, picker.value); });

      hexIn.addEventListener('input', () => {
        const v = hexIn.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) applyVisual(v);
      });
      hexIn.addEventListener('blur', () => {
        const v = hexIn.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) this._commitConfig(field.key, v);
        else hexIn.value = this._config[field.key] || field.default;
      });
      hexIn.addEventListener('keydown', e => { if (e.key === 'Enter') hexIn.blur(); });

      grid.appendChild(card);
    });
  }

  _commitConfig(key, value) {
    this._config = { ...this._config, [key]: value, type: 'custom:hedgehog-humidity-card' };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail:   { config: this._config },
      bubbles:  true,
      composed: true,
    }));
  }
}

// ─── Registration ─────────────────────────────────────────────────────────────
if (!customElements.get('hedgehog-humidity-card')) {
  customElements.define('hedgehog-humidity-card', HedgehogHumidityCard);
}
if (!customElements.get('hedgehog-humidity-card-editor')) {
  customElements.define('hedgehog-humidity-card-editor', HedgehogHumidityCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'hedgehog-humidity-card')) {
  window.customCards.push({
    type:        'hedgehog-humidity-card',
    name:        'Hedgehog Humidity Card',
    preview:     true,
    description: 'Compact pill card showing humidity range across multiple sensors, with sensor overview and history graph popups.',
  });
}
