// CONFIG
const CSV_PATH = './assets/buttons.csv';

const state = {
  overlayOpen: false,
  scrollY: 0,
  closeOnContains: null,
};

function byId(id){ return document.getElementById(id); }

window.addEventListener('DOMContentLoaded', () => {
  loadButtons();
  byId('closeOverlay').addEventListener('click', closeOverlay);

  // Optional: handle postMessage from embedded pages you control
  window.addEventListener('message', (event) => {
    try {
      if (event && event.data && (event.data.type === 'kiosk:done' || event.data === 'kiosk:done')) {
        closeOverlay();
      }
    } catch(e) { /* ignore */ }
  });
});

function loadButtons() {
  fetch(CSV_PATH)
    .then(res => {
      if (!res.ok) throw new Error(`Couldn't fetch ${CSV_PATH}: ${res.status}`);
      return res.text();
    })
    .then(csvText => {
      // Strip potential BOM, then parse
      if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const rows = parsed.data.map(normalizeRow)
        .filter(r => r.ButtonName && r.EmbedURL);

      const container = byId('buttons');
      container.innerHTML = '';
      rows.forEach(r => {
        const btn = document.createElement('button');
        btn.className = 'button';
        btn.type = 'button';
        btn.textContent = r.ButtonName;
        btn.addEventListener('click', () => openOverlay(r.EmbedURL, r.CloseOnUrlContains));
        container.appendChild(btn);
      });
    })
    .catch(err => {
      console.error(err);
      alert('Error loading buttons CSV. Check console.');
    });
}

function normalizeRow(row) {
  const name = (row.ButtonName ?? row['\ufeffButtonName'] ?? '').trim();
  const url = (row.EmbedURL ?? '').trim();
  const closeOn = (row.CloseOnUrlContains ?? '').trim();
  return { ButtonName: name, EmbedURL: url, CloseOnUrlContains: closeOn };
}

function openOverlay(url, closeOnContains='') {
  const overlay = byId('formOverlay');
  const iframe  = byId('formFrame');

  // Resolve absolute URL
  const resolved = new URL(url, window.location.href).href;

  // Lock scroll behind popup (iOS friendly)
  state.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('no-scroll');
  document.body.style.top = `-${state.scrollY}px`;

  state.overlayOpen = true;
  state.closeOnContains = closeOnContains || '';

  // Reset iframe and show
  iframe.removeAttribute('src');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  // Handle optional auto-close if a "thank you" URL loads
  iframe.onload = () => {
    try {
      const currentSrc = iframe.src;
      if (state.closeOnContains && currentSrc.includes(state.closeOnContains)) {
        closeOverlay();
      }
    } catch(e) {
      // Cross-origin read blocked – which is normal; we only use string includes
    }
  };

  iframe.src = resolved;
}

function closeOverlay() {
  if (!state.overlayOpen) return;

  const overlay = byId('formOverlay');
  const iframe  = byId('formFrame');

  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');

  // Release iframe content
  iframe.removeAttribute('src');

  // Restore scroll position
  document.body.classList.remove('no-scroll');
  document.body.style.top = '';
  window.scrollTo(0, state.scrollY || 0);

  state.overlayOpen = false;
  state.closeOnContains = null;
}
