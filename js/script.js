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
  installQuoteOfTheDay();
  byId('closeOverlay').addEventListener('click', closeOverlay);

  // Optional: allow embedded pages you control to close the popup
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
      // Trim BOM if present, parse rows
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

function openOverlay(url, closeOnContains = '') {
  const overlay = byId('formOverlay');
  const iframe  = byId('formFrame');

  // Resolve absolute URL for stability
  const resolved = new URL(url, window.location.href).href;

  // Lock scroll behind popup (iPad friendly)
  state.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('no-scroll');
  document.body.style.top = `-${state.scrollY}px`;

  state.overlayOpen = true;
  state.closeOnContains = closeOnContains || '';

  // Reset iframe, show overlay, then set src
  iframe.removeAttribute('src');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  iframe.onload = () => {
    try {
      const currentSrc = iframe.src;
      // Optional auto-close when a "thank you" / submission URL appears
      if (state.closeOnContains && currentSrc.includes(state.closeOnContains)) {
        closeOverlay();
      }
    } catch(e) {
      // Cross-origin access is fine; we're not inspecting DOM, only URL string
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

  // Restore scroll
  document.body.classList.remove('no-scroll');
  document.body.style.top = '';
  window.scrollTo(0, state.scrollY || 0);

  state.overlayOpen = false;
  state.closeOnContains = null;
}

/* ---------- Quote of the Day ---------- */

/**
 * Picks a deterministic daily quote from a built-in list (offline-safe).
 * If you add assets/quotes.json (array of {text, author}), we’ll try to load it first.
 */
function installQuoteOfTheDay() {
  const el = byId('quoteText');
  const fallback = getLocalQuoteOfDay();

  fetch('./assets/quotes.json', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject('no quotes.json'))
    .then(list => {
      if (!Array.isArray(list) || list.length === 0) throw new Error('empty quotes.json');
      const q = pickByDate(list);
      el.textContent = formatQuote(q);
    })
    .catch(() => {
      el.textContent = formatQuote(fallback);
    });
}

function getLocalQuoteOfDay() {
  const quotes = [
    { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
    { text: "It always seems impossible until it’s done.", author: "Nelson Mandela" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "Do the best you can until you know better. Then when you know better, do better.", author: "Maya Angelou" },
    { text: "If you can dream it, you can do it.", author: "Walt Disney" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "What we fear of doing most is usually what we most need to do.", author: "Ralph Waldo Emerson" },
    { text: "You miss 100% of the shots you don’t take.", author: "Wayne Gretzky" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" }
  ];
  return pickByDate(quotes);
}

function pickByDate(list) {
  const today = new Date();
  const seed = today.getFullYear() * 1000 + (today.getMonth() + 1) * 50 + today.getDate();
  const idx = Math.abs(hash(seed.toString())) % list.length;
  return list[idx];
}

function hash(str) {
  // Simple deterministic hash (djb2-ish)
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return h;
}

function formatQuote(q) {
  if (!q) return "Keep going. You're doing great.";
  if (q.author) return `“${q.text}” — ${q.author}`;
  return `“${q.text}”`;
}
