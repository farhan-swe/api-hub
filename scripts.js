
const API_JSON = 'apis.json';

document.addEventListener('DOMContentLoaded', () => {
  const cardsEl = document.getElementById('cards');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const authFilter = document.getElementById('authFilter');
  const randomBtn = document.getElementById('randomBtn');
  const themeToggle = document.getElementById('themeToggle');
  const emptyEl = document.getElementById('empty');
  const cardTpl = document.getElementById('cardTpl');

  if (!cardsEl || !cardTpl) {
    console.error('Required DOM elements missing: #cards or #cardTpl not found.');
    return;
  }

  let apis = [];

  async function loadApis() {
    try {
      const res = await fetch(API_JSON, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Failed to fetch ${API_JSON}: ${res.status} ${res.statusText}`);
      apis = await res.json();

      if (!Array.isArray(apis)) {
        throw new Error('apis.json must contain a top-level JSON array.');
      }

      buildCategoryOptions(apis);
      render(apis);
    } catch (err) {
      console.error(err);
      cardsEl.innerHTML = `<p style="color:#f66">Could not load <code>${API_JSON}</code>: ${escapeHtml(err.message)}</p>`;
      if (emptyEl) emptyEl.hidden = false;
    }
  }

  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  function buildCategoryOptions(list = []) {
    if (!categoryFilter) return;
    const cats = Array.from(new Set(list.map(a => (a.category || 'Uncategorized').trim())));
    cats.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    
    const firstVal = categoryFilter.options.length ? categoryFilter.options[0].value : null;
    categoryFilter.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = 'all';
    defaultOpt.textContent = 'All categories';
    categoryFilter.appendChild(defaultOpt);
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categoryFilter.appendChild(opt);
    });
  }

  function render(list = []) {
    cardsEl.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    } else {
      if (emptyEl) emptyEl.hidden = true;
    }

    const fragment = document.createDocumentFragment();
    list.forEach(api => {
      try {
        const node = cardTpl.content.cloneNode(true);
        const nameEl = node.querySelector('.api-name');
        const descEl = node.querySelector('.api-desc');
        const categoryEl = node.querySelector('.category');
        const authEl = node.querySelector('.auth');
        const corsEl = node.querySelector('.cors');
        const tagsRow = node.querySelector('.tags-row');
        const openBtn = node.querySelector('.openBtn');
        const copyBtn = node.querySelector('.copyBtn');

       
        const name = api.name || 'Untitled API';
        const description = api.description || '';
        const category = api.category || 'Uncategorized';
        const auth = api.auth || 'None';
        const cors = api.cors || 'unknown';
        const url = api.link || api.url || '#';
        const tags = Array.isArray(api.tags) ? api.tags : [];

        if (nameEl) nameEl.textContent = name;
        if (descEl) descEl.textContent = description;
        if (categoryEl) categoryEl.textContent = category;
        if (authEl) authEl.textContent = auth;
        if (corsEl) corsEl.textContent = 'CORS: ' + cors;

        if (Array.isArray(tags) && tagsRow) {
          tagsRow.innerHTML = '';
          tags.slice(0, 8).forEach(t => {
            const s = document.createElement('span');
            s.className = 'tag';
            s.textContent = t;
            tagsRow.appendChild(s);
          });
        }

        
        if (openBtn) {
          openBtn.addEventListener('click', () => {
            try {
              const okUrl = (typeof url === 'string' && url) ? url : '#';
              window.open(okUrl, '_blank', 'noopener,noreferrer');
            } catch (e) {
              console.error('Open failed', e);
            }
          });
        }

        
        if (copyBtn) {
          copyBtn.addEventListener('click', async () => {
            const toCopy = (typeof url === 'string') ? url : '';
            if (!toCopy) {
              copyBtn.textContent = 'No URL';
              setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
              return;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
              try {
                await navigator.clipboard.writeText(toCopy);
                copyBtn.textContent = 'Copied';
                setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
              } catch (err) {
                // fallback
                fallbackCopyText(toCopy, copyBtn);
              }
            } else {
              fallbackCopyText(toCopy, copyBtn);
            }
          });
        }

        fragment.appendChild(node);
      } catch (e) {
        console.error('Failed to render one API card', e);
      }
    });
    cardsEl.appendChild(fragment);
  }

 
  function fallbackCopyText(text, btn) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        if (btn) {
          btn.textContent = 'Copied';
          setTimeout(() => (btn.textContent = 'Copy'), 1200);
        }
      } else {
        alert('Copy not supported in this browser. URL: ' + text);
      }
    } catch (e) {
      alert('Copy failed. URL: ' + text);
    }
  }

 
  function filterAndSearch() {
    if (!Array.isArray(apis)) return render([]);
    const q = (searchInput && searchInput.value) ? searchInput.value.toLowerCase().trim() : '';
    const cat = (categoryFilter && categoryFilter.value) ? categoryFilter.value : 'all';
    const authSel = (authFilter && authFilter.value) ? authFilter.value : 'all';

    const out = apis.filter(a => {
      
      const aCategory = (a.category || 'Uncategorized').toString();
      if (cat !== 'all' && aCategory !== cat) return false;

      
      if (authSel !== 'all') {
        const aAuth = (a.auth || '').toString().toLowerCase();
        if (authSel === 'none' && aAuth && aAuth !== 'none') return false;
        if (authSel === 'apiKey' && !/api[-_ ]?key/i.test(a.auth || '')) return false;
        if (authSel === 'oauth' && !/oauth/i.test(a.auth || '')) return false;
      }

      
      if (!q) return true;
      const hay = [
        a.name || '',
        a.description || '',
        a.category || '',
        (Array.isArray(a.tags) ? a.tags.join(' ') : ''),
        a.auth || '',
        a.link || a.url || ''
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });

    render(out);
  }

  
  if (searchInput) searchInput.addEventListener('input', throttle(filterAndSearch, 150));
  if (categoryFilter) categoryFilter.addEventListener('change', filterAndSearch);
  if (authFilter) authFilter.addEventListener('change', filterAndSearch);
  if (randomBtn) randomBtn.addEventListener('click', () => {
    if (!Array.isArray(apis) || apis.length === 0) return;
    const idx = Math.floor(Math.random() * apis.length);
    const a = apis[idx];
    const url = a?.link || a?.url || '';
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  });
  if (themeToggle) themeToggle.addEventListener('click', () => document.body.classList.toggle('light-theme'));

  
  function throttle(fn, wait = 100) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        return fn.apply(this, args);
      }
    };
  }

  
  loadApis();
});
