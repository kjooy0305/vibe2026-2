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
    dialog.classList.add('open');

    const cleanup = () => {
      dialog.setAttribute('aria-hidden', 'true');
      dialog.style.display = 'none';
      dialog.classList.remove('open');
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
    addFieldToggles(bodyEl);

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
      newConfirm.onclick = async () => { const r = await onConfirm(); if (r !== false) close(); };

      const newCancel = cancelBtn.cloneNode(true);
      cancelBtn.replaceWith(newCancel);
      newCancel.onclick = close;
    }

    return { close, body: bodyEl };
  }

  // Confirm with text input (for destructive delete operations)
  function confirmWithInput(title, desc, requiredText, onConfirm, btnLabel = '삭제') {
    const body = `
      <div style="text-align:center;padding:8px 0;">
        <div style="font-size:38px;margin-bottom:10px;">⚠️</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:8px;">${escHtml(title)}</div>
        <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:16px;line-height:1.6;">${escHtml(desc)}</div>
        <div style="font-size:12px;color:var(--color-warning);margin-bottom:6px;">아래에 <strong style="color:var(--color-danger);">"${escHtml(requiredText)}"</strong> 를 입력하세요</div>
        <input class="input-field" id="confirmInputField" placeholder="${escHtml(requiredText)}" style="width:100%;box-sizing:border-box;text-align:center;" />
      </div>`;
    openModal(title, body, () => {
      const val = document.getElementById('confirmInputField')?.value.trim();
      if (val !== requiredText) {
        toast('입력이 일치하지 않습니다', 'error');
        return false;
      }
      onConfirm();
      return true;
    }, btnLabel);
    setTimeout(() => {
      document.getElementById('confirmInputField')?.focus();
    }, 100);
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
    if (window.AppFlags && !window.AppFlags.get('gradeColors', true)) {
      return `<span class="grade-badge" style="background:var(--color-surface2);color:var(--color-text-muted);border:1px solid var(--color-border);">${grade}</span>`;
    }
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

  // Supports space-separated AND terms and -keyword exclusion
  function matchesQuery(text, query) {
    if (!query || !query.trim()) return true;
    const t = (text || '').toLowerCase();
    return query.toLowerCase().split(/\s+/).filter(Boolean).every(term => {
      if (term.startsWith('-') && term.length > 1) return !t.includes(term.slice(1));
      return t.includes(term);
    });
  }

  function addFieldToggles(root) {
    (root || document).querySelectorAll('label.form-label').forEach(label => {
      if (label.querySelector('.field-toggle-btn')) return;
      const ta = label.nextElementSibling;
      if (!ta || ta.tagName !== 'TEXTAREA') return;

      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.justifyContent = 'space-between';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'field-toggle-btn';
      btn.textContent = '접기';
      btn.style.cssText = [
        'font-size:10px', 'padding:1px 8px', 'border-radius:10px',
        'border:1px solid var(--color-border)', 'background:transparent',
        'color:var(--color-text-muted)', 'cursor:pointer', 'flex-shrink:0',
        'line-height:1.6', 'transition:color .15s,border-color .15s',
      ].join(';');

      let collapsed = false;
      btn.addEventListener('click', () => {
        collapsed = !collapsed;
        ta.style.display = collapsed ? 'none' : '';
        btn.textContent = collapsed ? '펼치기' : '접기';
        btn.style.color = collapsed ? 'var(--color-primary)' : 'var(--color-text-muted)';
        btn.style.borderColor = collapsed ? 'var(--color-primary)' : 'var(--color-border)';
      });

      label.appendChild(btn);
    });
  }

  function autoResizeTextareas(root) {
    (root || document).querySelectorAll('textarea').forEach(ta => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 500) + 'px';
    });
  }

  // Highlight one or more required fields in red; scroll to first empty one.
  // Pass element IDs. Returns true if ALL are filled, false if any empty.
  function fieldError(...ids) {
    let firstEmpty = null;
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const empty = !(el.value || '').trim();
      if (empty) {
        el.style.setProperty('border-color', 'var(--color-danger)', 'important');
        el.style.setProperty('box-shadow', '0 0 0 3px rgba(239,68,68,0.25)', 'important');
        if (!firstEmpty) firstEmpty = el;
        const clear = () => {
          el.style.removeProperty('border-color');
          el.style.removeProperty('box-shadow');
          el.removeEventListener('input', clear);
          el.removeEventListener('change', clear);
        };
        el.addEventListener('input', clear);
        el.addEventListener('change', clear);
      }
    });
    if (firstEmpty) {
      firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstEmpty.focus();
    }
    return !firstEmpty;
  }

  return { toast, confirm, confirmWithInput, openModal, closeModal, gradeColor, gradeBadge, escHtml, nl2br, formatDate, copyText, imageToBase64, renderImage, fieldRow, toTextExport, matchesQuery, autoResizeTextareas, addFieldToggles, fieldError };
})();
window.Utils = Utils;

// AppFlags — synchronous feature-flag cache backed by localStorage.
// Settings page writes flags here; utils/pages read synchronously without async overhead.
window.AppFlags = (function () {
  let data = {};
  try { data = JSON.parse(localStorage.getItem('appFlags') || '{}'); } catch (_) {}
  return {
    _data: data,
    get: function (key, def) {
      return this._data[key] !== undefined ? this._data[key] : def;
    },
    set: function (key, value) {
      this._data[key] = value;
      try { localStorage.setItem('appFlags', JSON.stringify(this._data)); } catch (_) {}
    },
    getAll: function () { return Object.assign({}, this._data); },
  };
})();
