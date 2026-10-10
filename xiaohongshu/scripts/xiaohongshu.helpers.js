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
      data: data || {}
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

  function successAccount(data) {
    return {
      success: true,
      data: {
        healthy: !!(data && data.healthy),
        account: {
          id: data && data.account ? data.account.id : null,
          nick: data && data.account ? data.account.nick : null,
          login: !!(data && data.account && data.account.login)
        }
      }
    };
  }

  function normalizeString(value) {
    return String(value || '').trim();
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
        error: errorResult('xiaohongshu.validation.invalid_' + fieldName, fieldName + ' must be a positive integer')
      };
    }

    return { ok: true, value: Math.min(parsed, max) };
  }

  function normalizeBool(value, fallback) {
    if (typeof value === 'boolean') {
      return value;
    }

    var raw = normalizeString(value).toLowerCase();
    if (!raw) {
      return fallback;
    }

    if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on' || raw === 'y' || raw === 'enabled') {
      return true;
    }

    if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off' || raw === 'n' || raw === 'disabled') {
      return false;
    }

    return fallback;
  }

  function firstArray(value) {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }

  function pickObject(value) {
    if (!value || typeof value !== 'object') {
      return {};
    }
    return value;
  }

  function pickFirstArray(root, keys) {
    var source = pickObject(root);
    for (var i = 0; i < keys.length; i += 1) {
      var data = source[keys[i]];
      if (Array.isArray(data)) {
        return data;
      }
    }
    return [];
  }

  function pick(root, keys, fallback) {
    var source = pickObject(root);
    for (var i = 0; i < keys.length; i += 1) {
      if (source[keys[i]] !== undefined && source[keys[i]] !== null) {
        return source[keys[i]];
      }
    }
    return fallback;
  }

  window.__mediauseXiaohongshuHelpers = {
    errorResult: errorResult,
    successData: successData,
    successItems: successItems,
    successAccount: successAccount,
    normalizeString: normalizeString,
    normalizePositiveInt: normalizePositiveInt,
    normalizeBool: normalizeBool,
    firstArray: firstArray,
    pickObject: pickObject,
    pickFirstArray: pickFirstArray,
    pick: pick
  };
})();
