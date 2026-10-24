// Dialog konfirmasi & pesan buatan sendiri. Jangan pakai confirm()/alert() bawaan browser:
// sebagian browser (termasuk panel browser aplikasi Claude) memblokirnya dan langsung menjawab "batal".
// Pemakaian: if (!(await ask('Hapus proyek ini?', { ok: 'Hapus', danger: true }))) return;

let dlg = null;

function ensure() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.className = 'ask-dialog';
  dlg.innerHTML = `
    <form method="dialog">
      <p class="ask-msg"></p>
      <div class="acts">
        <button type="button" value="cancel" data-v="0">Batal</button>
        <button type="submit" value="ok" data-v="1" class="primary">OK</button>
      </div>
    </form>`;
  document.body.appendChild(dlg);
  return dlg;
}

export function ask(message, { ok = 'OK', cancel = 'Batal', danger = false } = {}) {
  const d = ensure();
  d.querySelector('.ask-msg').textContent = message;
  const okBtn = d.querySelector('[data-v="1"]');
  const cancelBtn = d.querySelector('[data-v="0"]');
  okBtn.textContent = ok;
  okBtn.className = danger ? 'danger-solid' : 'primary';
  cancelBtn.textContent = cancel;
  cancelBtn.hidden = cancel === null;
  return new Promise((resolve) => {
    const done = (v) => {
      d.removeEventListener('close', onClose);
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      if (d.open) d.close();
      resolve(v);
    };
    const onClose = () => done(false);
    okBtn.onclick = (e) => { e.preventDefault(); done(true); };
    cancelBtn.onclick = () => done(false);
    d.addEventListener('close', onClose);
    d.showModal();
    (danger ? cancelBtn : okBtn).focus();
  });
}

export const tell = (message) => ask(message, { ok: 'OK', cancel: null });
