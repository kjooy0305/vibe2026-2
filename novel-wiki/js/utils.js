'use strict';
const Utils = (function() {

  function toast(msg, type = 'info', duration = 2500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  function confirm(title, desc, onConfirm, btnLabel = '삭제') {
    const dialog = document.getElementById('confirmDialog');
    const titleEl = document.getElementById('confirmTitle');
    const descEl = document.getElementById('confirmDesc');
    const okBtn = document.getElementById('btnConfirmOk');
    const cancelBtn = document.getElementById('btnConfirmCancel');
    if (!dialog) return;
    titleEl.textContent = title;
    descEl.textContent = desc || '';
    okBtn.textContent = btnLabel;
    dialog.setAttribute('aria-hidden', 'false');
    dialog.style.display = 'flex';

    const cleanup = () => {
      dialog.setAttribute('aria-hidden', 'true');
      dialog.style.display = 'none';
      okBtn.replaceWith(okBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    };

    const newOk = document.getElementById('btnConfirmOk');
    const newCancel = document.getElementById('btnConfirmCancel');
    newOk.onclick = () => { cleanup(); onConfirm(); };
    newCancel.onclick = cleanup;
  }

  function openModal(title, bodyHTML, onConfirm, confirmLabel = '저장') {
    const overlay = document.getElementById('globalModalOverlay');
    const modal = document.getElementById('globalModal');
    const titleEl = document.getElementById('globalModalTitle');
    const bodyEl = document.getElementById('globalModalBody');
    const footer = document.getElementById('globalModalFooter');
    const closeBtn = document.getElementById('btnCloseModal');
    const confirmBtn = document.getElementById('btnModalConfirm');
    const cancelBtn = document.getElementById('btnModalCancel');

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHTML;

    if (onConfirm) {
      footer.style.display = 'flex';
      confirmBtn.textContent = confirmLabel;
    } else {
      footer.style.display = 'none';
    }

    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');

    const close = () => {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    };

    const newClose = closeBtn.cloneNode(true);
    closeBtn.replaceWith(newClose);
    newClose.onclick = close;

    overlay.onclick = e => { if (e.target === overlay) close(); };

    if (onConfirm) {
      const newConfirm = confirmBtn.cloneNode(true);
      confirmBtn.replaceWith(newConfirm);
      newConfirm.textContent = confirmLabel;
      newConfirm.onclick = () => { if (onConfirm()) close(); };

      const newCancel = cancelBtn.cloneNode(true);
      cancelBtn.replaceWith(newCancel);
      newCancel.onclick = close;
    }

    return { close, body: bodyEl };
  }

  function closeModal() {
    const overlay = document.getElementById('globalModalOverlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function gradeColor(grade) {
    const map = {
      'F': '#9ca3af', 'E': '#22c55e', 'D': '#3b82f6', 'C': '#a855f7',
      'B': '#f59e0b', 'A': '#f97316', 'S': '#ef4444', 'SS': '#ec4899',
      'SSS': '#8b5cf6', 'G': '#06b6d4', 'GG': '#0ea5e9', 'GGG': '#f0abfc',
      'EX': 'linear-gradient(135deg, #fbbf24, #f43f5e)',
    };
    return map[grade] || '#9ca3af';
  }

  function gradeBadge(grade) {
    const color = gradeColor(grade);
    const isGradient = color.startsWith('linear');
    const style = isGradient ? `background:${color}; color:#fff;` : `background:${color}22; color:${color}; border:1px solid ${color}66;`;
    return `<span class="grade-badge" style="${style}">${grade}</span>`;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }

  function nl2br(str) {
    return escHtml(str || '').replace(/\n/g, '<br>');
  }

  function copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast('복사되었습니다', 'success'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('복사되었습니다', 'success');
    }
  }

  function imageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderImage(src, cls = '') {
    if (!src) return '';
    return `<img src="${src}" class="${cls}" style="max-width:100%;border-radius:8px;margin-top:8px;" loading="lazy" />`;
  }

  // Renders a field-value row for detail views
  function fieldRow(label, value) {
    if (!value && value !== 0) return '';
    return `<div class="field-row"><span class="field-label">${escHtml(label)}</span><span class="field-value">${typeof value === 'string' ? nl2br(value) : escHtml(String(value))}</span></div>`;
  }

  // Build text export from an object
  function toTextExport(title, fields) {
    let out = `【${title}】\n${'─'.repeat(20)}\n`;
    fields.forEach(([label, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        out += `${label}: ${val}\n`;
      }
    });
    return out;
  }

  return { toast, confirm, openModal, closeModal, gradeColor, gradeBadge, escHtml, nl2br, formatDate, copyText, imageToBase64, renderImage, fieldRow, toTextExport };
})();
window.Utils = Utils;
