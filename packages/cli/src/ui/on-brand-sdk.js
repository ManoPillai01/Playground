/**
 * On Brand JavaScript SDK
 *
 * A lightweight client for the brand consistency checker API.
 * Works in both browser and Node.js environments.
 *
 * @example Browser usage:
 * ```html
 * <script src="on-brand-sdk.js"></script>
 * <script>
 *   const client = new OnBrandClient('http://localhost:3000');
 *   client.check('Your content here').then(result => {
 *     console.log(result.statusDisplay);
 *   });
 * </script>
 * ```
 *
 * @example Node.js usage:
 * ```javascript
 * import { OnBrandClient } from './on-brand-sdk.js';
 * const client = new OnBrandClient('http://localhost:3000');
 * const result = await client.check('Your content here');
 * ```
 */

// UMD wrapper for browser/Node.js compatibility
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js
    module.exports = factory();
  } else {
    // Browser global
    root.OnBrandClient = factory().OnBrandClient;
    root.OnBrandWidget = factory().OnBrandWidget;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  /**
   * Brand check status types
   */
  const STATUS = {
    ON_BRAND: 'on-brand',
    BORDERLINE: 'borderline',
    OFF_BRAND: 'off-brand',
  };

  /**
   * Content type options
   */
  const CONTENT_TYPES = [
    'ad-copy',
    'social-post',
    'influencer-script',
    'press-release',
    'campaign-name',
    'ai-generated',
    'email',
    'website',
    'other',
  ];

  /**
   * OnBrandClient - API client for brand consistency checks
   */
  class OnBrandClient {
    /**
     * Create a new OnBrand API client
     * @param {string} baseUrl - The API server URL (e.g., 'http://localhost:3000')
     * @param {Object} options - Configuration options
     * @param {number} options.timeout - Request timeout in ms (default: 5000)
     * @param {Object} options.headers - Additional headers to send
     */
    constructor(baseUrl, options = {}) {
      this.baseUrl = baseUrl.replace(/\/$/, '');
      this.timeout = options.timeout || 5000;
      this.headers = options.headers || {};
    }

    /**
     * Check content for brand consistency
     * @param {string} content - The content to check
     * @param {Object} options - Check options
     * @param {string} options.contentType - Type of content (ad-copy, social-post, etc.)
     * @param {Object} options.metadata - Additional metadata
     * @returns {Promise<BrandCheckResponse>}
     */
    async check(content, options = {}) {
      const body = {
        content,
        ...(options.contentType && { contentType: options.contentType }),
        ...(options.metadata && { metadata: options.metadata }),
      };

      const response = await this._fetch('/on-brand/check', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return response;
    }

    /**
     * Check API health
     * @returns {Promise<{status: string, profile: {name: string, version: string}}>}
     */
    async health() {
      return this._fetch('/health', { method: 'GET' });
    }

    /**
     * Internal fetch wrapper with timeout and error handling
     */
    async _fetch(path, options) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...this.headers,
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          const error = new Error(data.message || data.error || 'Request failed');
          error.status = response.status;
          error.data = data;
          throw error;
        }

        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    }
  }

  /**
   * OnBrandWidget - Embeddable UI widget for brand checking
   *
   * Creates a floating widget or inline form for checking content.
   */
  class OnBrandWidget {
    /**
     * Create an OnBrand widget
     * @param {string|HTMLElement} container - CSS selector or element to mount widget
     * @param {Object} options - Widget options
     * @param {string} options.apiUrl - API server URL
     * @param {string} options.mode - 'inline' or 'floating' (default: 'inline')
     * @param {string} options.theme - 'light' or 'dark' (default: 'light')
     * @param {Function} options.onResult - Callback when result is received
     * @param {Function} options.onError - Callback when error occurs
     */
    constructor(container, options = {}) {
      this.container = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!this.container) {
        throw new Error('Container element not found');
      }

      this.options = {
        apiUrl: options.apiUrl || 'http://localhost:3000',
        mode: options.mode || 'inline',
        theme: options.theme || 'light',
        onResult: options.onResult || (() => {}),
        onError: options.onError || console.error,
        placeholder: options.placeholder || 'Paste your content here to check brand alignment...',
        buttonText: options.buttonText || 'Check Brand',
      };

      this.client = new OnBrandClient(this.options.apiUrl);
      this.render();
    }

    /**
     * Render the widget
     */
    render() {
      const isDark = this.options.theme === 'dark';

      this.container.innerHTML = `
        <div class="onbrand-widget ${isDark ? 'onbrand-dark' : 'onbrand-light'}">
          <style>
            .onbrand-widget {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 0 auto;
            }
            .onbrand-widget * {
              box-sizing: border-box;
            }
            .onbrand-light {
              --bg: #ffffff;
              --border: #e0e0e0;
              --text: #333333;
              --text-secondary: #666666;
              --accent: #2563eb;
              --success: #16a34a;
              --warning: #d97706;
              --error: #dc2626;
            }
            .onbrand-dark {
              --bg: #1f2937;
              --border: #374151;
              --text: #f3f4f6;
              --text-secondary: #9ca3af;
              --accent: #3b82f6;
              --success: #22c55e;
              --warning: #f59e0b;
              --error: #ef4444;
            }
            .onbrand-textarea {
              width: 100%;
              min-height: 150px;
              padding: 12px;
              border: 2px solid var(--border);
              border-radius: 8px;
              font-size: 14px;
              line-height: 1.5;
              resize: vertical;
              background: var(--bg);
              color: var(--text);
              transition: border-color 0.2s;
            }
            .onbrand-textarea:focus {
              outline: none;
              border-color: var(--accent);
            }
            .onbrand-controls {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 12px;
              gap: 12px;
            }
            .onbrand-select {
              padding: 8px 12px;
              border: 1px solid var(--border);
              border-radius: 6px;
              font-size: 14px;
              background: var(--bg);
              color: var(--text);
            }
            .onbrand-button {
              padding: 10px 24px;
              background: var(--accent);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: opacity 0.2s;
            }
            .onbrand-button:hover {
              opacity: 0.9;
            }
            .onbrand-button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            .onbrand-result {
              margin-top: 16px;
              padding: 16px;
              border-radius: 8px;
              display: none;
            }
            .onbrand-result.visible {
              display: block;
            }
            .onbrand-result.on-brand {
              background: color-mix(in srgb, var(--success) 10%, var(--bg));
              border: 1px solid var(--success);
            }
            .onbrand-result.borderline {
              background: color-mix(in srgb, var(--warning) 10%, var(--bg));
              border: 1px solid var(--warning);
            }
            .onbrand-result.off-brand {
              background: color-mix(in srgb, var(--error) 10%, var(--bg));
              border: 1px solid var(--error);
            }
            .onbrand-status {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 12px;
              color: var(--text);
            }
            .onbrand-explanations {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .onbrand-explanations li {
              padding: 4px 0;
              color: var(--text-secondary);
              font-size: 14px;
            }
            .onbrand-confidence {
              margin-top: 12px;
              font-size: 12px;
              color: var(--text-secondary);
            }
            .onbrand-loading {
              display: none;
              align-items: center;
              gap: 8px;
              color: var(--text-secondary);
            }
            .onbrand-loading.visible {
              display: flex;
            }
            .onbrand-spinner {
              width: 16px;
              height: 16px;
              border: 2px solid var(--border);
              border-top-color: var(--accent);
              border-radius: 50%;
              animation: onbrand-spin 0.8s linear infinite;
            }
            @keyframes onbrand-spin {
              to { transform: rotate(360deg); }
            }
          </style>

          <textarea
            class="onbrand-textarea"
            placeholder="${this.options.placeholder}"
          ></textarea>

          <div class="onbrand-controls">
            <select class="onbrand-select">
              <option value="">Content type (optional)</option>
              ${CONTENT_TYPES.map(t => `<option value="${t}">${t.replace('-', ' ')}</option>`).join('')}
            </select>
            <button class="onbrand-button">${this.options.buttonText}</button>
          </div>

          <div class="onbrand-loading">
            <div class="onbrand-spinner"></div>
            <span>Checking brand alignment...</span>
          </div>

          <div class="onbrand-result">
            <div class="onbrand-status"></div>
            <ul class="onbrand-explanations"></ul>
            <div class="onbrand-confidence"></div>
          </div>
        </div>
      `;

      this._bindEvents();
    }

    /**
     * Bind event handlers
     */
    _bindEvents() {
      const button = this.container.querySelector('.onbrand-button');
      const textarea = this.container.querySelector('.onbrand-textarea');

      button.addEventListener('click', () => this.check());

      // Keyboard shortcut: Ctrl/Cmd + Enter
      textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.check();
        }
      });
    }

    /**
     * Perform brand check
     */
    async check() {
      const textarea = this.container.querySelector('.onbrand-textarea');
      const select = this.container.querySelector('.onbrand-select');
      const button = this.container.querySelector('.onbrand-button');
      const loading = this.container.querySelector('.onbrand-loading');
      const result = this.container.querySelector('.onbrand-result');

      const content = textarea.value.trim();
      if (!content) {
        return;
      }

      // Show loading state
      button.disabled = true;
      loading.classList.add('visible');
      result.classList.remove('visible');

      try {
        const response = await this.client.check(content, {
          contentType: select.value || undefined,
        });

        this._showResult(response);
        this.options.onResult(response);
      } catch (error) {
        this.options.onError(error);
        this._showError(error);
      } finally {
        button.disabled = false;
        loading.classList.remove('visible');
      }
    }

    /**
     * Display the result
     */
    _showResult(response) {
      const result = this.container.querySelector('.onbrand-result');
      const status = this.container.querySelector('.onbrand-status');
      const explanations = this.container.querySelector('.onbrand-explanations');
      const confidence = this.container.querySelector('.onbrand-confidence');

      // Update classes
      result.className = 'onbrand-result visible ' + response.status;

      // Update content
      status.textContent = response.statusDisplay;
      explanations.innerHTML = response.explanations
        .map(e => {
          const icon = e.severity === 'critical' ? '❌'
            : e.severity === 'warning' ? '⚠️' : 'ℹ️';
          return `<li>${icon} ${e.text}</li>`;
        })
        .join('');

      if (response.confidence !== undefined) {
        confidence.textContent = `Confidence: ${response.confidence}%`;
      }
    }

    /**
     * Display an error
     */
    _showError(error) {
      const result = this.container.querySelector('.onbrand-result');
      const status = this.container.querySelector('.onbrand-status');
      const explanations = this.container.querySelector('.onbrand-explanations');
      const confidence = this.container.querySelector('.onbrand-confidence');

      result.className = 'onbrand-result visible off-brand';
      status.textContent = 'Error ❌';
      explanations.innerHTML = `<li>❌ ${error.message}</li>`;
      confidence.textContent = '';
    }

    /**
     * Set content programmatically
     */
    setContent(content) {
      const textarea = this.container.querySelector('.onbrand-textarea');
      textarea.value = content;
    }

    /**
     * Get current content
     */
    getContent() {
      const textarea = this.container.querySelector('.onbrand-textarea');
      return textarea.value;
    }

    /**
     * Destroy the widget
     */
    destroy() {
      this.container.innerHTML = '';
    }
  }

  // Export
  return {
    OnBrandClient,
    OnBrandWidget,
    STATUS,
    CONTENT_TYPES,
  };

}));
