(function () {
  var helpers = window.__mediauseTiktokHelpers || {};

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

  function successItems(items) {
    if (typeof helpers.successItems === 'function') {
      return helpers.successItems(items);
    }
    return {
      success: true,
      data: {
        items: Array.isArray(items) ? items : []
      }
    };
  }

  function sanitizeLimit(value, fallback, max) {
    if (typeof helpers.sanitizeLimit === 'function') {
      return helpers.sanitizeLimit(value, fallback, max);
    }
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) n = fallback;
    n = Math.floor(n);
    if (Number.isFinite(max) && max > 0 && n > max) n = max;
    return n;
  }

  function wait(ms) {
    if (typeof helpers.wait === 'function') {
      return helpers.wait(ms);
    }
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function compactText(value) {
    if (typeof helpers.compactText === 'function') {
      return helpers.compactText(value);
    }
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeUsername(value) {
    if (typeof helpers.normalizeUsername === 'function') {
      return helpers.normalizeUsername(value);
    }
    var text = String(value || '').trim();
    return text.indexOf('@') === 0 ? text.slice(1) : text;
  }

  function parseUniversalData(html) {
    if (typeof helpers.parseUniversalData === 'function') {
      return helpers.parseUniversalData(html);
    }
    throw new Error('TikTok universal parser is unavailable');
  }

  function parseSafeJson(text) {
    if (typeof helpers.parseSafeJson === 'function') {
      return helpers.parseSafeJson(text);
    }
    try {
      return JSON.parse(text);
    } catch (_error) {
      return null;
    }
  }

  function numberOrZero(value) {
    if (typeof helpers.numberOrZero === 'function') {
      return helpers.numberOrZero(value);
    }
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeCounter(value) {
    if (typeof helpers.normalizeCounter === 'function') {
      return helpers.normalizeCounter(value);
    }
    return compactText(value) || '0';
  }

  function normalizeCursor(value) {
    if (typeof helpers.normalizeCursor === 'function') {
      return helpers.normalizeCursor(value);
    }
    var text = String(value == null ? '0' : value).trim();
    if (!/^\d+$/.test(text)) {
      throw new Error('cursor must be a non-negative integer string');
    }
    return text;
  }

  function findButtonByText(candidates) {
    if (typeof helpers.findButtonByText === 'function') {
      return helpers.findButtonByText(candidates);
    }
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

  function extractVideoRowsFromLinks(limit) {
    var links = Array.from(document.querySelectorAll('a[href*="/video/"]'));
    var seen = Object.create(null);
    var rows = [];
    for (var i = 0; i < links.length; i += 1) {
      var href = links[i].href;
      if (!href || seen[href]) continue;
      seen[href] = true;
      var match = href.match(/@([^/]+)\/video\/(\d+)/);
      rows.push({
        rank: rows.length + 1,
        author: match ? match[1] : '',
        views: compactText(links[i].textContent) || '-',
        url: href
      });
      if (rows.length >= limit) break;
    }
    return rows;
  }

  async function accountHealth() {
    try {
      var path = String(window.location.pathname || '');
      var hasLoginPath = path.indexOf('/login') === 0;
      var profileAnchor = document.querySelector('a[href*="/@"]');
      var avatarNode = document.querySelector('[data-e2e="top-nav-user-avatar"]')
        || document.querySelector('[data-e2e="profile-icon"]')
        || document.querySelector('img[alt*="profile" i]');
      var loginNode = document.querySelector('a[href*="/login"]')
        || findButtonByText(['Log in', 'Login', '登录']);

      var loggedIn = !hasLoginPath && !!(profileAnchor || avatarNode) && !loginNode;
      var username = null;
      if (profileAnchor && profileAnchor.getAttribute('href')) {
        var href = String(profileAnchor.getAttribute('href'));
        var match = href.match(/@([^/?#]+)/);
        if (match && match[1]) {
          username = match[1];
        }
      }

      return {
        success: true,
        data: {
          healthy: loggedIn,
          account: {
            id: username,
            nick: username,
            login: loggedIn
          }
        }
      };
    } catch (error) {
      return errorResult('tiktok.account.health_failed', 'account health failed', String(error));
    }
  }

  async function searchPosts(payload) {
    try {
      var query = compactText(payload && payload.query);
      if (!query) {
        return errorResult('tiktok.search.query_required', 'query is required');
      }

      var limit = sanitizeLimit(payload && payload.limit, 10, 50);
      var response = await fetch('/api/search/general/full/?keyword=' + encodeURIComponent(query) + '&offset=0&count=' + limit + '&aid=1988', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      var text = await response.text();
      if (!text || !text.trim()) {
        return successItems([]);
      }

      var data = parseSafeJson(text);
      if (!data) {
        return errorResult(
          'tiktok.search.invalid_json',
          'search posts returned non-json response',
          text.slice(0, 300)
        );
      }

      var items = Array.isArray(data && data.data) ? data.data : [];
      var rows = [];
      for (var i = 0; i < items.length && rows.length < limit; i += 1) {
        var entry = items[i];
        if (!entry || entry.type !== 1 || !entry.item) continue;
        var video = entry.item;
        var author = video.author || {};
        var stats = video.stats || {};
        rows.push({
          rank: rows.length + 1,
          desc: compactText(video.desc).substring(0, 100),
          author: author.uniqueId || '',
          url: author.uniqueId && video.id ? 'https://www.tiktok.com/@' + author.uniqueId + '/video/' + video.id : '',
          plays: numberOrZero(stats.playCount),
          likes: numberOrZero(stats.diggCount),
          comments: numberOrZero(stats.commentCount),
          shares: numberOrZero(stats.shareCount)
        });
      }

      return successItems(rows);
    } catch (error) {
      return errorResult('tiktok.search.posts_failed', 'search posts failed', String(error));
    }
  }

  async function getExplore(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 20, 100);
      return successItems(extractVideoRowsFromLinks(limit));
    } catch (error) {
      return errorResult('tiktok.get.explore_failed', 'get explore failed', String(error));
    }
  }

  async function getLive(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 10, 50);
      var items = document.querySelectorAll('[data-e2e="live-side-nav-item"]');
      var sidebar = Array.from(items).slice(0, limit).map(function (el, idx) {
        var nameEl = el.querySelector('[data-e2e="live-side-nav-name"]');
        var countEl = el.querySelector('[data-e2e="person-count"]');
        var link = el.querySelector('a');
        return {
          index: idx + 1,
          streamer: compactText(nameEl && nameEl.textContent),
          viewers: normalizeCounter(countEl && countEl.textContent),
          url: link ? link.href : ''
        };
      });

      if (sidebar.length > 0) {
        return successItems(sidebar);
      }

      var cards = document.querySelectorAll('[data-e2e="discover-list-live-card"]');
      var fallback = Array.from(cards).slice(0, limit).map(function (card, idx) {
        var text = compactText(card.textContent);
        var link = card.querySelector('a[href*="/live"]');
        var viewerMatch = text.match(/(\d[\d,.]*)\s*watching/i);
        return {
          index: idx + 1,
          streamer: text.replace(/LIVE.*$/i, '').trim().substring(0, 40),
          viewers: viewerMatch ? viewerMatch[1] : '-',
          url: link ? link.href : ''
        };
      });
      return successItems(fallback);
    } catch (error) {
      return errorResult('tiktok.get.live_failed', 'get live failed', String(error));
    }
  }

  function collectSimpleUsers(limit) {
    var links = Array.from(document.querySelectorAll('a[href*="/@"]')).filter(function (a) {
      var text = compactText(a.textContent);
      return text.length > 1 && text.length < 80 && text.indexOf('Profile') < 0 && text.indexOf('More') < 0 && text.indexOf('Upload') < 0;
    });

    var seen = Object.create(null);
    var rows = [];
    for (var i = 0; i < links.length; i += 1) {
      var match = links[i].href.match(/@([^/]+)/);
      var username = match ? match[1] : '';
      if (!username || seen[username]) continue;
      seen[username] = true;
      var raw = compactText(links[i].textContent);
      var name = raw.replace(username, '').replace('@', '').replace('Follow', '').trim();
      rows.push({
        index: rows.length + 1,
        username: username,
        name: name || username
      });
      if (rows.length >= limit) break;
    }
    return rows;
  }

  async function getFollowing(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 20, 100);
      return successItems(collectSimpleUsers(limit));
    } catch (error) {
      return errorResult('tiktok.get.following_failed', 'get following failed', String(error));
    }
  }

  async function getFriends(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 20, 100);
      return successItems(collectSimpleUsers(limit));
    } catch (error) {
      return errorResult('tiktok.get.friends_failed', 'get friends failed', String(error));
    }
  }

  async function getNotifications(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 15, 50);
      var type = compactText(payload && payload.type).toLowerCase() || 'all';

      var inboxIcon = document.querySelector('[data-e2e="inbox-icon"]');
      if (inboxIcon) {
        inboxIcon.click();
        await wait(1200);
      }

      if (type !== 'all') {
        var tab = document.querySelector('[data-e2e="' + type + '"]');
        if (tab) {
          tab.click();
          await wait(1000);
        }
      }

      var nodes = document.querySelectorAll('[data-e2e="inbox-list"] > div, [data-e2e="inbox-list"] [role="button"]');
      var rows = Array.from(nodes)
        .filter(function (el) { return compactText(el.textContent).length > 5; })
        .slice(0, limit)
        .map(function (el, idx) {
          return {
            index: idx + 1,
            text: compactText(el.textContent).substring(0, 180)
          };
        });

      return successItems(rows);
    } catch (error) {
      return errorResult('tiktok.get.notifications_failed', 'get notifications failed', String(error));
    }
  }

  async function userProfile(payload) {
    try {
      var username = normalizeUsername(payload && payload.username);
      if (!username) {
        return errorResult('tiktok.user.username_required', 'username is required');
      }

      var response = await fetch('https://www.tiktok.com/@' + encodeURIComponent(username), { credentials: 'include' });
      if (!response.ok) {
        return errorResult('tiktok.user.profile_not_found', 'user not found: ' + username);
      }

      var html = await response.text();
      var data = parseUniversalData(html);
      var detail = data && data.__DEFAULT_SCOPE__ && data.__DEFAULT_SCOPE__['webapp.user-detail'];
      var user = detail && detail.userInfo && detail.userInfo.user;
      var stats = detail && detail.userInfo && detail.userInfo.stats;
      if (!user) {
        return errorResult('tiktok.user.profile_not_found', 'user not found: ' + username);
      }

      return successItems([{
        username: user.uniqueId || username,
        name: user.nickname || '',
        followers: numberOrZero(stats && stats.followerCount),
        following: numberOrZero(stats && stats.followingCount),
        likes: numberOrZero(stats && stats.heartCount),
        videos: numberOrZero(stats && stats.videoCount),
        verified: user.verified ? 'Yes' : 'No',
        bio: compactText(user.signature).substring(0, 120)
      }]);
    } catch (error) {
      return errorResult('tiktok.user.profile_failed', 'user profile failed', String(error));
    }
  }

  async function userVideos(payload) {
    try {
      var username = normalizeUsername(payload && payload.username);
      if (!username) {
        return errorResult('tiktok.user.username_required', 'username is required');
      }

      var limit = sanitizeLimit(payload && payload.limit, 10, 100);
      var links = extractVideoRowsFromLinks(limit);
      var rows = links.map(function (item, idx) {
        return {
          index: idx + 1,
          views: item.views || '-',
          url: item.url
        };
      });
      if (!rows.length) {
        return errorResult('tiktok.user.videos_empty', 'no videos found for @' + username);
      }
      return successItems(rows);
    } catch (error) {
      return errorResult('tiktok.user.videos_failed', 'user videos failed', String(error));
    }
  }

  function normalizeCreatorRow(item) {
    if (!item || typeof item !== 'object') return null;
    var videoId = String(item.item_id || item.id || '').trim();
    if (!videoId) return null;

    var author = item.author || {};
    var username = author.unique_id || author.uniqueId || item.author_unique_id || item.user_name || '';
    var url = username
      ? 'https://www.tiktok.com/@' + encodeURIComponent(username) + '/video/' + encodeURIComponent(videoId)
      : '';

    return {
      video_id: videoId,
      title: compactText(item.desc || item.title || ''),
      views: numberOrZero(item.play_count),
      likes: numberOrZero(item.like_count),
      comments: numberOrZero(item.comment_count),
      saves: numberOrZero(item.favorite_count),
      shares: numberOrZero(item.share_count),
      url: url
    };
  }

  async function creatorVideos(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 20, 250);
      var cursor = normalizeCursor(payload && payload.cursor);
      var size = Math.min(limit, 50);

      var body = {
        cursor: Number(cursor),
        size: size,
        query: {
          conditions: [],
          sort_orders: [{ field_name: 'create_time', order: 2 }]
        }
      };

      var response = await fetch('/tiktok/creator/manage/item_list/v1/?aid=1988', {
        method: 'POST',
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.status === 401 || response.status === 403) {
        return errorResult('tiktok.creator.auth_required', 'tiktok creator videos requires login (HTTP ' + response.status + ')');
      }
      if (!response.ok) {
        return errorResult('tiktok.creator.fetch_failed', 'creator videos request failed (HTTP ' + response.status + ')');
      }

      var text = await response.text();
      var json = parseSafeJson(text);
      if (!json || typeof json !== 'object') {
        return errorResult('tiktok.creator.bad_response', 'creator videos returned non-json payload');
      }

      var data = json.data && typeof json.data === 'object' ? json.data : json;
      var statusCode = Number(data.status_code == null ? 0 : data.status_code);
      if (statusCode !== 0) {
        return errorResult('tiktok.creator.api_failed', String(data.status_msg || statusCode));
      }

      var list = Array.isArray(data.item_list) ? data.item_list : [];
      var rows = [];
      for (var i = 0; i < list.length && rows.length < limit; i += 1) {
        var row = normalizeCreatorRow(list[i]);
        if (row) {
          rows.push(row);
        }
      }
      if (!rows.length) {
        return errorResult('tiktok.creator.empty', 'no creator videos were returned');
      }
      return successItems(rows);
    } catch (error) {
      return errorResult('tiktok.creator.videos_failed', 'creator videos failed', String(error));
    }
  }

  function likeButtonState() {
    var icon = document.querySelector('[data-e2e="like-icon"]');
    if (!icon) return { found: false, liked: false, container: null };
    var container = icon.closest('button') || icon.closest('[role="button"]') || icon;
    var aria = String(container.getAttribute('aria-label') || '').toLowerCase();
    var color = String(window.getComputedStyle(icon).color || '').toLowerCase();
    var liked = aria.indexOf('unlike') >= 0 || aria.indexOf('cancel') >= 0 || color.indexOf('255, 65') >= 0 || color.indexOf('fe2c55') >= 0;
    return { found: true, liked: liked, container: container };
  }

  function bookmarkButtonState() {
    var icon = document.querySelector('[data-e2e="bookmark-icon"]') || document.querySelector('[data-e2e="collect-icon"]');
    if (!icon) return { found: false, saved: false, container: null };
    var container = icon.closest('button') || icon.closest('[role="button"]') || icon;
    var aria = String(container.getAttribute('aria-label') || '').toLowerCase();
    var saved = aria.indexOf('remove from favorites') >= 0 || aria.indexOf('cancel') >= 0;
    return { found: true, saved: saved, container: container };
  }

  async function engageFollow(payload) {
    try {
      var username = normalizeUsername(payload && payload.username);
      if (!username) {
        return errorResult('tiktok.engage.username_required', 'username is required');
      }

      var followBtn = findButtonByText(['Follow', '关注']);
      if (!followBtn) {
        var already = !!findButtonByText(['Following', '已关注', 'Friends', '互关']);
        return successItems([{ status: already ? 'Already following' : 'Follow button not found', username: username }]);
      }

      followBtn.click();
      await wait(1200);
      return successItems([{ status: 'Followed', username: username }]);
    } catch (error) {
      return errorResult('tiktok.engage.follow_failed', 'follow failed', String(error));
    }
  }

  async function engageUnfollow(payload) {
    try {
      var username = normalizeUsername(payload && payload.username);
      if (!username) {
        return errorResult('tiktok.engage.username_required', 'username is required');
      }

      var followingBtn = findButtonByText(['Following', '已关注', 'Friends', '互关']);
      if (!followingBtn) {
        return successItems([{ status: 'Not following this user', username: username }]);
      }

      followingBtn.click();
      await wait(1200);
      var confirm = findButtonByText(['Unfollow', '取消关注']);
      if (confirm) {
        confirm.click();
        await wait(800);
      }

      return successItems([{ status: 'Unfollowed', username: username }]);
    } catch (error) {
      return errorResult('tiktok.engage.unfollow_failed', 'unfollow failed', String(error));
    }
  }

  async function engageLike(payload) {
    try {
      var url = compactText(payload && payload.url);
      var state = likeButtonState();
      if (!state.found) {
        return errorResult('tiktok.engage.like_button_missing', 'like button not found - make sure you are logged in');
      }

      var countEl = document.querySelector('[data-e2e="like-count"]');
      if (state.liked) {
        return successItems([{ status: 'Already liked', likes: normalizeCounter(countEl && countEl.textContent), url: url }]);
      }

      state.container.click();
      await wait(1200);
      countEl = document.querySelector('[data-e2e="like-count"]');
      return successItems([{ status: 'Liked', likes: normalizeCounter(countEl && countEl.textContent), url: url }]);
    } catch (error) {
      return errorResult('tiktok.engage.like_failed', 'like failed', String(error));
    }
  }

  async function engageUnlike(payload) {
    try {
      var url = compactText(payload && payload.url);
      var state = likeButtonState();
      if (!state.found) {
        return errorResult('tiktok.engage.like_button_missing', 'like button not found - make sure you are logged in');
      }

      var countEl = document.querySelector('[data-e2e="like-count"]');
      if (!state.liked) {
        return successItems([{ status: 'Not liked', likes: normalizeCounter(countEl && countEl.textContent), url: url }]);
      }

      state.container.click();
      await wait(1200);
      countEl = document.querySelector('[data-e2e="like-count"]');
      return successItems([{ status: 'Unliked', likes: normalizeCounter(countEl && countEl.textContent), url: url }]);
    } catch (error) {
      return errorResult('tiktok.engage.unlike_failed', 'unlike failed', String(error));
    }
  }

  async function engageSave(payload) {
    try {
      var url = compactText(payload && payload.url);
      var state = bookmarkButtonState();
      if (!state.found) {
        return errorResult('tiktok.engage.save_button_missing', 'favorites button not found - make sure you are logged in');
      }
      if (state.saved) {
        return successItems([{ status: 'Already in Favorites', url: url }]);
      }
      state.container.click();
      await wait(1200);
      return successItems([{ status: 'Added to Favorites', url: url }]);
    } catch (error) {
      return errorResult('tiktok.engage.save_failed', 'save failed', String(error));
    }
  }

  async function engageUnsave(payload) {
    try {
      var url = compactText(payload && payload.url);
      var state = bookmarkButtonState();
      if (!state.found) {
        return errorResult('tiktok.engage.save_button_missing', 'favorites button not found - make sure you are logged in');
      }
      if (!state.saved) {
        return successItems([{ status: 'Not in Favorites', url: url }]);
      }
      state.container.click();
      await wait(1200);
      return successItems([{ status: 'Removed from Favorites', url: url }]);
    } catch (error) {
      return errorResult('tiktok.engage.unsave_failed', 'unsave failed', String(error));
    }
  }

  async function engageComment(payload) {
    try {
      var url = compactText(payload && payload.url);
      var text = String((payload && payload.text) || '').trim();
      if (!text) {
        return errorResult('tiktok.engage.comment_text_required', 'comment text is required');
      }

      var commentIcon = document.querySelector('[data-e2e="comment-icon"]');
      if (commentIcon) {
        var trigger = commentIcon.closest('button') || commentIcon.closest('[role="button"]') || commentIcon;
        trigger.click();
        await wait(1200);
      }

      var beforeCount = document.querySelectorAll('[data-e2e="comment-level-1"]').length;
      var input = document.querySelector('[data-e2e="comment-input"] [contenteditable="true"]') || document.querySelector('[contenteditable="true"]');
      if (!input) {
        return errorResult('tiktok.engage.comment_input_missing', 'comment input not found - make sure you are logged in');
      }

      input.focus();
      if (typeof document.execCommand === 'function') {
        document.execCommand('insertText', false, text);
      } else {
        input.textContent = text;
      }
      await wait(400);

      var postBtn = findButtonByText(['Post', '发布', '发送']);
      if (!postBtn) {
        return errorResult('tiktok.engage.comment_submit_missing', 'post button not found');
      }

      postBtn.click();
      await wait(1600);
      var afterCount = document.querySelectorAll('[data-e2e="comment-level-1"]').length;
      return successItems([{ status: afterCount > beforeCount ? 'Commented' : 'Comment may have failed', url: url, text: text }]);
    } catch (error) {
      return errorResult('tiktok.engage.comment_failed', 'comment failed', String(error));
    }
  }

  window.__mediauseTiktok = {
    accountHealth: accountHealth,
    searchPosts: searchPosts,
    getExplore: getExplore,
    getLive: getLive,
    getFollowing: getFollowing,
    getFriends: getFriends,
    getNotifications: getNotifications,
    userProfile: userProfile,
    userVideos: userVideos,
    creatorVideos: creatorVideos,
    engageFollow: engageFollow,
    engageUnfollow: engageUnfollow,
    engageLike: engageLike,
    engageUnlike: engageUnlike,
    engageSave: engageSave,
    engageUnsave: engageUnsave,
    engageComment: engageComment
  };
})();
