/* =========================================================
   La Plata Logística — Landing
   ========================================================= */

// Reemplazar por el número real (formato internacional, sin + ni espacios).
const WHATSAPP_NUMBER = '5492210000000';
const WHATSAPP_TEXT = 'Hola, quisiera solicitar un presupuesto.';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

/* ---------- Header: estado al hacer scroll + menú mobile ---------- */
const header = document.getElementById('header');
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const setMenu = (open) => {
  header.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
};
menuToggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- Servicios: pestañas ---------- */
const tabs = Array.from(document.querySelectorAll('.tab'));
const panels = Array.from(document.querySelectorAll('.panel'));

const activateTab = (index, focus = false) => {
  tabs.forEach((tab, i) => {
    const active = i === index;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    panels[i].hidden = !active;
  });
  if (focus) tabs[index].focus();
  tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: scrollBehavior });
};

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => activateTab(i));
  tab.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) {
      e.preventDefault();
      activateTab((i + step + tabs.length) % tabs.length, true);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      activateTab(e.key === 'Home' ? 0 : tabs.length - 1, true);
    }
  });
});

/* ---------- WhatsApp ---------- */
document.getElementById('whatsappBtn').href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

/* ---------- Botón de cada servicio → preselecciona el formulario ---------- */
const serviceSelect = document.getElementById('serviceSelect');
document.querySelectorAll('[data-service]').forEach((btn) => {
  btn.addEventListener('click', () => { serviceSelect.value = btn.dataset.service; });
});

/* ---------- Formulario de consulta ---------- */
const form = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let firstInvalid = null;

  form.querySelectorAll('[required]').forEach((field) => {
    const ok = field.checkValidity() && field.value.trim() !== '';
    field.closest('.field').classList.toggle('is-invalid', !ok);
    if (!ok && !firstInvalid) firstInvalid = field;
  });

  if (firstInvalid) {
    formStatus.textContent = 'Revisá los campos marcados para continuar.';
    formStatus.classList.add('is-error');
    firstInvalid.focus();
    return;
  }

  // Maqueta: no hay backend conectado. Acá se integraría el envío real (email, CRM, etc.).
  formStatus.classList.remove('is-error');
  formStatus.textContent = '¡Gracias! Recibimos tu consulta y te contactaremos a la brevedad.';
  form.reset();
});

form.addEventListener('input', (e) => {
  const field = e.target.closest('.field');
  if (field && e.target.value.trim() !== '') field.classList.remove('is-invalid');
});

/* =========================================================
   Seguimiento de envíos — DEMO
   Mapa Leaflet + traza vial real La Plata → Puerto de Buenos Aires
   (route-data.js). La posición de la unidad es simulada; en producción
   vendría de la API del proveedor de GPS de la flota.
   Leaflet se carga recién cuando se abre la demo.
   ========================================================= */
const LEAFLET = {
  css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  cssSri: 'sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw==',
  js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  jsSri: 'sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==',
};

const loadLeaflet = () => new Promise((resolve) => {
  if (window.L) return resolve(true);
  const css = Object.assign(document.createElement('link'), {
    rel: 'stylesheet', href: LEAFLET.css, integrity: LEAFLET.cssSri, crossOrigin: 'anonymous',
  });
  const js = Object.assign(document.createElement('script'), {
    src: LEAFLET.js, integrity: LEAFLET.jsSri, crossOrigin: 'anonymous',
  });
  js.onload = () => resolve(true);
  js.onerror = () => resolve(false);
  document.head.append(css, js);
});

const createTrackerDemo = () => {
  const ROUTE = window.LPL_ROUTE;
  const $ = (id) => document.getElementById(id);
  const TRIP_MS = 120000;                // la demo recorre los ~58 km en 2 minutos
  const EXAMPLE_DOMAIN = 'ejemplo.com.ar/seguimiento/';

  const els = {
    code: $('trkCode'), url: $('trkUrl'), status: $('trkStatus'),
    bar: $('trkBar'), pct: $('trkPct'), start: $('trkStart'),
    eta: $('trkEta'), km: $('trkKm'), speed: $('trkSpeed'), ping: $('trkPing'),
    tlConfirm: $('tlConfirm'), tlPickup: $('tlPickup'), tlTransit: $('tlTransit'),
    tlTransitText: $('tlTransitText'), tlDelivery: $('tlDelivery'), tlEta: $('tlEta'),
    follow: $('followBtn'),
  };

  /* Geometría: distancias acumuladas sobre la traza */
  const toRad = (d) => (d * Math.PI) / 180;
  const haversine = (a, b) => {
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  const bearing = (a, b) => {
    const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]));
    const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
    return (Math.atan2(y, x) * 180) / Math.PI;
  };
  const cum = [0];
  for (let i = 1; i < ROUTE.length; i++) cum.push(cum[i - 1] + haversine(ROUTE[i - 1], ROUTE[i]));
  const TRIP_KM = cum[cum.length - 1];

  const pointAt = (p) => {
    const d = p * TRIP_KM;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const t = Math.min(Math.max((d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), 0), 1);
    const a = ROUTE[i - 1];
    const b = ROUTE[i];
    return { latlng: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], index: i, heading: bearing(a, b) };
  };

  const PLACES = [
    ['La Plata', -34.921, -57.954], ['City Bell', -34.871, -58.05], ['Villa Elisa', -34.846, -58.082],
    ['Hudson', -34.79, -58.15], ['Berazategui', -34.763, -58.212], ['Quilmes', -34.724, -58.254],
    ['Bernal', -34.708, -58.28], ['Wilde', -34.7, -58.32], ['Avellaneda', -34.662, -58.365],
    ['La Boca', -34.635, -58.363], ['Puerto Madero', -34.611, -58.363], ['Retiro', -34.592, -58.375],
  ];
  const nearestPlace = (ll) => PLACES.reduce((best, [name, lat, lng]) => {
    const d = haversine(ll, [lat, lng]);
    return d < best.d ? { name, d } : best;
  }, { name: '', d: Infinity }).name;

  /* Mapa */
  let map = null;
  let doneLine = null;
  let truck = null;
  let truckArrow = null;
  let following = false;
  let flying = false;

  const fitRoute = (animate) => map && map.fitBounds(window.L.latLngBounds(ROUTE), { padding: [36, 36], animate });

  const setFollowing = (value) => {
    following = value;
    els.follow.setAttribute('aria-pressed', String(value));
    els.follow.textContent = value ? 'Ver recorrido' : 'Seguir unidad';
  };

  const initMap = () => {
    const L = window.L;
    if (!L) {
      $('mapFallback').hidden = false;
      els.follow.hidden = true;
      return;
    }
    map = L.map('trackMap', {
      zoomControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      scrollWheelZoom: false,
      dragging: !L.Browser.mobile,
      tap: false,
    });
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    map.attributionControl.setPrefix(false);
    fitRoute(false);                       // la vista debe existir antes de agregar capas

    // Mapa base gris claro (Esri). Para producción, usar un proveedor con plan comercial.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.createPane('labels');
    map.getPane('labels').style.zIndex = 350;
    map.getPane('labels').style.pointerEvents = 'none';
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      pane: 'labels',
    }).addTo(map);

    L.polyline(ROUTE, { color: '#0D47A1', weight: 3, opacity: 0.45, dashArray: '4 7', interactive: false }).addTo(map);
    doneLine = L.polyline([], { color: '#0D47A1', weight: 4, interactive: false }).addTo(map);

    L.marker(ROUTE[0], {
      interactive: false,
      title: 'La Plata',
      icon: L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7], html: '<div class="mk-origin"></div>' }),
    }).addTo(map);
    L.marker(ROUTE[ROUTE.length - 1], {
      interactive: false,
      title: 'Puerto de Buenos Aires',
      icon: L.divIcon({
        className: '', iconSize: [26, 34], iconAnchor: [13, 33],
        html: '<div class="mk-dest"><svg viewBox="0 0 26 34"><path d="M13 33C5 23 1.5 17.5 1.5 12a11.5 11.5 0 0 1 23 0c0 5.5-3.5 11-11.5 21z" fill="#0B2545" stroke="#fff" stroke-width="2"/><circle cx="13" cy="12" r="4" fill="#fff"/></svg></div>',
      }),
    }).addTo(map);

    truck = L.marker(ROUTE[0], {
      interactive: false,
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        html: '<div class="truck-marker"><svg viewBox="0 0 16 16"><path d="M8 1.5l5 12-5-3-5 3z"/></svg></div>',
      }),
    }).addTo(map);
    truckArrow = truck.getElement().querySelector('svg');

    map.on('dragstart', () => { if (following) setFollowing(false); });
    window.addEventListener('resize', () => { map.invalidateSize(); if (!following) fitRoute(false); });
  };

  /* Estado de la simulación */
  const fmt = (date) => date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  let progress = 0.38;
  let speed = 78;
  let lastPing = Date.now();
  let lastFrame = null;
  let rafId = null;
  let running = false;
  let delivered = false;
  let code = 'DEMO-001';

  const setHistory = () => {
    const pickup = new Date(Date.now() - ((progress * TRIP_KM) / 75) * 3600000);
    els.tlPickup.textContent = fmt(pickup);
    els.start.textContent = fmt(pickup);
    els.tlConfirm.textContent = fmt(new Date(pickup.getTime() - 45 * 60000));
  };

  const render = () => {
    const { latlng, index, heading } = pointAt(progress);
    if (map) {
      truck.setLatLng(latlng);
      truckArrow.style.transform = `rotate(${heading}deg)`;
      doneLine.setLatLngs([...ROUTE.slice(0, index), latlng]);
      if (following && !flying) map.panTo(latlng, { animate: false });
    }
    const remaining = Math.max(TRIP_KM * (1 - progress), 0);
    els.bar.style.width = `${(progress * 100).toFixed(1)}%`;
    els.pct.textContent = delivered ? 'Recorrido completo' : `${Math.round(progress * 100)}% del recorrido`;
    els.km.textContent = `${remaining.toFixed(1).replace('.', ',')} km`;
    els.speed.textContent = delivered ? '0 km/h' : `${Math.round(speed)} km/h`;
    if (!delivered) {
      const eta = fmt(new Date(Date.now() + (remaining / speed) * 3600000));
      els.eta.textContent = eta;
      els.tlEta.textContent = eta;
      els.tlTransitText.textContent = progress < 0.04 ? 'saliendo de La Plata' : `cerca de ${nearestPlace(latlng)}`;
    }
    els.ping.textContent = `hace ${Math.max(1, Math.round((Date.now() - lastPing) / 1000))} s`;
  };

  const setDelivered = (value) => {
    delivered = value;
    els.status.classList.toggle('is-delivered', value);
    els.status.textContent = value ? 'Entregado' : 'En tránsito';
    els.tlTransit.classList.toggle('is-current', !value);
    els.tlTransit.classList.toggle('is-done', value);
    els.tlDelivery.classList.toggle('is-done', value);
    if (value) {
      const t = fmt(new Date());
      els.eta.textContent = t;
      els.tlEta.textContent = t;
    }
  };

  const reset = (startAt = 0.04) => {
    progress = startAt;
    setDelivered(false);
    setHistory();
    lastPing = Date.now();
    render();
  };

  const frame = (now) => {
    if (lastFrame === null) lastFrame = now;
    const dt = Math.min(now - lastFrame, 100);
    lastFrame = now;
    if (!delivered) {
      progress = Math.min(progress + dt / TRIP_MS, 1);
      if (Date.now() - lastPing > 2500) {          // "señal GPS" cada ~2,5 s
        lastPing = Date.now();
        speed = Math.min(92, Math.max(64, speed + (Math.random() - 0.5) * 10));
      }
      if (progress >= 1) {
        setDelivered(true);
        setTimeout(() => reset(), 6000);
      }
    }
    render();
    rafId = running ? requestAnimationFrame(frame) : null;
  };

  /* Seguir unidad / ver recorrido */
  els.follow.addEventListener('click', () => {
    setFollowing(!following);
    if (!map) return;
    flying = true;
    map.once('moveend', () => { flying = false; });
    if (following) map.flyTo(pointAt(progress).latlng, 13, { duration: prefersReducedMotion ? 0 : 1 });
    else fitRoute(!prefersReducedMotion);
  });

  initMap();
  setHistory();
  render();

  let reducedTimer = null;
  return {
    start() {
      if (running) return;
      running = true;
      if (map) map.invalidateSize();
      if (prefersReducedMotion) {
        reducedTimer = setInterval(() => { lastPing = Date.now(); render(); }, 3000);
      } else {
        lastFrame = null;
        rafId = requestAnimationFrame(frame);
      }
    },
    stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      clearInterval(reducedTimer);
    },
    load(newCode) {
      code = newCode;
      els.code.textContent = code;
      els.url.textContent = EXAMPLE_DOMAIN + code;
      reset(0.08 + Math.random() * 0.3);
    },
    url: () => `https://${EXAMPLE_DOMAIN}${code}`,
  };
};

/* La demo permanece desplegada y se pausa al salir de pantalla. */
const trackDemo = document.getElementById('trackDemo');
let trackerDemo = null;
let trackerLoading = false;
let demoVisible = false;

const ensureTracker = async () => {
  if (trackerDemo || trackerLoading) return;
  trackerLoading = true;
  await loadLeaflet();
  trackerDemo = createTrackerDemo();
  trackerLoading = false;
  if (demoVisible) trackerDemo.start();
};

if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) ensureTracker();
  }, { rootMargin: '600px 0px' }).observe(trackDemo);

  new IntersectionObserver(([entry]) => {
    demoVisible = entry.isIntersecting;
    if (!trackerDemo) return;
    if (demoVisible) trackerDemo.start(); else trackerDemo.stop();
  }, { threshold: 0.1 }).observe(trackDemo);
} else {
  demoVisible = true;
  if (demoVisible) ensureTracker();
}

/* Código de ejemplo */
const trackForm = document.getElementById('trackForm');
const trackCode = document.getElementById('trackCode');
const trackStatus = document.getElementById('trackStatus');
trackForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!trackerDemo) return;
  const value = trackCode.value.trim().toUpperCase().replace(/\s+/g, '');
  if (value.length < 4) {
    trackStatus.textContent = 'Ingresá un código de al menos 4 caracteres (por ejemplo, DEMO-002).';
    trackStatus.classList.add('is-error');
    trackCode.focus();
    return;
  }
  trackStatus.classList.remove('is-error');
  trackStatus.textContent = `Simulación generada para ${value}. No corresponde a un envío real.`;
  trackerDemo.load(value);
});

/* Copiar link de ejemplo */
const copyBtn = document.getElementById('copyLink');
const copyLabel = document.getElementById('copyLinkText');
let copyTimer;
copyBtn.addEventListener('click', async () => {
  if (!trackerDemo) return;
  const url = trackerDemo.url();
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const tmp = Object.assign(document.createElement('textarea'), { value: url, readOnly: true });
    tmp.style.position = 'absolute';
    tmp.style.left = '-9999px';
    document.body.appendChild(tmp);
    tmp.select();
    try { document.execCommand('copy'); } catch { /* sin portapapeles */ }
    tmp.remove();
  }
  copyLabel.textContent = 'Link copiado';
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { copyLabel.textContent = 'Copiar link de ejemplo'; }, 2000);
});

/* ---------- Año del footer ---------- */
document.getElementById('year').textContent = new Date().getFullYear();
