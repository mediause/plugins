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

  function successData(data) {
    return {
      success: true,
      data: data || {}
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
        error: errorResult(
          'civitai.validation.invalid_' + fieldName,
          fieldName + ' must be a positive integer'
        )
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

    if (raw === 'true' || raw === '1' || raw === 'yes') {
      return true;
    }

    if (raw === 'false' || raw === '0' || raw === 'no') {
      return false;
    }

    return fallback;
  }

  function normalizeEnum(value, allowed, fallback) {
    var normalized = normalizeString(value);
    if (!normalized) {
      return fallback;
    }

    for (var i = 0; i < allowed.length; i += 1) {
      if (allowed[i].toLowerCase() === normalized.toLowerCase()) {
        return allowed[i];
      }
    }

    return fallback;
  }

  function normalizeTypes(value) {
    var raw = normalizeString(value);
    if (!raw) {
      return [];
    }

    var parts = raw.split(',');
    var normalized = [];
    for (var i = 0; i < parts.length; i += 1) {
      var item = normalizeString(parts[i]);
      if (item) {
        normalized.push(item);
      }
    }

    return normalized;
  }

  function pickSafeObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return null;
    }
    return obj;
  }

  function safeNumber(value) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return parsed;
  }

  function buildQueryString(query) {
    var params = new URLSearchParams();
    if (!query || typeof query !== 'object') {
      return params.toString();
    }

    for (var key in query) {
      if (!Object.prototype.hasOwnProperty.call(query, key)) {
        continue;
      }

      var value = query[key];
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        }
        continue;
      }

      var asStr = normalizeString(value);
      if (asStr) {
        params.set(key, asStr);
      }
    }

    return params.toString();
  }

  async function fetchJson(path, query) {
    var url = 'https://civitai.com' + path;
    var queryString = buildQueryString(query);
    if (queryString) {
      url += '?' + queryString;
    }

    var response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + path);
    }

    return response.json();
  }

  async function fetchTrpc(procedure, payload) {
    var input = encodeURIComponent(JSON.stringify({ json: payload || {} }));
    var url = 'https://civitai.com/api/trpc/' + procedure + '?input=' + input;

    var response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for trpc ' + procedure);
    }

    var data = await response.json();
    if (!data || !data.result || !data.result.data || !data.result.data.json) {
      throw new Error('Invalid trpc response for ' + procedure);
    }

    return data.result.data.json;
  }

  function mapModelRecord(record, rank) {
    var item = pickSafeObject(record) || {};
    var creator = pickSafeObject(item.creator) || {};
    var stats = pickSafeObject(item.stats) || {};

    return {
      rank: rank,
      id: item.id,
      name: normalizeString(item.name),
      type: normalizeString(item.type),
      nsfw: !!item.nsfw,
      creator: normalizeString(creator.username || creator.name),
      tags: Array.isArray(item.tags) ? item.tags : [],
      downloadCount: safeNumber(stats.downloadCount),
      favoriteCount: safeNumber(stats.favoriteCount),
      ratingCount: safeNumber(stats.ratingCount),
      rating: safeNumber(stats.rating),
      versionCount: Array.isArray(item.modelVersions) ? item.modelVersions.length : 0,
      url: item.id ? 'https://civitai.com/models/' + item.id : ''
    };
  }

  function mapImageRecord(record, rank) {
    var item = pickSafeObject(record) || {};
    var stats = pickSafeObject(item.stats) || {};
    var user = pickSafeObject(item.user) || {};
    var firstModel = Array.isArray(item.modelVersions) && item.modelVersions.length > 0
      ? pickSafeObject(item.modelVersions[0]) || {}
      : {};

    return {
      rank: rank,
      id: item.id,
      url: normalizeString(item.url),
      width: safeNumber(item.width),
      height: safeNumber(item.height),
      nsfwLevel: safeNumber(item.nsfwLevel),
      username: normalizeString(user.username),
      modelId: firstModel.modelId || null,
      modelName: normalizeString(firstModel.modelName),
      postId: item.postId || null,
      likeCount: safeNumber(stats.likeCount),
      heartCount: safeNumber(stats.heartCount),
      commentCount: safeNumber(stats.commentCount),
      cryCount: safeNumber(stats.cryCount),
      laughCount: safeNumber(stats.laughCount)
    };
  }

  window.__mediauseCivitaiHelpers = {
    errorResult: errorResult,
    successItems: successItems,
    successData: successData,
    successAccount: successAccount,
    normalizeString: normalizeString,
    normalizePositiveInt: normalizePositiveInt,
    normalizeBool: normalizeBool,
    normalizeEnum: normalizeEnum,
    normalizeTypes: normalizeTypes,
    fetchJson: fetchJson,
    fetchTrpc: fetchTrpc,
    mapModelRecord: mapModelRecord,
    mapImageRecord: mapImageRecord
  };
})();
