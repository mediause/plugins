(function () {
  var BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
  var QUERY_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

  function ok(data) {
    return { success: true, data: data };
  }

  function fail(code, message, details) {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function visible(element) {
    return !!element && (element.offsetParent !== null || element.getClientRects().length > 0);
  }

  function getCookie(name) {
    var prefix = String(name) + '=';
    var parts = document.cookie.split(';');
    for (var index = 0; index < parts.length; index += 1) {
      var part = parts[index].trim();
      if (part.indexOf(prefix) === 0) {
        return part.slice(prefix.length);
      }
    }
    return null;
  }

  function getCsrfToken() {
    return getCookie('ct0');
  }

  function getAuthHeaders() {
    var ct0 = getCsrfToken();
    if (!ct0) {
      throw new Error('No ct0 cookie. Are you logged into x.com?');
    }

    return {
      Authorization: 'Bearer ' + decodeURIComponent(BEARER_TOKEN),
      'X-Csrf-Token': ct0,
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'X-Twitter-Active-User': 'yes'
    };
  }

  function normalizeScreenName(value) {
    return String(value || '').trim().replace(/^\/+/, '').replace(/^@+/, '');
  }

  function sanitizeQueryId(resolved, fallbackId) {
    return typeof resolved === 'string' && QUERY_ID_PATTERN.test(resolved) ? resolved : fallbackId;
  }

  async function resolveQueryId(operationName, fallbackId) {
    var resolved = null;

    try {
      var controller = new AbortController();
      var timeoutId = setTimeout(function () {
        controller.abort();
      }, 5000);
      var ghResp = await fetch('https://raw.githubusercontent.com/fa0311/twitter-openapi/refs/heads/main/src/config/placeholder.json', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (ghResp.ok) {
        var data = await ghResp.json();
        if (data && data[operationName] && data[operationName].queryId) {
          resolved = data[operationName].queryId;
        }
      }
    } catch (error) {
    }

    if (sanitizeQueryId(resolved, null)) {
      return sanitizeQueryId(resolved, fallbackId);
    }

    try {
      var resources = performance.getEntriesByType('resource') || [];
      var scripts = resources.filter(function (resource) {
        return resource && resource.name && resource.name.indexOf('client-web') >= 0 && /\.js(\?|$)/.test(resource.name);
      }).map(function (resource) {
        return resource.name;
      });

      for (var index = 0; index < Math.min(scripts.length, 15); index += 1) {
        try {
          var scriptText = await (await fetch(scripts[index])).text();
          var matcher = new RegExp('queryId:"([A-Za-z0-9_-]+)"[^}]{0,200}operationName:"' + operationName + '"');
          var match = scriptText.match(matcher);
          if (match && match[1]) {
            resolved = match[1];
            break;
          }
        } catch (error) {
        }
      }
    } catch (error) {
    }

    return sanitizeQueryId(resolved, fallbackId);
  }

  async function fetchGraphql(config) {
    var queryId = await resolveQueryId(config.operationName, config.fallbackQueryId);
    var url = '/i/api/graphql/' + queryId + '/' + config.endpoint;
    var hasQuery = false;

    if (config.variables !== undefined) {
      url += '?variables=' + encodeURIComponent(JSON.stringify(config.variables));
      hasQuery = true;
    }

    if (config.features !== undefined) {
      url += (hasQuery ? '&' : '?') + 'features=' + encodeURIComponent(JSON.stringify(config.features));
    }

    var response = await fetch(url, {
      method: config.method || 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + config.endpoint);
    }

    return response.json();
  }

  function getLoggedInUsername() {
    var profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    if (profileLink) {
      return normalizeScreenName(profileLink.getAttribute('href'));
    }

    var pathMatch = window.location.pathname.match(/^\/([^\/]+)$/);
    if (pathMatch && pathMatch[1] && pathMatch[1] !== 'home' && pathMatch[1] !== 'explore') {
      return normalizeScreenName(pathMatch[1]);
    }

    return '';
  }

  function extractMedia(legacy) {
    var media = (legacy && legacy.extended_entities && legacy.extended_entities.media)
      || (legacy && legacy.entities && legacy.entities.media);
    var urls = [];

    if (!Array.isArray(media)) {
      return { has_media: false, media_urls: [] };
    }

    for (var index = 0; index < media.length; index += 1) {
      var item = media[index];
      if (!item) {
        continue;
      }

      if (item.type === 'video' || item.type === 'animated_gif') {
        var variants = (item.video_info && item.video_info.variants) || [];
        var mp4 = variants.find(function (variant) {
          return variant && variant.content_type === 'video/mp4';
        });
        if (mp4 && mp4.url) {
          urls.push(mp4.url);
        } else if (item.media_url_https) {
          urls.push(item.media_url_https);
        }
      } else if (item.media_url_https) {
        urls.push(item.media_url_https);
      }
    }

    return {
      has_media: urls.length > 0,
      media_urls: urls
    };
  }

  function toPositiveInt(value, fallbackValue, maxValue) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      parsed = fallbackValue;
    }
    if (maxValue && parsed > maxValue) {
      parsed = maxValue;
    }
    return Math.floor(parsed);
  }

  function findStatusHref(root) {
    var links = root.querySelectorAll('a[href*="/status/"]');
    for (var index = 0; index < links.length; index += 1) {
      var href = links[index].getAttribute('href') || '';
      if (/\/status\/\d+/.test(href)) {
        return href;
      }
    }
    return '';
  }

  function extractTweetCard(article) {
    var href = findStatusHref(article);
    if (!href) {
      return null;
    }

    var match = href.match(/^\/([^\/]+)\/status\/(\d+)/);
    if (!match) {
      return null;
    }

    var textElement = article.querySelector('[data-testid="tweetText"]') || article.querySelector('[lang]');
    var timeElement = article.querySelector('time');
    var hasMedia = !!article.querySelector('[data-testid="tweetPhoto"], video');

    return {
      id: match[2],
      author: match[1],
      text: textElement ? String(textElement.innerText || textElement.textContent || '').trim() : '',
      created_at: timeElement ? (timeElement.getAttribute('datetime') || String(timeElement.textContent || '').trim()) : '',
      url: 'https://x.com' + href.split('?')[0],
      has_media: hasMedia,
      media_urls: []
    };
  }

  function extractTweetCards(limit) {
    var articles = document.querySelectorAll('article');
    var tweets = [];
    var seen = {};

    for (var index = 0; index < articles.length; index += 1) {
      var tweet = extractTweetCard(articles[index]);
      if (!tweet || !tweet.id || seen[tweet.id]) {
        continue;
      }
      seen[tweet.id] = true;
      tweets.push(tweet);
      if (tweets.length >= limit) {
        break;
      }
    }

    return tweets;
  }

  function extractFollowersFromDom() {
    var cells = document.querySelectorAll('[data-testid="UserCell"]');
    var results = [];

    for (var index = 0; index < cells.length; index += 1) {
      var cell = cells[index];
      var stripTexts = {};
      var buttons = cell.querySelectorAll('[data-testid$="-follow"],[data-testid$="-unfollow"],[data-testid="userFollowIndicator"]');

      for (var buttonIndex = 0; buttonIndex < buttons.length; buttonIndex += 1) {
        var buttonText = String(buttons[buttonIndex].innerText || '').trim();
        if (buttonText) {
          stripTexts[buttonText] = true;
        }
      }

      var lines = String(cell.innerText || '')
        .split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line && !stripTexts[line]; });

      var screenName = '';
      var remaining = [];

      for (var lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        if (!screenName && lines[lineIndex].charAt(0) === '@') {
          screenName = lines[lineIndex].slice(1).split(/\s/)[0];
        } else {
          remaining.push(lines[lineIndex]);
        }
      }

      if (!screenName) {
        var avatar = cell.querySelector('[data-testid^="UserAvatar-Container-"]');
        var testId = avatar ? (avatar.getAttribute('data-testid') || '') : '';
        if (testId.indexOf('UserAvatar-Container-') === 0) {
          screenName = testId.slice('UserAvatar-Container-'.length);
        }
      }

      if (screenName) {
        results.push({
          screen_name: screenName,
          name: remaining[0] || screenName,
          bio: remaining.slice(1).join(' ').replace(/\s+/g, ' ').trim()
        });
      }
    }

    return results;
  }

  async function insertComposerText(text) {
    var boxes = Array.prototype.slice.call(document.querySelectorAll('[data-testid="tweetTextarea_0"]'));
    var box = boxes.find(visible) || boxes[0];
    if (!box) {
      throw new Error('Could not find a visible composer text area.');
    }

    box.focus();
    if (!document.execCommand('insertText', false, text)) {
      var transfer = new DataTransfer();
      transfer.setData('text/plain', text);
      box.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: transfer,
        bubbles: true,
        cancelable: true
      }));
    }

    await sleep(600);
    var currentText = String(box.innerText || box.textContent || '').replace(/\u00a0/g, ' ');
    if (currentText.indexOf(text) === -1) {
      throw new Error('Could not verify composer text after input.');
    }
  }

  async function clickComposerSubmit() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]'));
    var button = buttons.find(function (element) {
      return visible(element) && !element.disabled && element.getAttribute('aria-disabled') !== 'true';
    });

    if (!button) {
      throw new Error('Tweet button is disabled or not found.');
    }

    button.click();
    await sleep(1500);
  }

  async function waitForSelector(selector, attempts, delayMs) {
    for (var index = 0; index < attempts; index += 1) {
      var element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await sleep(delayMs);
    }
    return null;
  }

  async function toggleAction(config) {
    var attempts = config.attempts || 20;
    var delayMs = config.delayMs || 500;

    for (var index = 0; index < attempts; index += 1) {
      if (config.alreadySelector && document.querySelector(config.alreadySelector)) {
        return { changed: false, message: config.alreadyMessage };
      }

      var button = document.querySelector(config.actionSelector);
      if (button) {
        button.click();
        await sleep(config.verifyDelayMs || 1200);
        if (config.verifySelector && document.querySelector(config.verifySelector)) {
          return { changed: true, message: config.successMessage };
        }
        if (!config.verifySelector) {
          return { changed: true, message: config.successMessage };
        }
      }

      await sleep(delayMs);
    }

    throw new Error(config.failureMessage);
  }

  function parseStatusUrl(url) {
    var value = String(url || '');
    var match = value.match(/https?:\/\/x\.com\/([^\/]+)\/status\/(\d+)/i);
    if (!match) {
      throw new Error('Invalid tweet url: ' + value);
    }
    return {
      author: match[1],
      id: match[2]
    };
  }

  window.__mediauseTwitterHelpers = {
    ok: ok,
    fail: fail,
    sleep: sleep,
    visible: visible,
    getCsrfToken: getCsrfToken,
    getAuthHeaders: getAuthHeaders,
    normalizeScreenName: normalizeScreenName,
    sanitizeQueryId: sanitizeQueryId,
    resolveQueryId: resolveQueryId,
    fetchGraphql: fetchGraphql,
    getLoggedInUsername: getLoggedInUsername,
    extractMedia: extractMedia,
    toPositiveInt: toPositiveInt,
    extractTweetCards: extractTweetCards,
    extractFollowersFromDom: extractFollowersFromDom,
    insertComposerText: insertComposerText,
    clickComposerSubmit: clickComposerSubmit,
    waitForSelector: waitForSelector,
    toggleAction: toggleAction,
    parseStatusUrl: parseStatusUrl
  };
})();