(function () {
  var SORT_OPTIONS = ['downloads', 'likes', 'trending', 'created_at', 'last_modified'];
  var SPACE_SORT_OPTIONS = ['likes', 'created_at', 'last_modified'];
  var SORT_ALIAS = {
    lastmodified: 'last_modified',
    createdat: 'created_at'
  };
  var ARXIV_ID_PATTERN = /^\d{4}\.\d{4,5}(?:v\d+)?$/;

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
      data: data || {
        healthy: true,
        account: {
          id: 'guest',
          nick: 'guest',
          login: false
        }
      }
    };
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

  function normalizeString(value) {
    return String(value || '').trim();
  }

  function normalizeBool(value, fallback) {
    if (typeof value === 'boolean') {
      return value;
    }
    var raw = String(value || '').trim().toLowerCase();
    if (raw === 'true' || raw === '1') {
      return true;
    }
    if (raw === 'false' || raw === '0') {
      return false;
    }
    return !!fallback;
  }

  function normalizeLimit(value, fallbackValue, maxValue) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || Math.floor(parsed) !== parsed) {
      parsed = fallbackValue;
    }
    if (parsed > maxValue) {
      parsed = maxValue;
    }
    if (parsed < 1) {
      parsed = 1;
    }
    return parsed;
  }

  function normalizeSort(value, allowed, fallbackValue) {
    var raw = normalizeString(value).toLowerCase();
    if (!raw) {
      return fallbackValue;
    }
    var normalized = SORT_ALIAS[raw] || raw;
    if (allowed.indexOf(normalized) < 0) {
      return fallbackValue;
    }
    return normalized;
  }

  async function fetchJson(url) {
    var response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      var detail = '';
      try {
        detail = await response.text();
      } catch (_error) {
        detail = '';
      }
      throw new Error('HTTP ' + response.status + (detail ? ': ' + detail.slice(0, 200) : ''));
    }

    return response.json();
  }

  function formatAuthors(authors, max) {
    var list = Array.isArray(authors) ? authors : [];
    var names = list.map(function (author) {
      if (!author) {
        return '';
      }
      if (typeof author === 'string') {
        return author.trim();
      }
      return normalizeString(author.name || author.fullname || '');
    }).filter(Boolean);

    if (!names.length) {
      return '';
    }

    var limit = Number(max) || 3;
    if (names.length <= limit) {
      return names.join(', ');
    }

    return names.slice(0, limit).join(', ') + ' et al.';
  }

  function isValidPaperId(raw) {
    return ARXIV_ID_PATTERN.test(normalizeString(raw));
  }

  function normalizePeriod(value) {
    var raw = normalizeString(value).toLowerCase();
    if (raw === 'weekly' || raw === 'monthly') {
      return raw;
    }
    return 'daily';
  }

  function mapModelLikeRecord(item, rank, kind) {
    var id = normalizeString(item && (item.id || item.modelId || item._id));
    var slashIndex = id.indexOf('/');
    var author = slashIndex > 0 ? id.slice(0, slashIndex) : '';
    var tags = Array.isArray(item && item.tags)
      ? item.tags.filter(function (tag) {
        return String(tag || '').indexOf('license:') !== 0;
      }).slice(0, 10).join(', ')
      : '';

    var baseUrl = 'https://huggingface.co';
    if (kind === 'dataset') {
      baseUrl += '/datasets/';
    } else if (kind === 'space') {
      baseUrl += '/spaces/';
    } else {
      baseUrl += '/';
    }

    return {
      rank: rank,
      id: id,
      author: author,
      pipelineTag: normalizeString(item && (item.pipeline_tag || item.pipelineTag)),
      sdk: normalizeString(item && item.sdk),
      downloads: Number(item && item.downloads) || 0,
      likes: Number(item && item.likes) || 0,
      tags: tags,
      lastModified: normalizeString(item && item.lastModified).slice(0, 10),
      url: id ? baseUrl + id : ''
    };
  }

  window.__mediauseHuggingfaceHelpers = {
    SORT_OPTIONS: SORT_OPTIONS,
    SPACE_SORT_OPTIONS: SPACE_SORT_OPTIONS,
    successItems: successItems,
    successAccount: successAccount,
    errorResult: errorResult,
    normalizeString: normalizeString,
    normalizeBool: normalizeBool,
    normalizeLimit: normalizeLimit,
    normalizeSort: normalizeSort,
    fetchJson: fetchJson,
    formatAuthors: formatAuthors,
    isValidPaperId: isValidPaperId,
    normalizePeriod: normalizePeriod,
    mapModelLikeRecord: mapModelLikeRecord
  };
})();
