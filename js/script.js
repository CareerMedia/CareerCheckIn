// CONFIG
const CSV_PATH = './assets/buttons.csv';

const state = {
  overlayOpen: false,
  initialFrameURL: null,
  closeOnContains: null,
};

function byId(id){ return document.getElementById(id); }

window.addEventListener('DOMContentLoaded', () => {
  // Load buttons from CSV
  loadButtons();

  // Wire up close button
  byId('closeOverlay').addEventListener('click', closeOverlay);

  // Optional: listen for postMessage from embedded pages you control
  window.addEventListener('message', (event) => {
    // Example expected payload: { type: 'kiosk:done' }
    try {
      if (event && event.data && (event.data.type === 'kiosk:done' || event.data === 'kiosk:done')) {
        closeOverlay();
      }
    } catch(e) { /* no-op */ }
  });
});

function loadButtons() {
  fetch(CSV_PATH)
    .then(res => {
      if (!res.ok) throw new Error(`Couldn't fetch ${CSV_PATH}: ${res.status}`);
      return res.text();
    })
    .then(csvText => {
      // Handle potential BOM and parse
      if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.slice(1);
      }
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const rows = parsed.data.map(normalizeRow)
        .filter(r => r.ButtonName && r.EmbedURL);

      const container = byId('buttons');
      container.innerHTML = ''; // clear
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
  // Support BOM on header for ButtonName
  const name = (row.ButtonName ?? row['\ufeffButtonName'] ?? '').trim();
  const url = (row.EmbedURL ?? '').trim();
  const closeOn = (row.CloseOnUrlContains ?? '').trim();
  return { ButtonName: name, EmbedURL: url, CloseOnUrlContains: closeOn };
}

function openOverlay(url, closeOnContains='') {
  const overlay = byId('formOverlay');
  const iframe  = byId('formFrame');

  // Build absolute URL to avoid premature mismatch
  const resolved = new URL(url, window.location.href).href;

  state.overlayOpen = true;
  state.initialFrameURL = resolved;
  state.closeOnContains = closeOnContains || '';

  // Reset and show
  iframe.removeAttribute('src'); // stop any previous content
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  // Attach onload handler AFTER src set to track navigations
  iframe.onload = () => {
    try {
      const currentSrc = iframe.src;
      if (state.closeOnContains && currentSrc.includes(state.closeOnContains)) {
        closeOverlay();
      }
    } catch(e) {
      // Cross-origin; ignore.
    }
  };

  // Finally set src
  iframe.src = resolved;
}

function closeOverlay() {
  if (!state.overlayOpen) return;
  const overlay = byId('formOverlay');
  const iframe  = byId('formFrame');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  iframe.removeAttribute('src');
  state.overlayOpen = false;
  state.initialFrameURL = null;
  state.closeOnContains = null;
}
