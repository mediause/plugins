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

  function normalizeMetric(value) {
    var raw = normalizeString(value).toLowerCase().replace(/,/g, '');
    if (!raw || raw === 'n/a') {
      return null;
    }

    var match = raw.match(/(\d+(?:\.\d+)?)(?:\s*)([kmb%])?/i);
    if (!match) {
      return null;
    }

    var base = Number(match[1]);
    if (!Number.isFinite(base)) {
      return null;
    }

    var suffix = String(match[2] || '').toLowerCase();
    if (suffix === 'k') {
      return Math.round(base * 1000);
    }
    if (suffix === 'm') {
      return Math.round(base * 1000000);
    }
    if (suffix === 'b') {
      return Math.round(base * 1000000000);
    }

    return Math.round(base);
  }

  window.__mediauseSemrushHelpers = {
    normalizeString: normalizeString,
    errorResult: errorResult,
    successItems: successItems,
    successObject: successObject,
    normalizeMetric: normalizeMetric
  };
})();
