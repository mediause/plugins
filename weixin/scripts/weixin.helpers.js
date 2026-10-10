(function () {
  function ok(data) {
    return {
      success: true,
      data: data
    };
  }

  function fail(code, message, details) {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function toPositiveInt(value, fallback, maxValue) {
    var n = Number(value);
    if (!Number.isFinite(n) || n < 1) {
      return fallback;
    }
    n = Math.floor(n);
    if (typeof maxValue === 'number' && n > maxValue) {
      return maxValue;
    }
    return n;
  }

  function absoluteUrl(href) {
    if (!href) {
      return '';
    }
    try {
      return new URL(href, window.location.origin).toString();
    } catch (_) {
      return String(href);
    }
  }

  function readTokenFromUrl() {
    var match = String(window.location.href || '').match(/[?&]token=(\d+)/);
    return match ? match[1] : '';
  }

  window.__mediauseWeixinHelpers = {
    ok: ok,
    fail: fail,
    normalizeText: normalizeText,
    toPositiveInt: toPositiveInt,
    absoluteUrl: absoluteUrl,
    readTokenFromUrl: readTokenFromUrl
  };
})();
