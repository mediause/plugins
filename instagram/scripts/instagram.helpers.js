(function () {
  var APP_ID = '936619743392459';

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
      data: data
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

  function normalizeLimit(value, fallbackValue, maxValue) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      parsed = fallbackValue;
    }
    parsed = Math.floor(parsed);
    if (parsed > maxValue) {
      parsed = maxValue;
    }
    if (parsed < 1) {
      parsed = 1;
    }
    return parsed;
  }

  function csrfToken() {
    var match = String(document.cookie || '').match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function dsUserId() {
    var match = String(document.cookie || '').match(/(?:^|;\s*)ds_user_id=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function trimText(value, maxLen) {
    return normalizeText(value).slice(0, maxLen);
  }

  function defaultHeaders() {
    return {
      'X-IG-App-ID': APP_ID
    };
  }

  function postHeaders() {
    var token = csrfToken();
    var headers = {
      'X-IG-App-ID': APP_ID,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    if (token) {
      headers['X-CSRFToken'] = token;
    }
    return headers;
  }

  async function igFetchJson(url, options) {
    var res = await fetch(url, options || {
      credentials: 'include',
      headers: defaultHeaders()
    });

    var text = await res.text();
    var data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_error) {
        data = null;
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      data: data,
      text: text
    };
  }

  async function resolveUser(username) {
    var normalized = normalizeText(username);
    if (!normalized) {
      throw new Error('username is required');
    }

    var response = await igFetchJson(
      'https://www.instagram.com/api/v1/users/web_profile_info/?username=' + encodeURIComponent(normalized),
      {
        credentials: 'include',
        headers: defaultHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('failed to resolve user: HTTP ' + response.status);
    }

    var user = response.data && response.data.data && response.data.data.user;
    if (!user || !user.id) {
      throw new Error('user not found: ' + normalized);
    }

    return user;
  }

  function mediaTypeName(value) {
    if (value === 1) {
      return 'photo';
    }
    if (value === 2) {
      return 'video';
    }
    if (value === 8) {
      return 'carousel';
    }
    return 'unknown';
  }

  async function resolveUserPostByIndex(username, index) {
    var user = await resolveUser(username);
    var idx = Number(index);
    if (!Number.isFinite(idx) || idx < 1) {
      idx = 1;
    }

    var response = await igFetchJson(
      'https://www.instagram.com/api/v1/feed/user/' + encodeURIComponent(String(user.id)) + '/?count=' + String(idx),
      {
        credentials: 'include',
        headers: defaultHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('failed to load user feed: HTTP ' + response.status);
    }

    var items = (response.data && response.data.items) || [];
    if (!Array.isArray(items) || items.length < idx) {
      throw new Error('post index ' + String(idx) + ' not found');
    }

    return {
      user: user,
      post: items[idx - 1],
      index: idx
    };
  }

  function parseInstagramUrl(raw) {
    var value = normalizeText(raw);
    if (!value) {
      throw new Error('url is required');
    }

    var parsed;
    try {
      parsed = new URL(value);
    } catch (_error) {
      throw new Error('invalid instagram url');
    }

    var host = String(parsed.hostname || '').toLowerCase();
    if (!(host === 'instagram.com' || host === 'www.instagram.com' || host.endsWith('.instagram.com'))) {
      throw new Error('unsupported host: ' + host);
    }

    var segments = String(parsed.pathname || '').split('/').filter(Boolean);
    var kinds = { p: true, reel: true, tv: true, stories: true };

    if (segments.length >= 2 && kinds[segments[0]]) {
      return {
        kind: segments[0],
        shortcode: segments[1],
        url: parsed.toString()
      };
    }

    throw new Error('unsupported instagram media url path');
  }

  function graphqlDocId() {
    return '8845758582119845';
  }

  async function fetchGraphqlMedia(shortcode) {
    var variables = {
      shortcode: shortcode,
      fetch_tagged_user_count: null,
      hoisted_comment_id: null,
      hoisted_reply_id: null
    };

    var url = 'https://www.instagram.com/graphql/query/?doc_id=' + graphqlDocId() + '&variables=' + encodeURIComponent(JSON.stringify(variables));
    var response = await igFetchJson(url, {
      credentials: 'include',
      headers: defaultHeaders()
    });

    if (!response.ok) {
      throw new Error('failed to fetch graphql media: HTTP ' + response.status);
    }

    var media = response.data && response.data.data && response.data.data.xdt_shortcode_media;
    if (!media) {
      throw new Error('media not found for shortcode: ' + shortcode);
    }

    return media;
  }

  function mediaNodes(media) {
    var edges = media && media.edge_sidecar_to_children && media.edge_sidecar_to_children.edges;
    if (Array.isArray(edges) && edges.length > 0) {
      return edges.map(function (edge) {
        return edge && edge.node;
      }).filter(Boolean);
    }
    return [media];
  }

  function buildMediaLinks(media) {
    var nodes = mediaNodes(media);
    var urls = [];
    var i = 0;
    for (i = 0; i < nodes.length; i += 1) {
      var node = nodes[i] || {};
      var url = node.is_video ? node.video_url : node.display_url;
      if (url && urls.indexOf(url) < 0) {
        urls.push(url);
      }
    }
    return urls;
  }

  function formatPostRow(post, rank) {
    var caption = post && post.caption && post.caption.text;
    return {
      index: rank,
      caption: trimText(caption, 100),
      likes: post && post.like_count || 0,
      comments: post && post.comment_count || 0,
      type: mediaTypeName(post && post.media_type),
      date: post && post.taken_at ? new Date(post.taken_at * 1000).toISOString() : ''
    };
  }

  async function postForm(url, formString) {
    var response = await igFetchJson(url, {
      method: 'POST',
      credentials: 'include',
      headers: postHeaders(),
      body: formString || ''
    });

    if (!response.ok) {
      throw new Error('request failed: HTTP ' + response.status);
    }

    return response.data || {};
  }

  window.__mediauseInstagramHelpers = {
    APP_ID: APP_ID,
    successItems: successItems,
    successAccount: successAccount,
    errorResult: errorResult,
    normalizeLimit: normalizeLimit,
    normalizeText: normalizeText,
    trimText: trimText,
    csrfToken: csrfToken,
    dsUserId: dsUserId,
    defaultHeaders: defaultHeaders,
    postHeaders: postHeaders,
    igFetchJson: igFetchJson,
    resolveUser: resolveUser,
    resolveUserPostByIndex: resolveUserPostByIndex,
    mediaTypeName: mediaTypeName,
    parseInstagramUrl: parseInstagramUrl,
    fetchGraphqlMedia: fetchGraphqlMedia,
    buildMediaLinks: buildMediaLinks,
    formatPostRow: formatPostRow,
    postForm: postForm
  };
})();