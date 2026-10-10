(function () {
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

  function sanitizeLimit(value, fallback, max) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      n = fallback;
    }
    n = Math.floor(n);
    if (Number.isFinite(max) && max > 0 && n > max) {
      n = max;
    }
    return n;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function normalizeUsername(raw) {
    var value = String(raw || '').trim();
    if (!value) return '';
    if (value.indexOf('@') === 0) {
      return value.slice(1);
    }
    return value;
  }

  function isTruthy(value) {
    if (typeof value === 'boolean') return value;
    var text = String(value || '').trim().toLowerCase();
    return text === 'true' || text === '1' || text === 'yes' || text === 'y';
  }

  function compactText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function findButtonByText(candidates) {
    var buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (var i = 0; i < buttons.length; i += 1) {
      var text = compactText(buttons[i].textContent);
      for (var j = 0; j < candidates.length; j += 1) {
        if (text === candidates[j]) {
          return buttons[i];
        }
      }
    }
    return null;
  }

  function normalizeCounter(value) {
    var text = compactText(value);
    if (!text) return '0';
    return text;
  }

  function parseUniversalData(html) {
    var marker = '__UNIVERSAL_DATA_FOR_REHYDRATION__';
    var idx = html.indexOf(marker);
    if (idx < 0) {
      throw new Error('Could not parse profile data');
    }
    var start = html.indexOf('>', idx);
    if (start < 0) {
      throw new Error('Malformed profile hydration tag');
    }
    start += 1;
    var end = html.indexOf('</script>', start);
    if (end < 0) {
      throw new Error('Malformed profile hydration body');
    }
    return JSON.parse(html.substring(start, end));
  }

  function parseSafeJson(text) {
    try {
      return JSON.parse(text);
    } catch (_error) {
      return null;
    }
  }

  function numberOrZero(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeCursor(value) {
    var text = String(value == null ? '0' : value).trim();
    if (!/^\d+$/.test(text)) {
      throw new Error('cursor must be a non-negative integer string');
    }
    return text;
  }

  window.__mediauseTiktokHelpers = {
    errorResult: errorResult,
    successItems: successItems,
    sanitizeLimit: sanitizeLimit,
    wait: wait,
    normalizeUsername: normalizeUsername,
    isTruthy: isTruthy,
    compactText: compactText,
    findButtonByText: findButtonByText,
    normalizeCounter: normalizeCounter,
    parseUniversalData: parseUniversalData,
    parseSafeJson: parseSafeJson,
    numberOrZero: numberOrZero,
    normalizeCursor: normalizeCursor
  };
})();
