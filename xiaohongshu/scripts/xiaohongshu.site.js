(function () {
  var helpers = window.__mediauseXiaohongshuHelpers || {};

  function errorResult(code, message, details) {
    if (typeof helpers.errorResult === 'function') {
      return helpers.errorResult(code, message, details);
    }

    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  function hasRequestMethods(candidate) {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }
    return typeof candidate.get === 'function' && typeof candidate.post === 'function';
  }

  function createWebpackExposeFetch(moduleId) {
    var netModuleId = typeof moduleId === 'number' ? moduleId : 21403;
    var chunkKey = Object.keys(window).find(function (key) {
      return key.indexOf('webpackChunk') === 0;
    });

    if (!chunkKey) {
      throw new Error('webpackChunk not found');
    }

    var chunk = window[chunkKey];
    if (!window.__W_REQ__) {
      chunk.push([[Symbol()], {}, function (req) { window.__W_REQ__ = req; }]);
    }

    var req = window.__W_REQ__;
    if (!req) {
      throw new Error('webpack require not found');
    }

    var netModule = req(netModuleId);
    if (!netModule || !netModule.dJ) {
      throw new Error('xhs request module is not available');
    }

    return netModule.dJ;
  }

  function resolveRequestClient() {
    if (hasRequestMethods(window.__mediauseXhsRequestClient)) {
      return window.__mediauseXhsRequestClient;
    }

    var candidates = [window._xhsRequest, window.__mediauseRequest];
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = candidates[i];
      if (hasRequestMethods(candidate)) {
        window.__mediauseXhsRequestClient = candidate;
        return candidate;
      }

      if (typeof candidate === 'function') {
        try {
          var maybeClient = candidate();
          if (hasRequestMethods(maybeClient)) {
            window.__mediauseXhsRequestClient = maybeClient;
            return maybeClient;
          }
        } catch (_error) {
        }
      }
    }

    var exposed = createWebpackExposeFetch(21403);
    if (!hasRequestMethods(exposed)) {
      throw new Error('xhs request client not available');
    }

    window.__mediauseXhsRequestClient = exposed;
    window._xhsRequest = exposed;
    return exposed;
  }

  function buildQueryString(payload) {
    var source = payload && typeof payload === 'object' ? payload : {};
    var params = new URLSearchParams();
    for (var key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        continue;
      }
      var value = source[key];
      if (value === undefined || value === null || value === '') {
        continue;
      }
      if (Array.isArray(value)) {
        params.set(key, value.join(','));
        continue;
      }
      params.set(key, String(value));
    }
    return params.toString();
  }

  async function xhsCall(method, path, payload, options) {
    var verb = String(method || '').toUpperCase();
    if (verb !== 'GET' && verb !== 'POST' && verb !== 'PUT' && verb !== 'DELETE') {
      throw new Error('unsupported request method: ' + String(method));
    }

    var url = String(path || '');
    if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
      url = 'https://www.xiaohongshu.com' + url;
    }

    var requestOptions = {
      method: verb,
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    };

    if (verb === 'GET') {
      var queryString = buildQueryString(payload || {});
      if (queryString) {
        url += (url.indexOf('?') >= 0 ? '&' : '?') + queryString;
      }
    } else {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(payload || {});
    }

    var response = await fetch(url, requestOptions);
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + path);
    }

    var contentType = response.headers.get('content-type') || '';
    if (contentType.indexOf('application/json') >= 0) {
      return response.json();
    }

    return {
      text: await response.text()
    };
  }

  function resolveId(payload, keys) {
    var source = payload && typeof payload === 'object' ? payload : {};
    for (var i = 0; i < keys.length; i += 1) {
      var value = source[keys[i]];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  }

  function createRequestId() {
    if (!window.BigInt) {
      return String(Date.now()) + '-' + String(Math.ceil(0x7ffffffe * Math.random()));
    }
    var t = BigInt(Date.now());
    var n = BigInt(Math.ceil(0x7ffffffe * Math.random()));
    return String(n) + '-' + String(t);
  }

  function createSearchId() {
    if (!window.BigInt) {
      return Number.parseInt(String(Date.now()) + String(Math.ceil(0x7ffffffe * Math.random())), 10).toString(36);
    }
    var t = BigInt(Date.now());
    var n = BigInt(Math.ceil(0x7ffffffe * Math.random()));
    t <<= BigInt(64);
    t += n;
    return t.toString(36);
  }

  function normalizeListItems(rawItems, mapFn) {
    var rows = Array.isArray(rawItems) ? rawItems : [];
    return rows.map(function (item, index) {
      return mapFn(item, index + 1);
    });
  }

  async function accountHealth() {
    try {
      var response = await xhsCall('get', '/api/sns/web/v2/user/me', {});
      var root = response || {};
      var user = root.user || root.data || root;
      var id = resolveId(user, ['user_id', 'userId', 'id', 'uid']);
      var nick = helpers.normalizeString(user.nickname || user.nick_name || user.name || user.user_name);

      return helpers.successAccount({
        healthy: !!id,
        account: {
          id: id || null,
          nick: nick || null,
          login: !user.guest
        }
      });
    } catch (error) {
      return errorResult('xiaohongshu.account.health_failed', 'account health check failed', String(error));
    }
  }

  async function postFeed() {
    return errorResult('xiaohongshu.post.feed.not_supported', 'post.feed is not available in the current site runtime implementation');
  }

  async function postRepost() {
    return errorResult('xiaohongshu.post.repost.not_supported', 'post.repost is not available in the current site runtime implementation');
  }

  async function getFeed(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var limitCheck = helpers.normalizePositiveInt(safe.limit, 20, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var response = await xhsCall('post', '/api/sns/web/v1/homefeed', {
        cursor_score: safe.cursor_score || safe.cursor || '',
        num: limitCheck.value,
        refresh_type: safe.refresh_type || 1,
        note_index: safe.note_index || 0,
        unread_begin_note_id: safe.unread_begin_note_id || '',
        unread_end_note_id: safe.unread_end_note_id || '',
        unread_note_count: safe.unread_note_count || 0,
        category: safe.type || safe.category || 'homefeed_recommend',
        search_key: safe.search_key || '',
        need_num: safe.need_num || 6,
        image_formats: ['jpg', 'webp', 'avif']
      }, {
        summary: 'mediause get feed'
      });

      var items = normalizeListItems(
        helpers.pickFirstArray(response, ['items', 'data', 'notes', 'note_list']),
        function (row, rank) {
          var note = helpers.pickObject(row.note_card || row.noteCard || row);
          var user = helpers.pickObject(note.user || row.user || {});
          return {
            rank: rank,
            id: resolveId(row, ['id', 'note_id', 'noteId']) || resolveId(note, ['id', 'note_id', 'noteId']),
            title: helpers.normalizeString(note.display_title || note.displayTitle || note.title),
            author: helpers.normalizeString(user.nickname || user.nick_name || user.nickName || user.name),
            type: helpers.normalizeString(note.type),
            likes: helpers.pick(note.interact_info || note.interactInfo || {}, ['liked_count', 'likedCount'], 0)
          };
        }
      );

      return helpers.successData({
        items: items,
        raw: response
      });
    } catch (error) {
      return errorResult('xiaohongshu.get.feed.failed', 'get feed failed', String(error));
    }
  }

  async function getDetail(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var noteId = resolveId(safe, ['id', 'post_id', 'note_id']);
      var token = resolveId(safe, ['xsec_token']);
      if (!noteId) {
        return errorResult('xiaohongshu.get.detail.id_required', 'id is required');
      }

      var detail = await xhsCall('post', '/api/sns/web/v1/feed', {
        source_note_id: noteId,
        image_formats: ['jpg', 'webp', 'avif'],
        xsec_token: token,
        xsec_source: 'pc_feed'
      }, {
        summary: 'mediause get detail'
      });

      if (!helpers.normalizeBool(safe.comments, false)) {
        return helpers.successData({
          detail: detail
        });
      }

      var comments = await xhsCall('post', '/api/sns/web/v2/comment/page', {
        note_id: noteId,
        cursor: safe.cursor || '',
        image_formats: ['jpg', 'webp', 'avif'],
        xsec_token: token,
        xsec_source: 'pc_feed'
      }, {
        summary: 'mediause get note comments'
      });

      return helpers.successData({
        detail: detail,
        comments: comments
      });
    } catch (error) {
      return errorResult('xiaohongshu.get.detail.failed', 'get detail failed', String(error));
    }
  }

  async function getNotif() {
    return errorResult('xiaohongshu.get.notif.not_supported', 'get.notif is not implemented yet');
  }

  async function userProfile(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var me = helpers.normalizeBool(safe.me, false);
      if (me || !safe.user_id) {
        var selfInfo = await xhsCall('get', '/api/sns/web/v1/user/selfinfo', {});
        return helpers.successData({ profile: selfInfo });
      }

      var otherInfo = await xhsCall('get', '/api/sns/web/v1/user/otherinfo', {
        target_user_id: safe.user_id
      });
      return helpers.successData({ profile: otherInfo });
    } catch (error) {
      return errorResult('xiaohongshu.user.profile.failed', 'get user profile failed', String(error));
    }
  }

  async function userProfileUpdate() {
    return errorResult('xiaohongshu.user.profile_update.not_supported', 'user.profile-update is not implemented yet');
  }

  async function userFeed(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var userId = resolveId(safe, ['user_id', 'uid', 'id']);
      if (!userId) {
        return errorResult('xiaohongshu.user.feed.user_id_required', 'user_id is required');
      }

      var limitCheck = helpers.normalizePositiveInt(safe.limit, 20, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var response = await xhsCall('get', '/api/sns/web/v2/user_posted', {
        user_id: userId,
        num: limitCheck.value,
        cursor: safe.cursor || '',
        image_formats: ['jpg', 'webp', 'avif'],
        xsec_token: safe.xsec_token || '',
        xsec_source: 'pc_feed'
      });

      return helpers.successData({
        user_id: userId,
        data: response
      });
    } catch (error) {
      return errorResult('xiaohongshu.user.feed.failed', 'get user feed failed', String(error));
    }
  }

  async function userFollowers() {
    return errorResult('xiaohongshu.user.followers.not_supported', 'user.followers is not implemented yet');
  }

  async function userFollowing() {
    return errorResult('xiaohongshu.user.following.not_supported', 'user.following is not implemented yet');
  }

  async function replyComment(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var noteId = resolveId(safe, ['note_id', 'post_id', 'id']);
      var text = helpers.normalizeString(safe.text || safe.comment);
      if (!noteId || !text) {
        return errorResult('xiaohongshu.reply.comment.invalid_argument', 'reply.comment requires post_id and text');
      }

      var response = await xhsCall('post', '/api/sns/web/v1/comment/post', {
        note_id: noteId,
        content: text
      }, {
        summary: 'mediause reply comment'
      });

      return helpers.successData({ result: response });
    } catch (error) {
      return errorResult('xiaohongshu.reply.comment.failed', 'reply comment failed', String(error));
    }
  }

  async function replySub(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var noteId = resolveId(safe, ['note_id', 'post_id', 'id']);
      var rootCommentId = resolveId(safe, ['comment_id', 'root_comment_id', 'target_comment_id']);
      var text = helpers.normalizeString(safe.text || safe.comment);
      if (!rootCommentId || !text) {
        return errorResult('xiaohongshu.reply.sub.invalid_argument', 'reply.sub requires comment_id and text');
      }

      var response = await xhsCall('post', '/api/sns/web/v1/comment/post', {
        note_id: noteId,
        root_comment_id: rootCommentId,
        target_comment_id: rootCommentId,
        content: text
      }, {
        summary: 'mediause reply sub'
      });

      return helpers.successData({ result: response });
    } catch (error) {
      return errorResult('xiaohongshu.reply.sub.failed', 'reply sub failed', String(error));
    }
  }

  async function replyMessage() {
    return errorResult('xiaohongshu.reply.message.not_supported', 'reply.message is not implemented yet');
  }

  async function searchText(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var keyword = helpers.normalizeString(safe.keyword || safe.query || safe.q);
      if (!keyword) {
        return errorResult('xiaohongshu.search.text.keyword_required', 'keyword is required');
      }

      var limitCheck = helpers.normalizePositiveInt(safe.limit, 20, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var pageCheck = helpers.normalizePositiveInt(safe.page, 1, 200, 'page');
      if (!pageCheck.ok) {
        return pageCheck.error;
      }

      var response = await xhsCall('post', '/api/sns/web/v1/search/notes', {
        keyword: keyword,
        page: pageCheck.value,
        page_size: limitCheck.value,
        sort: safe.sort || 'general',
        note_type: safe.note_type || 0,
        ext_flags: [],
        geo: '',
        search_id: createSearchId(),
        image_formats: ['jpg', 'webp', 'avif']
      }, {
        summary: 'mediause search text'
      });

      return helpers.successData({
        keyword: keyword,
        page: pageCheck.value,
        limit: limitCheck.value,
        data: response
      });
    } catch (error) {
      return errorResult('xiaohongshu.search.text.failed', 'search text failed', String(error));
    }
  }

  async function searchUser(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var keyword = helpers.normalizeString(safe.keyword || safe.query || safe.q);
      if (!keyword) {
        return errorResult('xiaohongshu.search.user.query_required', 'query is required');
      }

      var limitCheck = helpers.normalizePositiveInt(safe.limit, 20, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var pageCheck = helpers.normalizePositiveInt(safe.page, 1, 200, 'page');
      if (!pageCheck.ok) {
        return pageCheck.error;
      }

      var response = await xhsCall('post', '/api/sns/web/v1/search/usersearch', {
        keyword: keyword,
        page: pageCheck.value,
        page_size: limitCheck.value,
        search_id: createSearchId(),
        request_id: createRequestId()
      }, {
        summary: 'mediause search user'
      });

      return helpers.successData({
        query: keyword,
        page: pageCheck.value,
        limit: limitCheck.value,
        data: response
      });
    } catch (error) {
      return errorResult('xiaohongshu.search.user.failed', 'search user failed', String(error));
    }
  }

  async function searchHot(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var response = await xhsCall('get', '/api/sns/web/v1/search/recommend', {
        keyword: safe.keyword || safe.query || ''
      });

      return helpers.successData({ data: response });
    } catch (error) {
      return errorResult('xiaohongshu.search.hot.failed', 'search hot failed', String(error));
    }
  }

  async function engageLike(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var noteId = resolveId(safe, ['note_id', 'post_id', 'id']);
      if (!noteId) {
        return errorResult('xiaohongshu.engage.like.id_required', 'id is required');
      }

      var response = await xhsCall('post', '/api/sns/web/v1/note/like', {
        note_id: noteId
      }, {
        summary: 'mediause engage like'
      });

      return helpers.successData({ note_id: noteId, result: response });
    } catch (error) {
      return errorResult('xiaohongshu.engage.like.failed', 'engage like failed', String(error));
    }
  }

  async function engageFollow(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var userId = resolveId(safe, ['user_id', 'uid', 'id']);
      if (!userId) {
        return errorResult('xiaohongshu.engage.follow.user_id_required', 'user_id is required');
      }

      var undo = helpers.normalizeBool(safe.undo, false);
      var response = await xhsCall('post', undo ? '/api/sns/web/v1/user/unfollow' : '/api/sns/web/v1/user/follow', {
        target_user_id: userId
      }, {
        summary: undo ? 'mediause engage unfollow' : 'mediause engage follow'
      });

      return helpers.successData({ user_id: userId, undo: undo, result: response });
    } catch (error) {
      return errorResult('xiaohongshu.engage.follow.failed', 'engage follow failed', String(error));
    }
  }

  async function engageCollect(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var noteId = resolveId(safe, ['note_id', 'post_id', 'id']);
      if (!noteId) {
        return errorResult('xiaohongshu.engage.collect.id_required', 'id is required');
      }

      var undo = helpers.normalizeBool(safe.undo, false);
      var response = await xhsCall('post', undo ? '/api/sns/web/v1/note/uncollect' : '/api/sns/web/v1/note/collect', {
        note_id: noteId
      }, {
        summary: undo ? 'mediause engage uncollect' : 'mediause engage collect'
      });

      return helpers.successData({ note_id: noteId, undo: undo, result: response });
    } catch (error) {
      return errorResult('xiaohongshu.engage.collect.failed', 'engage collect failed', String(error));
    }
  }

  async function noteBoost(payload) {
    try {
      var safe = payload && typeof payload === 'object' ? payload : {};
      var noteId = resolveId(safe, ['note_id', 'id', 'post_id']);
      if (!noteId) {
        return errorResult('xiaohongshu.note.boost.note_id_required', 'note_id is required');
      }

      var likeResult = await engageLike({ note_id: noteId });
      var collectResult = await engageCollect({ note_id: noteId });

      return helpers.successData({
        note_id: noteId,
        like: likeResult,
        collect: collectResult
      });
    } catch (error) {
      return errorResult('xiaohongshu.note.boost.failed', 'note boost failed', String(error));
    }
  }

  async function manageTask(payload) {
    var safe = payload && typeof payload === 'object' ? payload : {};
    var task = helpers.normalizeString(safe.task || safe.action);
    if (task === 'note.boost') {
      return noteBoost(safe);
    }
    return accountHealth();
  }

  async function traceLast(payload) {
    return helpers.successData({
      platform: 'xiaohongshu',
      payload: payload && typeof payload === 'object' ? payload : {},
      request_client_ready: hasRequestMethods(window.__mediauseXhsRequestClient)
    });
  }

  window.__mediauseXiaohongshu = {
    accountHealth: accountHealth,
    postFeed: postFeed,
    postRepost: postRepost,
    getFeed: getFeed,
    getDetail: getDetail,
    getNotif: getNotif,
    userProfile: userProfile,
    userProfileUpdate: userProfileUpdate,
    userFeed: userFeed,
    userFollowers: userFollowers,
    userFollowing: userFollowing,
    replyComment: replyComment,
    replySub: replySub,
    replyMessage: replyMessage,
    searchText: searchText,
    searchUser: searchUser,
    searchHot: searchHot,
    engageLike: engageLike,
    engageFollow: engageFollow,
    engageCollect: engageCollect,
    manageTask: manageTask,
    traceLast: traceLast,
    noteBoost: noteBoost
  };
})();
