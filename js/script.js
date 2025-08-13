// CONFIG
const CSV_PATH = './assets/buttons.csv';

// State
const state = {
  overlayOpen: false,
  scrollY: 0,
  closeOnContains: null,
};

function $(id){ return document.getElementById(id); }

window.addEventListener('DOMContentLoaded', () => {
  loadButtons();
  installQuoteOfTheDay();
  $('closeOverlay').addEventListener('click', () => closeOverlay());

  // Optional: embedded pages can close themselves
  window.addEventListener('message', (event) => {
    try {
      if (event && event.data && (event.data.type === 'kiosk:done' || event.data === 'kiosk:done')) {
        closeOverlay();
      }
    } catch(e) { /* ignore */ }
  });

  // Start occasional glare effect
  startRandomGlare();
});

/* ----------------------------
   Buttons from CSV
----------------------------- */
function loadButtons() {
  fetch(CSV_PATH)
    .then(res => {
      if (!res.ok) throw new Error(`Couldn't fetch ${CSV_PATH}: ${res.status}`);
      return res.text();
    })
    .then(csvText => {
      if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const rows = parsed.data.map(normalizeRow).filter(r => r.ButtonName && r.EmbedURL);

      const container = $('buttons');
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

/* ----------------------------
   Overlay open/close (no page wipe)
----------------------------- */
function openOverlay(url, closeOnContains = '') {
  const overlay = $('formOverlay');
  const iframe  = $('formFrame');

  const resolved = new URL(url, window.location.href).href;

  // Lock background scroll (iPad friendly)
  state.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('no-scroll');
  document.body.style.top = `-${state.scrollY}px`;

  state.overlayOpen = true;
  state.closeOnContains = closeOnContains || '';

  // Show overlay then set iframe
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.add('active'));

  iframe.onload = () => {
    try {
      const currentSrc = iframe.src;
      if (state.closeOnContains && currentSrc.includes(state.closeOnContains)) {
        closeOverlay();
      }
    } catch(e) { /* cross-origin fine */ }
  };
  iframe.src = resolved;
}

function closeOverlay() {
  if (!state.overlayOpen) return;

  const overlay = $('formOverlay');
  const iframe  = $('formFrame');

  overlay.classList.remove('active');
  setTimeout(() => {
    overlay.classList.add('hidden');
    iframe.removeAttribute('src');

    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, state.scrollY || 0);

    state.overlayOpen = false;
    state.closeOnContains = null;
  }, 300); // match CSS transition
}

/* ----------------------------
   Quote of the Day
----------------------------- */
function installQuoteOfTheDay() {
  const el = $('quoteText');
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
function hash(str) { let h = 5381; for (let i=0;i<str.length;i++) h=((h<<5)+h)+str.charCodeAt(i); return h; }
function formatQuote(q) { return q?.author ? `“${q.text}” — ${q.author}` : `“${q.text}”`; }

/* ----------------------------
   Random button glare
----------------------------- */
function startRandomGlare() {
  const min = 8000, max = 16000; // 8–16s
  function schedule() {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(() => {
      const btns = Array.from(document.querySelectorAll('.button'));
      if (btns.length) {
        const target = btns[Math.floor(Math.random() * btns.length)];
        target.classList.add('shine');
        setTimeout(() => target.classList.remove('shine'), 1300);
      }
      schedule();
    }, delay);
  }
  schedule();
}
