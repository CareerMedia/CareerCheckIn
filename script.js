// — CONFIG: path to your CSV in /assets —
const CSV_PATH = './assets/buttons.csv';

window.addEventListener('DOMContentLoaded', () => {
  // show splash for 2s, then home
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('home').classList.remove('hidden');
    loadButtons();
  }, 2000);
});

function loadButtons() {
  fetch(CSV_PATH)
    .then(res => {
      if (!res.ok) throw new Error(`Couldn’t fetch ${CSV_PATH}: ${res.status}`);
      return res.text();
    })
    .then(csv => Papa.parse(csv, { header: true }).data)
    .then(rows => {
      const container = document.getElementById('buttons');
      rows.forEach(r => {
        const btn = document.createElement('div');
        btn.className = 'button';
        btn.textContent = r.ButtonName;
        btn.dataset.url = r.EmbedURL;
        btn.addEventListener('click', () => openForm(r.EmbedURL));
        container.appendChild(btn);
      });
    })
    .catch(err => {
      console.error(err);
      alert('Error loading buttons. Check console for details.');
    });
}

let originalURL = '';
function openForm(url) {
  // resolve relative ↔ absolute
  const resolved = new URL(url, window.location.href).href;
  originalURL = resolved;

  const overlay = document.getElementById('formOverlay');
  const iframe  = document.getElementById('formFrame');
  iframe.src    = resolved;
  overlay.classList.remove('hidden');

  iframe.onload = () => {
    // if iframe has navigated away from original, close
    if (iframe.src !== originalURL) {
      overlay.classList.add('hidden');
      iframe.src = '';
    }
  };
}
