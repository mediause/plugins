(function () {
  var helpers = window.__mediauseInstagramHelpers || {};

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

  function normalizeLimit(value, fallbackValue, maxValue) {
    if (typeof helpers.normalizeLimit === 'function') {
      return helpers.normalizeLimit(value, fallbackValue, maxValue);
    }
    return fallbackValue;
  }

  function normalizeText(value) {
    if (typeof helpers.normalizeText === 'function') {
      return helpers.normalizeText(value);
    }
    return String(value || '').trim();
  }

  function trimText(value, maxLen) {
    if (typeof helpers.trimText === 'function') {
      return helpers.trimText(value, maxLen);
    }
    return String(value || '').slice(0, maxLen);
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function visibleText(el) {
    if (!el) {
      return '';
    }
    return normalizeText(el.textContent || el.innerText || '');
  }

  function isVisible(el) {
    if (!el || !el.isConnected) {
      return false;
    }
    var style = window.getComputedStyle(el);
    if (!style) {
      return true;
    }
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function findVisibleButton(labels) {
    var targets = (labels || []).map(function (x) {
      return normalizeText(x).toLowerCase();
    }).filter(Boolean);

    var all = Array.from(document.querySelectorAll('button, [role="button"]'));
    var i = 0;
    for (i = 0; i < all.length; i += 1) {
      var btn = all[i];
      if (!isVisible(btn)) {
        continue;
      }
      var text = visibleText(btn).toLowerCase();
      if (!text) {
        continue;
      }
      var j = 0;
      for (j = 0; j < targets.length; j += 1) {
        if (text === targets[j] || text.indexOf(targets[j]) >= 0) {
          return btn;
        }
      }
    }
    return null;
  }

  function hasButtonText(root, labels) {
    if (!root) {
      return false;
    }
    return Array.from(root.querySelectorAll('button, div[role="button"], span')).some(function (el) {
      var text = normalizeText(el.textContent || '').toLowerCase();
      return (labels || []).some(function (label) {
        return text === normalizeText(label).toLowerCase();
      });
    });
  }

  async function ensureComposerOpen() {
    var createButton = findVisibleButton(['Create', '创建', '建立', '新建']);
    if (createButton) {
      createButton.click();
      await sleep(300);
    }

    var selectFromComputer = findVisibleButton(['Select from computer', '从电脑选择', '从电脑中选择']);
    if (selectFromComputer) {
      selectFromComputer.click();
      await sleep(250);
    }
  }

  function prepareOpenCliUploadSelector(kind) {
    if (kind === 'reel') {
      document.querySelectorAll('[data-opencli-reel-upload-index]').forEach(function (el) {
        el.removeAttribute('data-opencli-reel-upload-index');
      });

      var dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(function (el) {
        return isVisible(el);
      });
      var roots = dialogs.length ? dialogs : [document.body];
      var reelIndex = 0;
      var reelSelectors = [];

      roots.forEach(function (root) {
        Array.from(root.querySelectorAll('input[type="file"]')).forEach(function (input) {
          if (!input || input.disabled) {
            return;
          }
          var accept = String(input.getAttribute('accept') || '').toLowerCase();
          if (accept && accept.indexOf('video') < 0 && accept.indexOf('.mp4') < 0) {
            return;
          }

          input.setAttribute('data-opencli-reel-upload-index', String(reelIndex));
          reelSelectors.push('[data-opencli-reel-upload-index="' + String(reelIndex) + '"]');
          reelIndex += 1;
        });
      });

      return reelSelectors[0] || null;
    }

    document.querySelectorAll('[data-opencli-ig-upload-index]').forEach(function (el) {
      el.removeAttribute('data-opencli-ig-upload-index');
    });

    var inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    var candidates = inputs.filter(function (el) {
      return !!el && !el.disabled;
    });

    var dialogInputs = candidates.filter(function (el) {
      var dialog = el.closest('[role="dialog"]');
      return hasButtonText(dialog, ['Select from computer', '从电脑中选择']);
    });

    var visibleDialogInputs = dialogInputs.filter(function (el) {
      var dialog = el.closest('[role="dialog"]');
      return !!dialog && isVisible(dialog);
    });

    var primary = visibleDialogInputs.length
      ? [visibleDialogInputs[visibleDialogInputs.length - 1]]
      : dialogInputs.length
        ? [dialogInputs[dialogInputs.length - 1]]
        : [];

    var ordered = primary.concat(candidates).filter(function (el, idx, arr) {
      return arr.indexOf(el) === idx;
    });

    if (!ordered.length) {
      return null;
    }

    ordered.forEach(function (input, index) {
      input.setAttribute('data-opencli-ig-upload-index', String(index));
    });

    return '[data-opencli-ig-upload-index="0"]';
  }

  async function prepareUploadInput(kind) {
    await ensureComposerOpen();

    var attempts = 20;
    var i = 0;
    for (i = 0; i < attempts; i += 1) {
      var selector = prepareOpenCliUploadSelector(kind);
      if (selector) {
        return {
          ok: true,
          selector: selector
        };
      }
      await sleep(250);
      if (i === 6) {
        await ensureComposerOpen();
      }
    }

    return {
      ok: false,
      error: 'upload input not found'
    };
  }

  async function clickButtonByLabels(labels) {
    var btn = findVisibleButton(labels);
    if (!btn) {
      return false;
    }
    btn.click();
    await sleep(300);
    return true;
  }

  async function advanceToCaptionStage(maxNextClicks) {
    var tries = 0;
    var limit = Number(maxNextClicks) || 2;
    while (tries <= limit) {
      var hasCaption = !!document.querySelector('textarea[aria-label*="caption" i], textarea, [contenteditable="true"][aria-label*="caption" i]');
      var hasShare = !!findVisibleButton(['Share', '分享']);
      if (hasCaption || hasShare) {
        return true;
      }

      var clicked = await clickButtonByLabels(['Next', '下一步']);
      if (!clicked) {
        await sleep(400);
      }
      tries += 1;
    }
    return !!findVisibleButton(['Share', '分享']);
  }

  async function fillCaptionText(text) {
    var value = String(text || '');
    if (!value) {
      return true;
    }

    var textarea = document.querySelector('textarea[aria-label*="caption" i], textarea');
    if (textarea) {
      textarea.focus();
      textarea.value = value;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(150);
      return true;
    }

    var editor = document.querySelector('[contenteditable="true"][aria-label*="caption" i], [contenteditable="true"]');
    if (editor) {
      editor.focus();
      editor.textContent = value;
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
      await sleep(150);
      return true;
    }

    return false;
  }

  async function waitForPublishDone(kind) {
    var retries = 120;
    var i = 0;
    for (i = 0; i < retries; i += 1) {
      var url = String(location.href || '');
      var body = visibleText(document.body).toLowerCase();

      if (kind === 'feed' && /\/p\//.test(url)) {
        return { ok: true, url: url };
      }
      if (kind === 'reel' && /\/reel\//.test(url)) {
        return { ok: true, url: url };
      }
      if (kind === 'story' && (/\/stories\//.test(url) || body.indexOf('your story') >= 0 || body.indexOf('你的快拍') >= 0)) {
        return { ok: true, url: url };
      }

      if (body.indexOf('could not be shared') >= 0 || body.indexOf('share failed') >= 0 || body.indexOf('无法分享') >= 0 || body.indexOf('分享失败') >= 0) {
        return { ok: false, error: 'share failed' };
      }

      await sleep(500);
    }

    return { ok: false, error: 'share timeout' };
  }

  async function finalizePostPublish(kind, captionText) {
    var staged = await advanceToCaptionStage(kind === 'reel' ? 3 : 2);
    if (!staged) {
      return { ok: false, error: 'caption/share stage not available' };
    }

    var filled = await fillCaptionText(captionText || '');
    if (!filled && captionText) {
      return { ok: false, error: 'caption editor not found' };
    }

    var clicked = await clickButtonByLabels(['Share', '分享']);
    if (!clicked) {
      return { ok: false, error: 'share button not found' };
    }

    return waitForPublishDone(kind);
  }

  async function finalizeStoryPublish() {
    var clicked = await clickButtonByLabels(['Your story', 'Add to story', '你的快拍', '分享到快拍']);
    if (!clicked) {
      var share = findVisibleButton(['Share', '分享']);
      if (share) {
        share.click();
      } else {
        return { ok: false, error: 'story publish button not found' };
      }
    }

    return waitForPublishDone('story');
  }

  var INSTAGRAM_NOTE_DOC_ID = '25155183657506484';
  var INSTAGRAM_NOTE_MUTATION_NAME = 'usePolarisCreateInboxTrayItemSubmitMutation';
  var INSTAGRAM_NOTE_ROOT_FIELD = 'xdt_create_inbox_tray_item';

  function pickFromSource(source, patterns) {
    var i = 0;
    for (i = 0; i < patterns.length; i += 1) {
      var match = source.match(patterns[i]);
      if (!match) {
        continue;
      }
      var index = 1;
      for (index = 1; index < match.length; index += 1) {
        if (match[index]) {
          return match[index];
        }
      }
      return match[0] || '';
    }
    return '';
  }

  function readCookie(name) {
    var prefix = String(name) + '=';
    var parts = String(document.cookie || '').split('; ');
    var i = 0;
    for (i = 0; i < parts.length; i += 1) {
      if (parts[i].indexOf(prefix) === 0) {
        return decodeURIComponent(parts[i].slice(prefix.length));
      }
    }
    return '';
  }

  function deriveJazoest(token) {
    if (!token) {
      return '';
    }

    return '2' + Array.from(token).reduce(function (total, ch) {
      return total + ch.charCodeAt(0);
    }, 0);
  }

  async function publishInstagramNote(content) {
    var html = document.documentElement && document.documentElement.outerHTML || '';
    var scripts = Array.from(document.scripts || []).map(function (script) {
      return script && script.textContent || '';
    }).join('\n');
    var source = html + '\n' + scripts;

    var actorId = pickFromSource(source, [
      /"actorID":"(\d+)"/,
      /"actor_id":"(\d+)"/,
      /"viewerId":"(\d+)"/
    ]);

    var fbDtsg = pickFromSource(source, [
      /(NAF[a-zA-Z0-9:_-]{20,})/,
      /(NAf[a-zA-Z0-9:_-]{20,})/
    ]);

    var lsd = pickFromSource(source, [
      /"LSD",\[\],\{"token":"([^"]+)"\}/,
      /"lsd":"([^"]+)"/
    ]);

    var appId = pickFromSource(source, [
      /"X-IG-App-ID":"(\d+)"/,
      /"instagramWebAppId":"(\d+)"/,
      /"appId":"(\d+)"/
    ]) || String(helpers.APP_ID || '');

    var asbdId = pickFromSource(source, [
      /"X-ASBD-ID":"(\d+)"/,
      /"asbd_id":"(\d+)"/
    ]);

    var spinR = pickFromSource(source, [
      /"__spin_r":(\d+)/
    ]);

    var spinB = pickFromSource(source, [
      /"__spin_b":"([^"]+)"/
    ]);

    var spinT = pickFromSource(source, [
      /"__spin_t":(\d+)/
    ]);

    var csrfToken = readCookie('csrftoken') || pickFromSource(source, [
      /"csrf_token":"([^"]+)"/,
      /"csrfToken":"([^"]+)"/
    ]);

    var jazoest = deriveJazoest(fbDtsg);

    if (!actorId || !fbDtsg || !lsd || !appId || !csrfToken || !spinR || !spinB || !spinT || !jazoest) {
      return {
        ok: false,
        stage: 'config',
        text: JSON.stringify({
          actorId: Boolean(actorId),
          fbDtsg: Boolean(fbDtsg),
          lsd: Boolean(lsd),
          appId: Boolean(appId),
          csrfToken: Boolean(csrfToken),
          spinR: Boolean(spinR),
          spinB: Boolean(spinB),
          spinT: Boolean(spinT),
          jazoest: Boolean(jazoest)
        })
      };
    }

    var variables = {
      input: {
        actor_id: actorId,
        client_mutation_id: '1',
        additional_params: {
          note_create_params: {
            note_style: 0,
            text: content
          }
        },
        audience: 0,
        inbox_tray_item_type: 'note'
      }
    };

    var body = new URLSearchParams();
    body.set('av', actorId);
    body.set('__user', '0');
    body.set('__a', '1');
    body.set('__req', '1');
    body.set('__hs', '');
    body.set('dpr', String(window.devicePixelRatio || 1));
    body.set('__ccg', 'UNKNOWN');
    body.set('__rev', spinR);
    body.set('__s', '');
    body.set('__hsi', '');
    body.set('__dyn', '');
    body.set('__csr', '');
    body.set('__comet_req', '7');
    body.set('fb_dtsg', fbDtsg);
    body.set('jazoest', jazoest);
    body.set('lsd', lsd);
    body.set('__spin_r', spinR);
    body.set('__spin_b', spinB);
    body.set('__spin_t', spinT);
    body.set('fb_api_caller_class', 'RelayModern');
    body.set('fb_api_req_friendly_name', INSTAGRAM_NOTE_MUTATION_NAME);
    body.set('variables', JSON.stringify(variables));
    body.set('server_timestamps', 'true');
    body.set('doc_id', INSTAGRAM_NOTE_DOC_ID);

    var headers = {
      Accept: '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': csrfToken,
      'X-FB-Friendly-Name': INSTAGRAM_NOTE_MUTATION_NAME,
      'X-FB-LSD': lsd,
      'X-IG-App-ID': appId,
      'X-Root-Field-Name': INSTAGRAM_NOTE_ROOT_FIELD
    };

    if (asbdId) {
      headers['X-ASBD-ID'] = asbdId;
    }

    var response = await fetch('/graphql/query', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: body.toString()
    });

    var text = await response.text();
    var normalizedText = String(text || '').replace(/^for \(;;\);?/, '').trim();

    var data = null;
    if (normalizedText) {
      try {
        data = JSON.parse(normalizedText);
      } catch (_error) {
        data = null;
      }
    }

    var note = data && data.data && data.data[INSTAGRAM_NOTE_ROOT_FIELD] && data.data[INSTAGRAM_NOTE_ROOT_FIELD].inbox_tray_item;
    var noteId = String(note && (note.inbox_tray_item_id || note.id) || '');

    if (response.ok && noteId) {
      return {
        ok: true,
        stage: 'publish',
        noteId: noteId,
        text: String(note && note.note_dict && note.note_dict.text || content)
      };
    }

    return {
      ok: false,
      stage: 'publish',
      status: response.status,
      text: normalizedText || text
    };
  }

  async function accountHealth() {
    try {
      var userId = typeof helpers.dsUserId === 'function' ? helpers.dsUserId() : '';
      var login = !!userId;
      var nick = null;

      var profileAnchor = document.querySelector('a[href^="/"][role="link"] img[alt], nav a[href^="/"] img[alt]');
      if (profileAnchor && profileAnchor.getAttribute) {
        nick = normalizeText(profileAnchor.getAttribute('alt') || '').replace(/\s*profile photo$/i, '') || null;
      }

      return helpers.successAccount({
        healthy: true,
        account: {
          id: userId || null,
          nick: nick,
          login: login
        }
      });
    } catch (error) {
      return errorResult('instagram.account.health_failed', 'account health failed', String(error));
    }
  }

  async function searchUsers(payload) {
    try {
      var query = normalizeText(payload && payload.query);
      var limit = normalizeLimit(payload && payload.limit, 10, 50);
      if (!query) {
        return errorResult('instagram.search.query_required', 'query is required');
      }

      var response = await helpers.igFetchJson(
        'https://www.instagram.com/web/search/topsearch/?query=' + encodeURIComponent(query) + '&context=user',
        {
          credentials: 'include',
          headers: helpers.defaultHeaders()
        }
      );

      if (!response.ok) {
        return errorResult('instagram.search.failed', 'search users failed', 'HTTP ' + String(response.status));
      }

      var users = (response.data && response.data.users) || [];
      var rows = users.slice(0, limit).map(function (item, index) {
        var user = (item && item.user) || {};
        return {
          rank: index + 1,
          username: user.username || '',
          name: user.full_name || '',
          verified: user.is_verified ? 'Yes' : 'No',
          private: user.is_private ? 'Yes' : 'No',
          url: 'https://www.instagram.com/' + String(user.username || '') + '/'
        };
      });

      return successItems(rows);
    } catch (error) {
      return errorResult('instagram.search.failed', 'search users failed', String(error));
    }
  }

  async function getExplore(payload) {
    try {
      var limit = normalizeLimit(payload && payload.limit, 20, 50);
      var response = await helpers.igFetchJson(
        'https://www.instagram.com/api/v1/discover/web/explore_grid/',
        {
          credentials: 'include',
          headers: helpers.defaultHeaders()
        }
      );

      if (!response.ok) {
        return errorResult('instagram.get.explore_failed', 'get explore failed', 'HTTP ' + String(response.status));
      }

      var rows = [];
      var sections = (response.data && response.data.sectional_items) || [];
      var i = 0;
      for (i = 0; i < sections.length; i += 1) {
        var medias = (((sections[i] || {}).layout_content || {}).medias) || [];
        var j = 0;
        for (j = 0; j < medias.length; j += 1) {
          var media = (medias[j] || {}).media;
          if (!media) {
            continue;
          }
          rows.push({
            rank: rows.length + 1,
            user: media.user && media.user.username || '',
            caption: trimText(media.caption && media.caption.text, 100),
            likes: media.like_count || 0,
            comments: media.comment_count || 0,
            type: helpers.mediaTypeName(media.media_type)
          });
          if (rows.length >= limit) {
            return successItems(rows);
          }
        }
      }

      return successItems(rows.slice(0, limit));
    } catch (error) {
      return errorResult('instagram.get.explore_failed', 'get explore failed', String(error));
    }
  }

  async function getSaved(payload) {
    try {
      var limit = normalizeLimit(payload && payload.limit, 20, 50);
      var collection = normalizeText(payload && payload.collection);
      var endpoint = 'https://www.instagram.com/api/v1/feed/saved/posts/';

      if (collection) {
        var listResponse = await helpers.igFetchJson(
          'https://www.instagram.com/api/v1/collections/list/?collection_types=%5B%22MEDIA%22%2C%22ALL_MEDIA_AUTO_COLLECTION%22%5D',
          {
            credentials: 'include',
            headers: helpers.defaultHeaders()
          }
        );

        if (!listResponse.ok) {
          return errorResult('instagram.get.saved_collections_failed', 'failed to load collections', 'HTTP ' + String(listResponse.status));
        }

        var items = (listResponse.data && listResponse.data.items) || [];
        var match = items.find(function (item) {
          return normalizeText(item && item.collection_name).toLowerCase() === collection.toLowerCase();
        });

        if (!match || !match.collection_id) {
          return errorResult('instagram.get.collection_not_found', 'collection not found', collection);
        }

        endpoint = 'https://www.instagram.com/api/v1/feed/collection/' + encodeURIComponent(String(match.collection_id)) + '/posts/';
      }

      var response = await helpers.igFetchJson(endpoint, {
        credentials: 'include',
        headers: helpers.defaultHeaders()
      });

      if (!response.ok) {
        return errorResult('instagram.get.saved_failed', 'get saved failed', 'HTTP ' + String(response.status));
      }

      var rows = ((response.data && response.data.items) || []).slice(0, limit).map(function (item, index) {
        var media = item && item.media || {};
        return {
          index: index + 1,
          user: media.user && media.user.username || '',
          caption: trimText(media.caption && media.caption.text, 100),
          likes: media.like_count || 0,
          comments: media.comment_count || 0,
          type: helpers.mediaTypeName(media.media_type)
        };
      });

      return successItems(rows);
    } catch (error) {
      return errorResult('instagram.get.saved_failed', 'get saved failed', String(error));
    }
  }

  async function userProfile(payload) {
    try {
      var user = await helpers.resolveUser(payload && payload.username);
      return successItems([{
        username: user.username || '',
        name: user.full_name || '',
        bio: trimText(user.biography, 200),
        followers: user.edge_followed_by && user.edge_followed_by.count || 0,
        following: user.edge_follow && user.edge_follow.count || 0,
        posts: user.edge_owner_to_timeline_media && user.edge_owner_to_timeline_media.count || 0,
        verified: user.is_verified ? 'Yes' : 'No',
        private: user.is_private ? 'Yes' : 'No',
        url: 'https://www.instagram.com/' + String(user.username || '') + '/'
      }]);
    } catch (error) {
      return errorResult('instagram.user.profile_failed', 'user profile failed', String(error));
    }
  }

  async function userFeed(payload) {
    try {
      var user = await helpers.resolveUser(payload && payload.username);
      var limit = normalizeLimit(payload && payload.limit, 12, 50);
      var response = await helpers.igFetchJson(
        'https://www.instagram.com/api/v1/feed/user/' + encodeURIComponent(String(user.id)) + '/?count=' + String(limit),
        {
          credentials: 'include',
          headers: helpers.defaultHeaders()
        }
      );

      if (!response.ok) {
        return errorResult('instagram.user.feed_failed', 'user feed failed', 'HTTP ' + String(response.status));
      }

      var rows = ((response.data && response.data.items) || []).slice(0, limit).map(function (post, index) {
        return helpers.formatPostRow(post, index + 1);
      });

      return successItems(rows);
    } catch (error) {
      return errorResult('instagram.user.feed_failed', 'user feed failed', String(error));
    }
  }

  async function userFollowers(payload) {
    try {
      var user = await helpers.resolveUser(payload && payload.username);
      var limit = normalizeLimit(payload && payload.limit, 20, 50);
      var response = await helpers.igFetchJson(
        'https://www.instagram.com/api/v1/friendships/' + encodeURIComponent(String(user.id)) + '/followers/?count=' + String(limit),
        {
          credentials: 'include',
          headers: helpers.defaultHeaders()
        }
      );

      if (!response.ok) {
        return errorResult('instagram.user.followers_failed', 'user followers failed', 'HTTP ' + String(response.status));
      }

      var rows = ((response.data && response.data.users) || []).slice(0, limit).map(function (entry, index) {
        return {
          rank: index + 1,
          username: entry.username || '',
          name: entry.full_name || '',
          verified: entry.is_verified ? 'Yes' : 'No',
          private: entry.is_private ? 'Yes' : 'No'
        };
      });

      return successItems(rows);
    } catch (error) {
      return errorResult('instagram.user.followers_failed', 'user followers failed', String(error));
    }
  }

  async function userFollowing(payload) {
    try {
      var user = await helpers.resolveUser(payload && payload.username);
      var limit = normalizeLimit(payload && payload.limit, 20, 50);
      var response = await helpers.igFetchJson(
        'https://www.instagram.com/api/v1/friendships/' + encodeURIComponent(String(user.id)) + '/following/?count=' + String(limit),
        {
          credentials: 'include',
          headers: helpers.defaultHeaders()
        }
      );

      if (!response.ok) {
        return errorResult('instagram.user.following_failed', 'user following failed', 'HTTP ' + String(response.status));
      }

      var rows = ((response.data && response.data.users) || []).slice(0, limit).map(function (entry, index) {
        return {
          rank: index + 1,
          username: entry.username || '',
          name: entry.full_name || '',
          verified: entry.is_verified ? 'Yes' : 'No',
          private: entry.is_private ? 'Yes' : 'No'
        };
      });

      return successItems(rows);
    } catch (error) {
      return errorResult('instagram.user.following_failed', 'user following failed', String(error));
    }
  }

  async function engageFollow(payload) {
    try {
      var user = await helpers.resolveUser(payload && payload.username);
      var data = await helpers.postForm(
        'https://www.instagram.com/api/v1/friendships/create/' + encodeURIComponent(String(user.id)) + '/',
        ''
      );

      var friendship = data && data.friendship_status || {};
      var status = friendship.following ? 'Following' : friendship.outgoing_request ? 'Request sent' : 'Followed';
      return successItems([{ status: status, username: user.username || '' }]);
    } catch (error) {
      return errorResult('instagram.engage.follow_failed', 'follow failed', String(error));
    }
  }

  async function engageUnfollow(payload) {
    try {
      var user = await helpers.resolveUser(payload && payload.username);
      await helpers.postForm(
        'https://www.instagram.com/api/v1/friendships/destroy/' + encodeURIComponent(String(user.id)) + '/',
        ''
      );
      return successItems([{ status: 'Unfollowed', username: user.username || '' }]);
    } catch (error) {
      return errorResult('instagram.engage.unfollow_failed', 'unfollow failed', String(error));
    }
  }

  async function engageLike(payload) {
    try {
      var resolved = await helpers.resolveUserPostByIndex(payload && payload.username, payload && payload.index);
      await helpers.postForm('https://www.instagram.com/api/v1/web/likes/' + encodeURIComponent(String(resolved.post.pk)) + '/like/', '');
      return successItems([{ status: 'Liked', user: resolved.user.username || '', post: trimText(resolved.post.caption && resolved.post.caption.text, 80) }]);
    } catch (error) {
      return errorResult('instagram.engage.like_failed', 'like failed', String(error));
    }
  }

  async function engageUnlike(payload) {
    try {
      var resolved = await helpers.resolveUserPostByIndex(payload && payload.username, payload && payload.index);
      await helpers.postForm('https://www.instagram.com/api/v1/web/likes/' + encodeURIComponent(String(resolved.post.pk)) + '/unlike/', '');
      return successItems([{ status: 'Unliked', user: resolved.user.username || '', post: trimText(resolved.post.caption && resolved.post.caption.text, 80) }]);
    } catch (error) {
      return errorResult('instagram.engage.unlike_failed', 'unlike failed', String(error));
    }
  }

  async function engageSave(payload) {
    try {
      var resolved = await helpers.resolveUserPostByIndex(payload && payload.username, payload && payload.index);
      await helpers.postForm('https://www.instagram.com/api/v1/web/save/' + encodeURIComponent(String(resolved.post.pk)) + '/save/', '');
      return successItems([{ status: 'Saved', user: resolved.user.username || '', post: trimText(resolved.post.caption && resolved.post.caption.text, 80) }]);
    } catch (error) {
      return errorResult('instagram.engage.save_failed', 'save failed', String(error));
    }
  }

  async function engageUnsave(payload) {
    try {
      var resolved = await helpers.resolveUserPostByIndex(payload && payload.username, payload && payload.index);
      await helpers.postForm('https://www.instagram.com/api/v1/web/save/' + encodeURIComponent(String(resolved.post.pk)) + '/unsave/', '');
      return successItems([{ status: 'Unsaved', user: resolved.user.username || '', post: trimText(resolved.post.caption && resolved.post.caption.text, 80) }]);
    } catch (error) {
      return errorResult('instagram.engage.unsave_failed', 'unsave failed', String(error));
    }
  }

  async function engageComment(payload) {
    try {
      var text = normalizeText(payload && payload.text);
      if (!text) {
        return errorResult('instagram.engage.comment_text_required', 'text is required');
      }

      var resolved = await helpers.resolveUserPostByIndex(payload && payload.username, payload && payload.index);
      await helpers.postForm(
        'https://www.instagram.com/api/v1/web/comments/' + encodeURIComponent(String(resolved.post.pk)) + '/add/',
        'comment_text=' + encodeURIComponent(text)
      );

      return successItems([{ status: 'Commented', user: resolved.user.username || '', text: text }]);
    } catch (error) {
      return errorResult('instagram.engage.comment_failed', 'comment failed', String(error));
    }
  }

  async function collectionCreate(payload) {
    try {
      var name = normalizeText(payload && payload.name);
      if (!name) {
        return errorResult('instagram.collection.name_required', 'name is required');
      }

      var body = 'name=' + encodeURIComponent(name) + '&module_name=collection_create';
      var response = await helpers.igFetchJson(
        'https://www.instagram.com/api/v1/collections/create/',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-IG-App-ID': helpers.APP_ID,
            'X-CSRFToken': helpers.csrfToken()
          },
          body: (function () {
            var form = new FormData();
            form.append('name', name);
            form.append('module_name', 'collection_create');
            return form;
          })()
        }
      );

      if (!response.ok) {
        return errorResult('instagram.collection.create_failed', 'create collection failed', 'HTTP ' + String(response.status));
      }

      var data = response.data || {};
      return successItems([{
        status: 'Created',
        collectionId: String(data.collection_id || ''),
        collectionName: String(data.collection_name || name),
        mediaCount: data.collection_media_count || 0
      }]);
    } catch (error) {
      return errorResult('instagram.collection.create_failed', 'create collection failed', String(error));
    }
  }

  async function collectionDelete(payload) {
    try {
      var target = normalizeText(payload && payload.target);
      if (!target) {
        return errorResult('instagram.collection.target_required', 'target is required');
      }

      var listResponse = await helpers.igFetchJson(
        'https://www.instagram.com/api/v1/collections/list/?collection_types=%5B%22MEDIA%22%5D',
        {
          credentials: 'include',
          headers: helpers.defaultHeaders()
        }
      );

      if (!listResponse.ok) {
        return errorResult('instagram.collection.list_failed', 'failed to list collections', 'HTTP ' + String(listResponse.status));
      }

      var items = (listResponse.data && listResponse.data.items) || [];
      var idPattern = /^\d{6,}$/;
      var match = null;
      if (idPattern.test(target)) {
        match = items.find(function (item) {
          return String(item && item.collection_id || '') === target;
        }) || null;
      } else {
        match = items.find(function (item) {
          return normalizeText(item && item.collection_name).toLowerCase() === target.toLowerCase();
        }) || null;
      }

      if (!match || !match.collection_id) {
        return errorResult('instagram.collection.not_found', 'collection not found', target);
      }

      var response = await helpers.igFetchJson(
        'https://www.instagram.com/api/v1/collections/' + encodeURIComponent(String(match.collection_id)) + '/delete/',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-IG-App-ID': helpers.APP_ID,
            'X-CSRFToken': helpers.csrfToken()
          },
          body: (function () {
            var form = new FormData();
            form.append('module_name', 'collection_settings');
            return form;
          })()
        }
      );

      if (!response.ok) {
        return errorResult('instagram.collection.delete_failed', 'delete collection failed', 'HTTP ' + String(response.status));
      }

      return successItems([{
        status: 'Deleted',
        collectionId: String(match.collection_id),
        collectionName: String(match.collection_name || '')
      }]);
    } catch (error) {
      return errorResult('instagram.collection.delete_failed', 'delete collection failed', String(error));
    }
  }

  async function postNote(payload) {
    var content = normalizeText(payload && payload.content);
    if (!content) {
      return errorResult('instagram.post.note_content_required', 'content is required');
    }

    if (Array.from(content).length > 60) {
      return errorResult('instagram.post.note_content_too_long', 'content must be 60 characters or fewer');
    }

    try {
      var result = await publishInstagramNote(content);
      if (!result || !result.ok) {
        return errorResult(
          'instagram.post.note_failed',
          'instagram note publish failed at ' + String(result && result.stage || 'unknown'),
          String(result && result.text || 'unknown error')
        );
      }

      return successItems([{
        status: 'Posted',
        detail: 'Instagram note published successfully',
        noteId: String(result.noteId || '')
      }]);
    } catch (error) {
      return errorResult('instagram.post.note_failed', 'instagram note publish failed', String(error));
    }

  }

  async function prepareFeedUpload() {
    try {
      var result = await prepareUploadInput('feed');
      if (!result.ok) {
        return errorResult('instagram.post.feed_prepare_failed', 'feed upload input not found', result.error);
      }
      return {
        success: true,
        data: {
          selector: result.selector
        }
      };
    } catch (error) {
      return errorResult('instagram.post.feed_prepare_failed', 'feed upload input not found', String(error));
    }
  }

  async function prepareReelUpload() {
    try {
      var result = await prepareUploadInput('reel');
      if (!result.ok) {
        return errorResult('instagram.post.reel_prepare_failed', 'reel upload input not found', result.error);
      }
      return {
        success: true,
        data: {
          selector: result.selector
        }
      };
    } catch (error) {
      return errorResult('instagram.post.reel_prepare_failed', 'reel upload input not found', String(error));
    }
  }

  async function prepareStoryUpload() {
    try {
      var result = await prepareUploadInput('story');
      if (!result.ok) {
        return errorResult('instagram.post.story_prepare_failed', 'story upload input not found', result.error);
      }
      return {
        success: true,
        data: {
          selector: result.selector
        }
      };
    } catch (error) {
      return errorResult('instagram.post.story_prepare_failed', 'story upload input not found', String(error));
    }
  }

  async function postFeed(payload) {
    try {
      var result = await finalizePostPublish('feed', payload && payload.text || '');
      if (!result.ok) {
        return errorResult('instagram.post.feed_failed', 'feed publish failed', result.error);
      }

      return successItems([{
        status: 'Posted',
        detail: 'Instagram feed published successfully',
        url: String(result.url || '')
      }]);
    } catch (error) {
      return errorResult('instagram.post.feed_failed', 'feed publish failed', String(error));
    }
  }

  async function postReel(payload) {
    try {
      var result = await finalizePostPublish('reel', payload && payload.text || '');
      if (!result.ok) {
        return errorResult('instagram.post.reel_failed', 'reel publish failed', result.error);
      }

      return successItems([{
        status: 'Posted',
        detail: 'Instagram reel published successfully',
        url: String(result.url || '')
      }]);
    } catch (error) {
      return errorResult('instagram.post.reel_failed', 'reel publish failed', String(error));
    }
  }

  async function postStory() {
    try {
      var result = await finalizeStoryPublish();
      if (!result.ok) {
        return errorResult('instagram.post.story_failed', 'story publish failed', result.error);
      }

      return successItems([{
        status: 'Posted',
        detail: 'Instagram story published successfully',
        url: String(result.url || '')
      }]);
    } catch (error) {
      return errorResult('instagram.post.story_failed', 'story publish failed', String(error));
    }
  }

  async function downloadMedia(payload) {
    try {
      var parsed = helpers.parseInstagramUrl(payload && payload.url);
      var media = await helpers.fetchGraphqlMedia(parsed.shortcode);
      var links = helpers.buildMediaLinks(media);
      if (!links.length) {
        return errorResult('instagram.download.no_media', 'no downloadable media found');
      }

      var rows = links.map(function (url, index) {
        return {
          index: index + 1,
          url: url,
          type: (/\.mp4($|\?)/i.test(url) ? 'video' : 'image')
        };
      });

      return successItems([{
        shortcode: media.shortcode || parsed.shortcode,
        owner: media.owner && media.owner.username || '',
        sourceUrl: parsed.url,
        media: rows
      }]);
    } catch (error) {
      return errorResult('instagram.download.failed', 'download media resolution failed', String(error));
    }
  }

  window.__mediauseInstagram = {
    accountHealth: accountHealth,
    searchUsers: searchUsers,
    getExplore: getExplore,
    getSaved: getSaved,
    userProfile: userProfile,
    userFeed: userFeed,
    userFollowers: userFollowers,
    userFollowing: userFollowing,
    engageFollow: engageFollow,
    engageUnfollow: engageUnfollow,
    engageLike: engageLike,
    engageUnlike: engageUnlike,
    engageSave: engageSave,
    engageUnsave: engageUnsave,
    engageComment: engageComment,
    collectionCreate: collectionCreate,
    collectionDelete: collectionDelete,
    prepareFeedUpload: prepareFeedUpload,
    prepareReelUpload: prepareReelUpload,
    prepareStoryUpload: prepareStoryUpload,
    postNote: postNote,
    postFeed: postFeed,
    postReel: postReel,
    postStory: postStory,
    downloadMedia: downloadMedia
  };
})();