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

  function successData(data) {
    return {
      success: true,
      data: data
    };
  }

  function asString(value) {
    return String(value || '').trim();
  }

  function normalizeLimit(value, defaultValue, maxValue) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      return defaultValue;
    }
    var intValue = Math.floor(n);
    return intValue > maxValue ? maxValue : intValue;
  }

  function toAbsoluteUrl(href) {
    var v = asString(href);
    if (!v) {
      return '';
    }

    if (/^https?:\/\//i.test(v)) {
      return v;
    }

    if (v.charAt(0) === '/') {
      return 'https://fbref.com' + v;
    }

    return 'https://fbref.com/' + v;
  }

  function playerIdFromUrl(url) {
    var v = asString(url);
    var match = v.match(/\/players\/([^\/]+)\//i);
    return match ? match[1] : '';
  }

  function readCell(row, dataStat) {
    var el = row.querySelector("td[data-stat='" + dataStat + "']");
    return asString(el ? el.textContent : '');
  }

  window.__mediauseFifa2026Helpers = {
    asString: asString,
    errorResult: errorResult,
    normalizeLimit: normalizeLimit,
    playerIdFromUrl: playerIdFromUrl,
    readCell: readCell,
    successData: successData,
    toAbsoluteUrl: toAbsoluteUrl
  };
})();
