// CONFIG
const CSV_PATH = './assets/buttons.csv';

const state = {
  overlayOpen: false,
  scrollY: 0,
  closeOnContains: null,
  animating: false,
};

function $id(id){ return document.getElementById(id); }

window.addEventListener('DOMContentLoaded', () => {
  loadButtons();
  installQuoteOfTheDay();

  $id('closeOverlay').addEventListener('click', () => closeOverlay({ animated: true }));

  // Optional: embedded pages can close themselves
  window.addEventListener('message', (event) => {
    try {
      if (event && event.data && (event.data.type === 'kiosk:done' || event.data === 'kiosk:done')) {
        closeOverlay({ animated: true });
      }
    } catch(e) { /* ignore */ }
  });
});

/* ----------------------------
   Buttons & CSV
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

      const container = $id('buttons');
      container.innerHTML = '';
      rows.forEach(r => {
        const btn = document.createElement('button');
        btn.className = 'button';
        btn.type = 'button';
        btn.textContent = r.ButtonName;
        btn.addEventListener('click', () => openOverlay(r.EmbedURL, r.CloseOnUrlContains, { animated: true }));
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
   Overlay open/close with page wipe
----------------------------- */
function openOverlay(url, closeOnContains = '', { animated = true } = {}) {
  if (state.animating || state.overlayOpen) return;
  state.animating = true;

  const overlay = $id('formOverlay');
  const iframe  = $id('formFrame');
  const wipe    = $id('wipe');
  const resolved = new URL(url, window.location.href).href;

  // Lock scroll behind popup
  state.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('no-scroll');
  document.body.style.top = `-${state.scrollY}px`;

  state.closeOnContains = closeOnContains || '';

  // Prepare
  iframe.removeAttribute('src');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  const startOverlay = () => {
    overlay.classList.add('active');
    iframe.onload = () => {
      try {
        const currentSrc = iframe.src;
        if (state.closeOnContains && currentSrc.includes(state.closeOnContains)) {
          closeOverlay({ animated: true });
        }
      } catch(e){ /* cross-origin safe */ }
    };
    iframe.src = resolved;
    state.overlayOpen = true;
    state.animating = false;
  };

  if (animated) {
    wipe.classList.remove('out');
    wipe.classList.add('in');
    wipe.addEventListener('animationend', function onEnd() {
      wipe.removeEventListener('animationend', onEnd);
      // Immediately run reverse wipe to reveal popup with subtle delay overlap
      wipe.classList.remove('in');
      wipe.classList.add('out');
      startOverlay();
    }, { once: true });
  } else {
    startOverlay();
    state.animating = false;
  }
}

function closeOverlay({ animated = true } = {}) {
  if (state.animating || !state.overlayOpen) return;
  state.animating = true;

  const overlay = $id('formOverlay');
  const iframe  = $id('formFrame');
  const wipe    = $id('wipe');

  const finishClose = () => {
    overlay.classList.remove('active');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    iframe.removeAttribute('src');

    // Restore scroll
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, state.scrollY || 0);

    state.overlayOpen = false;
    state.closeOnContains = null;
    state.animating = false;
  };

  if (animated) {
    // Play wipe in reverse (from current view up)
    wipe.classList.remove('in');
    wipe.classList.add('in'); // ensure restart
    void wipe.offsetWidth;    // reflow to restart animation
    wipe.classList.remove('out');
    wipe.classList.add('in');

    // Fade out overlay while wipe covers
    overlay.classList.remove('active');

    wipe.addEventListener('animationend', function onEnd() {
      wipe.removeEventListener('animationend', onEnd);
      // Push wipe up to reveal home again
      wipe.classList.remove('in');
      wipe.classList.add('out');
      finishClose();
    }, { once: true });
  } else {
    finishClose();
  }
}

/* ----------------------------
   Quote of the Day (deterministic, offline-safe)
----------------------------- */
function installQuoteOfTheDay() {
  const el = $id('quoteText');
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
  let h = 5381; for (let i=0;i<str.length;i++) h = ((h<<5)+h) + str.charCodeAt(i); return h;
}
function formatQuote(q) {
  if (!q) return "Keep going. You're doing great.";
  return q.author ? `“${q.text}” — ${q.author}` : `“${q.text}”`;
}
