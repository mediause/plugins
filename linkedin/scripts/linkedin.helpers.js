(function () {
  function normalizeString(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function errorResult(code, message, details) {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  function successItems(items) {
    return {
      success: true,
      data: {
        items: Array.isArray(items) ? items : []
      }
    };
  }

  function successObject(data) {
    return {
      success: true,
      data: data || {}
    };
  }

  function normalizePositiveInt(value, fallback, max, fieldName) {
    var raw = normalizeString(value);
    if (!raw) {
      return { ok: true, value: fallback };
    }

    var parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0 || Math.floor(parsed) !== parsed) {
      return {
        ok: false,
        error: errorResult('linkedin.validation.invalid_' + fieldName, fieldName + ' must be a positive integer')
      };
    }

    return { ok: true, value: Math.min(parsed, max) };
  }

  function normalizeMetric(value) {
    var raw = normalizeString(value).toLowerCase().replace(/,/g, '');
    if (!raw) {
      return 0;
    }

    var matched = raw.match(/(\d+(?:\.\d+)?)(k|m)?/i);
    if (!matched) {
      return 0;
    }

    var base = Number(matched[1]);
    var suffix = (matched[2] || '').toLowerCase();
    if (suffix === 'k') {
      return Math.round(base * 1000);
    }
    if (suffix === 'm') {
      return Math.round(base * 1000000);
    }

    return Math.round(base);
  }

  function looksAuthWall() {
    var signal = [window.location.href || '', document.title || '', (document.body && document.body.innerText) || '']
      .join('\n')
      .toLowerCase();

    return /linkedin\.com\/(login|checkpoint|authwall|uas)/i.test(signal)
      || /\b(sign in|log in|join linkedin|captcha|verification required)\b/i.test(signal)
      || /(请登录|登录领英|安全验证)/.test(signal);
  }

  window.__mediauseLinkedinHelpers = {
    normalizeString: normalizeString,
    errorResult: errorResult,
    successItems: successItems,
    successObject: successObject,
    normalizePositiveInt: normalizePositiveInt,
    normalizeMetric: normalizeMetric,
    looksAuthWall: looksAuthWall
  };
})();
