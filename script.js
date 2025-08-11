// — CONFIG: point to your local CSV in /assets —
const CSV_PATH = './assets/buttons.csv';

window.addEventListener('DOMContentLoaded', () => {
  // show splash, then home
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('home').classList.remove('hidden');
    loadButtons();
  }, 2000);
});

function loadButtons() {
  fetch(CSV_PATH)
    .then(res => res.text())
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
    .catch(err => console.error('Error loading CSV:', err));
}

let originalURL = '';
function openForm(url) {
  originalURL = url;
  const overlay = document.getElementById('formOverlay');
  const iframe  = document.getElementById('formFrame');
  iframe.src    = url;
  overlay.classList.remove('hidden');

  iframe.onload = () => {
    // if iframe has navigated away, assume submit and close
    if (!iframe.src.includes(originalURL)) {
      overlay.classList.add('hidden');
      iframe.src = '';
    }
  };
}
