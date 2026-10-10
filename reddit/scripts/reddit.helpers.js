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

  function sanitizeLimit(value, fallback) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      return fallback;
    }
    return Math.floor(n);
  }

  function normalizeSubredditName(input) {
    var name = String(input || '').trim();
    if (!name || /^\{\{.*\}\}$/.test(name)) {
      return '';
    }
    if (name.toLowerCase().startsWith('r/')) {
      return name.slice(2);
    }
    return name;
  }

  function normalizePostId(input) {
    var postId = String(input || '').trim();
    var urlMatch = postId.match(/comments\/([a-z0-9]+)/i);
    if (urlMatch && urlMatch[1]) {
      postId = urlMatch[1];
    }
    return postId;
  }

  function fullnameForPostOrComment(input) {
    var postId = normalizePostId(input);
    if (!postId) {
      return '';
    }
    if (postId.startsWith('t3_') || postId.startsWith('t1_')) {
      return postId;
    }
    return 't3_' + postId;
  }

  async function fetchJson(path) {
    var response = await fetch(path, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + path);
    }
    return response.json();
  }

  async function getMe() {
    return fetchJson('/api/me.json?raw_json=1');
  }

  async function getModhash() {
    var me = await getMe();
    var modhash = me && me.data ? me.data.modhash : '';
    return String(modhash || '');
  }

  function toRedditUrl(permalink) {
    return 'https://www.reddit.com' + String(permalink || '');
  }

  function shorten(text, max) {
    var raw = String(text || '');
    if (raw.length <= max) {
      return raw;
    }
    return raw.slice(0, max) + '...';
  }

  window.__mediauseRedditHelpers = {
    errorResult: errorResult,
    successItems: successItems,
    sanitizeLimit: sanitizeLimit,
    normalizeSubredditName: normalizeSubredditName,
    normalizePostId: normalizePostId,
    fullnameForPostOrComment: fullnameForPostOrComment,
    fetchJson: fetchJson,
    getMe: getMe,
    getModhash: getModhash,
    toRedditUrl: toRedditUrl,
    shorten: shorten
  };
})();
