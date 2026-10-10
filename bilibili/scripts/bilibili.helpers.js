(function () {
  var MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
  ];

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
      data: data
    };
  }

  function asString(value) {
    return String(value == null ? '' : value).trim();
  }

  function sanitizeLimit(value, fallback, maxValue) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      return fallback;
    }
    var out = Math.floor(n);
    if (Number.isFinite(maxValue) && out > maxValue) {
      return maxValue;
    }
    return out;
  }

  function stripHtml(text) {
    return asString(text).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
  }

  function payloadData(payload) {
    return payload && payload.data ? payload.data : payload;
  }

  function formatDuration(seconds) {
    var total = Math.max(0, Math.floor(Number(seconds) || 0));
    var m = Math.floor(total / 60);
    var s = total % 60;
    return String(m) + ':' + String(s).padStart(2, '0');
  }

  function toVideoUrl(bvid) {
    var id = asString(bvid);
    return id ? 'https://www.bilibili.com/video/' + id : '';
  }

  function toDynamicUrl(id) {
    var value = asString(id);
    return value ? 'https://t.bilibili.com/' + value : '';
  }

  function ensureInvoke() {
    if (window.__MEDIAUSE__ && typeof window.__MEDIAUSE__.invoke === 'function') {
      return window.__MEDIAUSE__.invoke.bind(window.__MEDIAUSE__);
    }
    if (typeof window.__mediauseInvoke === 'function') {
      return window.__mediauseInvoke;
    }
    throw new Error('MediaUse invoke bridge is not available');
  }

  async function invokeOrThrow(command, payload) {
    var fn = ensureInvoke();
    return fn(command, payload || {});
  }

  async function calcMd5(text) {
    var bytes = Array.from(new TextEncoder().encode(String(text == null ? '' : text)));
    return invokeOrThrow('calc_md5', { data: bytes });
  }

  async function fetchJson(url, init) {
    var response = await fetch(url, init || { credentials: 'include' });
    return response.json();
  }

  async function getNavData() {
    return fetchJson('https://api.bilibili.com/x/web-interface/nav', {
      credentials: 'include'
    });
  }

  async function getWbiKeys() {
    var nav = await getNavData();
    var wbiImg = nav && nav.data ? (nav.data.wbi_img || {}) : {};
    var imgUrl = asString(wbiImg.img_url);
    var subUrl = asString(wbiImg.sub_url);
    var imgKey = imgUrl.split('/').pop();
    var subKey = subUrl.split('/').pop();
    return {
      imgKey: imgKey ? imgKey.split('.')[0] : '',
      subKey: subKey ? subKey.split('.')[0] : ''
    };
  }

  function getMixinKey(imgKey, subKey) {
    var raw = String(imgKey || '') + String(subKey || '');
    var mixed = MIXIN_KEY_ENC_TAB.map(function (index) {
      return raw[index] || '';
    }).join('');
    return mixed.slice(0, 32);
  }

  async function wbiSign(params) {
    var keys = await getWbiKeys();
    var mixinKey = getMixinKey(keys.imgKey, keys.subKey);
    var wts = Math.floor(Date.now() / 1000);
    var allParams = Object.assign({}, params || {}, { wts: String(wts) });
    var sortedKeys = Object.keys(allParams).sort();
    var sorted = {};

    sortedKeys.forEach(function (key) {
      sorted[key] = String(allParams[key]).replace(/[!'()*]/g, '');
    });

    var query = new URLSearchParams(sorted).toString().replace(/\+/g, '%20');
    sorted.w_rid = await calcMd5(query + mixinKey);
    return sorted;
  }

  async function apiGet(path, options) {
    var opts = options || {};
    var params = opts.params || {};
    if (opts.signed) {
      params = await wbiSign(params);
    }

    var query = new URLSearchParams(Object.fromEntries(
      Object.keys(params).map(function (key) {
        return [key, String(params[key])];
      })
    )).toString().replace(/\+/g, '%20');

    var url = 'https://api.bilibili.com' + path + (query ? ('?' + query) : '');
    return fetchJson(url, { credentials: 'include' });
  }

  async function apiPost(path, options) {
    var opts = options || {};
    var params = opts.params || {};
    var csrf = (document.cookie.match(/bili_jct=([^;]+)/) || [])[1] || '';
    var body = new URLSearchParams();

    Object.keys(params).forEach(function (key) {
      body.set(key, String(params[key]));
    });
    body.set('csrf', csrf);

    var response = await fetch('https://api.bilibili.com' + path, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    var text = await response.text();

    try {
      return JSON.parse(text);
    } catch (_error) {
      return {
        code: -1,
        message: 'Non-JSON response (HTTP ' + response.status + '): ' + text.slice(0, 200)
      };
    }
  }

  async function resolveBvid(input) {
    var trimmed = asString(input);
    if (!trimmed) {
      throw new Error('BV id is required');
    }
    if (/^BV[A-Za-z0-9]+$/i.test(trimmed)) {
      return trimmed;
    }

    try {
      var parsed = new URL(trimmed);
      if (/(\.|^)bilibili\.com$/i.test(parsed.hostname)) {
        var match = parsed.pathname.match(/\/(?:video|bangumi\/play)\/(BV[A-Za-z0-9]+)/i);
        if (match) {
          return match[1];
        }
      }
    } catch (_error) {
      // Ignore non-URL inputs.
    }

    var shortCode = trimmed
      .replace(/^https?:\/\//, '')
      .replace(/^(www\.)?b23\.tv\//, '');
    if (!/^[A-Za-z0-9]+$/.test(shortCode)) {
      throw new Error('Cannot resolve BV ID from input: ' + trimmed);
    }

    var response = await fetch('https://b23.tv/' + shortCode, {
      method: 'GET',
      redirect: 'follow',
      credentials: 'include'
    });
    var finalUrl = response && response.url ? response.url : '';
    var finalMatch = finalUrl.match(/\/(?:video|bangumi\/play)\/(BV[A-Za-z0-9]+)/i);
    if (finalMatch) {
      return finalMatch[1];
    }
    throw new Error('Cannot resolve BV ID from short URL: ' + trimmed);
  }

  async function getSelfUid() {
    var nav = await getNavData();
    var mid = nav && nav.data ? nav.data.mid : null;
    if (!mid) {
      throw new Error('Bilibili login required');
    }
    return String(mid);
  }

  async function resolveUid(input) {
    var raw = asString(input);
    if (!raw) {
      return getSelfUid();
    }
    if (/^\d+$/.test(raw)) {
      return raw;
    }

    var payload = await apiGet('/x/web-interface/wbi/search/type', {
      params: {
        search_type: 'bili_user',
        keyword: raw
      },
      signed: true
    });
    var results = payload && payload.data ? payload.data.result : null;
    if (!Array.isArray(results) || !results.length) {
      throw new Error('Cannot resolve Bilibili user: ' + raw);
    }

    var mid = asString(results[0] && results[0].mid);
    if (!mid) {
      throw new Error('Bilibili user search returned malformed mid for ' + raw);
    }
    return mid;
  }

  window.__mediauseBilibiliHelpers = {
    apiGet: apiGet,
    apiPost: apiPost,
    asString: asString,
    errorResult: errorResult,
    fetchJson: fetchJson,
    formatDuration: formatDuration,
    getNavData: getNavData,
    getSelfUid: getSelfUid,
    payloadData: payloadData,
    resolveBvid: resolveBvid,
    resolveUid: resolveUid,
    sanitizeLimit: sanitizeLimit,
    stripHtml: stripHtml,
    successData: successData,
    successItems: successItems,
    toDynamicUrl: toDynamicUrl,
    toVideoUrl: toVideoUrl,
    wbiSign: wbiSign
  };
})();
