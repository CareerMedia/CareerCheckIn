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
        btn.addEventListener('click', () => openForm(r.EmbedURL));
        container.appendChild(btn);
      });
    })
    .catch(err => {
      console.error(err);
      alert('Error loading buttons. Check console.');
    });
}

let originalURL = '';
function openForm(url) {
  // Any URL will load in the iframe
  originalURL = url;
  const overlay = document.getElementById('formOverlay');
  const iframe  = document.getElementById('formFrame');
  iframe.src    = url;
  overlay.classList.remove('hidden');

  // When iframe navigates away, assume done and close
  iframe.onload = () => {
    if (iframe.src !== originalURL) {
      overlay.classList.add('hidden');
      iframe.src = '';
    }
  };
}
