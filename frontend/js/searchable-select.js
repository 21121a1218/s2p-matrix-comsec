/**
 * SearchableSelect — S2P Matrix
 * Converts a native <select> into a searchable custom dropdown.
 *
 * Usage:
 *   const ss = new SearchableSelect('select-element-id', { placeholder: 'Search...' });
 *   ss.refresh();   // call after adding options to the original <select>
 *   ss.reset();     // call to clear selection (e.g. when modal closes)
 *   ss.getValue();  // returns current selected value (mirrors native select)
 */
class SearchableSelect {
  constructor(selectId, options = {}) {
    this.select      = document.getElementById(selectId);
    if (!this.select) return;
    this.placeholder = options.placeholder || '🔍  Search & select...';
    this.searchPlaceholder = options.searchPlaceholder || 'Type to search...';
    this._build();
    this._bindClose();
  }

  /* ── Build DOM ──────────────────────────────────────── */
  _build() {
    // Wrap original select
    const wrapper = document.createElement('div');
    wrapper.className = 'ss-wrapper';
    this.select.parentNode.insertBefore(wrapper, this.select);
    wrapper.appendChild(this.select);
    this.select.style.display = 'none';

    // Trigger button
    this.trigger = document.createElement('div');
    this.trigger.className = 'ss-trigger';
    this.trigger.setAttribute('tabindex', '0');
    this.trigger.innerHTML = `<span class="ss-trigger-text">${this.placeholder}</span>
      <span class="ss-arrow"><i class="fa fa-chevron-down"></i></span>`;
    wrapper.appendChild(this.trigger);

    // Dropdown panel
    this.panel = document.createElement('div');
    this.panel.className = 'ss-panel';
    this.panel.innerHTML = `
      <div class="ss-search-box">
        <i class="fa fa-search ss-search-icon"></i>
        <input class="ss-search-input" type="text" placeholder="${this.searchPlaceholder}" autocomplete="off"/>
      </div>
      <div class="ss-options-list"></div>`;
    wrapper.appendChild(this.panel);

    this.searchInput = this.panel.querySelector('.ss-search-input');
    this.optionsList = this.panel.querySelector('.ss-options-list');
    this.wrapper     = wrapper;

    this._renderOptions();
    this._bindEvents();
  }

  /* ── Render options from native <select> ────────────── */
  _renderOptions(filter = '') {
    const opts = Array.from(this.select.options);
    const q    = filter.trim().toLowerCase();

    const filtered = opts.filter(o => {
      if (!o.value) return !q; // show placeholder only when no search
      return o.text.toLowerCase().includes(q);
    });

    if (!filtered.length) {
      this.optionsList.innerHTML =
        '<div class="ss-no-results"><i class="fa fa-inbox"></i> No results found</div>';
      return;
    }

    this.optionsList.innerHTML = filtered.map(o => {
      const isPlaceholder = !o.value;
      const selected = o.value === this.select.value ? 'ss-option-selected' : '';
      return `<div class="ss-option ${selected} ${isPlaceholder ? 'ss-option-placeholder' : ''}"
                   data-value="${o.value}">${o.text}</div>`;
    }).join('');

    // Click handlers for options
    this.optionsList.querySelectorAll('.ss-option').forEach(el => {
      el.addEventListener('click', () => {
        const val  = el.dataset.value;
        const text = el.textContent;
        this.select.value = val;
        // Fire native change event so existing code (onchange handlers) still works
        this.select.dispatchEvent(new Event('change', { bubbles: true }));
        this.trigger.querySelector('.ss-trigger-text').textContent =
          val ? text : this.placeholder;
        this.trigger.classList.toggle('ss-has-value', !!val);
        this._close();
      });
    });
  }

  /* ── Bind events ────────────────────────────────────── */
  _bindEvents() {
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = this.panel.classList.contains('ss-open');
      // Close all other open panels first
      document.querySelectorAll('.ss-panel.ss-open').forEach(p => p.classList.remove('ss-open'));
      document.querySelectorAll('.ss-trigger.ss-active').forEach(t => t.classList.remove('ss-active'));
      if (!isOpen) {
        this._open();
      }
    });

    this.trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._open(); }
      if (e.key === 'Escape') this._close();
    });

    this.searchInput.addEventListener('input', () => {
      this._renderOptions(this.searchInput.value);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._close();
    });
  }

  _bindClose() {
    document.addEventListener('click', (e) => {
      if (!this.wrapper.contains(e.target)) this._close();
    });
  }

  _open() {
    this._renderOptions(this.searchInput.value);
    this.panel.classList.add('ss-open');
    this.trigger.classList.add('ss-active');
    setTimeout(() => this.searchInput.focus(), 50);
  }

  _close() {
    this.panel.classList.remove('ss-open');
    this.trigger.classList.remove('ss-active');
    this.searchInput.value = '';
  }

  /* ── Public API ─────────────────────────────────────── */

  /** Call this after dynamically populating the <select> with options */
  refresh() {
    this._renderOptions();
    // Sync displayed text with current select value
    const cur = Array.from(this.select.options).find(o => o.value === this.select.value);
    if (cur && cur.value) {
      this.trigger.querySelector('.ss-trigger-text').textContent = cur.text;
      this.trigger.classList.add('ss-has-value');
    } else {
      this.trigger.querySelector('.ss-trigger-text').textContent = this.placeholder;
      this.trigger.classList.remove('ss-has-value');
    }
  }

  /** Reset the dropdown to its placeholder state */
  reset() {
    this.select.value = '';
    this.trigger.querySelector('.ss-trigger-text').textContent = this.placeholder;
    this.trigger.classList.remove('ss-has-value');
    this.searchInput.value = '';
    this._renderOptions();
  }

  /** Get the current value */
  getValue() {
    return this.select.value;
  }

  /** Programmatically set a value (e.g. for URL-prefill) */
  setValue(val) {
    this.select.value = val;
    this.refresh();
  }
}
