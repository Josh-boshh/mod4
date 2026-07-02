/* =============================================================================
 *  MINISTRY OF DEFENCE — Azure Translator integration
 *  Replaces Google Translate widget. Uses Microsoft Azure Translator API.
 *  Hooks into the existing .lang-select dropdown in the site header.
 * ============================================================================= */
(function (window, document) {
  "use strict";

  // Read key and region from MOD_CONFIG (set in config.js)
  const AZURE_KEY    = (window.MOD_CONFIG && window.MOD_CONFIG.AZURE_TRANSLATE_KEY)    || '';
  const AZURE_REGION = (window.MOD_CONFIG && window.MOD_CONFIG.AZURE_TRANSLATE_REGION) || 'westeurope';
  const STORAGE_KEY  = 'mod-lang';
  const ENDPOINT     = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';
  const PROXY_ENDPOINTS = ['/api/translate.php', '/api/translate'];
  const SUPPORTED    = ['en', 'ha', 'ig', 'yo', 'fr', 'es', 'zh-Hans'];

  let originalNodes  = [];
  let isTranslated   = false;
  let currentLang    = 'en';

  // ── 1. Collect all visible text nodes in the page ──────────────────────────
  function getTextNodes(root) {
    const skip = ['SCRIPT','STYLE','NOSCRIPT','IFRAME','CODE','PRE','META','LINK'];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (skip.includes(node.parentElement?.tagName)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('.lang-select-wrap, [data-i18n-skip]')) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim())                     return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  // ── 2. Translate the whole page ────────────────────────────────────────────
  async function translatePage(lang) {
    if (!lang || lang === 'en') { restorePage(); return; }

    // If already translated, restore first before re-translating
    if (isTranslated) restorePage();

    indicateBusy(true);

    const nodes = getTextNodes(document.body);
    originalNodes = nodes.map(n => ({ node: n, text: n.nodeValue }));

    const texts = originalNodes.map(n => ({ Text: n.text.trim() }));

    // Azure has a 100-element limit per request — chunk if needed
    const CHUNK = 100;
    const allTranslated = [];

    try {
      for (let i = 0; i < texts.length; i += CHUNK) {
        const chunk = texts.slice(i, i + CHUNK);
        allTranslated.push(...await translateChunk(chunk, lang));
      }

      allTranslated.forEach((item, i) => {
        originalNodes[i].node.nodeValue = item.translations[0].text;
      });

      isTranslated = true;
      currentLang  = lang;
      localStorage.setItem(STORAGE_KEY, lang);

    } catch (err) {
      console.error('[MOD_TRANSLATE] Azure error:', err);
      restorePage();
      // Show inline error banner instead of alert()
      const banner = document.createElement('div');
      banner.setAttribute('role', 'alert');
      banner.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#c0392b;color:#fff;padding:10px 20px;border-radius:6px;font-size:.85rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2);';
      banner.textContent = 'Translation is currently unavailable. Please try again later.';
      document.body.appendChild(banner);
      setTimeout(function(){ banner.remove(); }, 4000);
    }

    indicateBusy(false);
  }

  async function translateChunk(chunk, lang) {
    const payload = JSON.stringify(chunk);
    const proxyErrors = [];

    for (const endpoint of PROXY_ENDPOINTS) {
      try {
        const res = await fetch(`${endpoint}?to=${encodeURIComponent(lang)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid translation payload');
        return data;
      } catch (err) {
        proxyErrors.push(err);
      }
    }

    if (!AZURE_KEY) {
      throw proxyErrors[proxyErrors.length - 1] || new Error('Translation backend unavailable.');
    }

    const res = await fetch(`${ENDPOINT}&to=${encodeURIComponent(lang)}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Ocp-Apim-Subscription-Region': AZURE_REGION,
        'Content-Type': 'application/json'
      },
      body: payload
    });

    if (!res.ok) {
      const details = await res.text();
      throw new Error(`Azure HTTP ${res.status}: ${details}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Unexpected Azure response.');
    }
    return data;
  }

  // ── 3. Restore original English text ──────────────────────────────────────
  function restorePage() {
    originalNodes.forEach(({ node, text }) => { node.nodeValue = text; });
    originalNodes = [];
    isTranslated  = false;
    currentLang   = 'en';
    localStorage.setItem(STORAGE_KEY, 'en');
    syncDropdown();
    indicateBusy(false);
  }

  // ── 4. Wire the existing .lang-select dropdown ─────────────────────────────
   function wireDropdown() {
    const sel = document.querySelector('.lang-select');
    if (!sel || sel.__azBound) return;
    sel.__azBound = true;

    // Populate options from MOD_CONFIG.LANGUAGES (defined in config.js)
    if (window.MOD_CONFIG && window.MOD_CONFIG.LANGUAGES) {
      sel.innerHTML = '';
      Object.entries(window.MOD_CONFIG.LANGUAGES).forEach(([code, label]) => {
        const o = document.createElement('option');
        o.value = code;
        o.textContent = label;
        sel.appendChild(o);
      });
    }

    syncDropdown();

    sel.addEventListener('change', function () {
      translatePage(sel.value);
    });
  }

  function syncDropdown() {
    const sel = document.querySelector('.lang-select');
    if (!sel) return;
    const saved = localStorage.getItem(STORAGE_KEY) || 'en';
    if (Array.from(sel.options).some(o => o.value === saved)) sel.value = saved;
  }

  function indicateBusy(b) {
    const ind = document.querySelector('.lang-status');
    if (!ind) return;
    ind.classList.toggle('busy', b);
    ind.textContent = b ? 'Translating…' : '';
  }

  // ── 5. Auto-apply saved language on page load ──────────────────────────────
  function boot() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'en';

    const attempt = () => {
      wireDropdown();
      if (!document.querySelector('.lang-select')) {
        setTimeout(attempt, 200);
      } else if (saved !== 'en') {
        syncDropdown();
        translatePage(saved);
      }
    };
    attempt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ── 6. Public API (used by chatbot and other scripts) ─────────────────────
  window.MOD_TRANSLATE = {
    set:       translatePage,
    restore:   restorePage,
    current:   () => currentLang,
    supported: SUPPORTED.slice(),
  };

})(window, document);