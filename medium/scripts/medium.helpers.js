(function () {
  var TAG_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;

  function asErr(code, message, details) {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  function asOk(data) {
    return {
      success: true,
      data: data
    };
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeLimit(value, fallback, max) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      n = fallback;
    }
    return Math.max(1, Math.min(Math.floor(n), max || 50));
  }

  function normalizeUsername(value) {
    var raw = normalizeText(value);
    if (!raw) return '';
    if (raw.charAt(0) === '@') {
      return raw;
    }
    return '@' + raw;
  }

  function buildTagUrl(topic) {
    var safe = normalizeText(topic) || 'technology';
    return 'https://medium.com/tag/' + encodeURIComponent(safe);
  }

  function buildSearchUrl(keyword) {
    return 'https://medium.com/search?q=' + encodeURIComponent(normalizeText(keyword));
  }

  function buildUserUrl(username) {
    var safe = normalizeUsername(username);
    return safe ? 'https://medium.com/' + safe : '';
  }

  function toAbsoluteUrl(href) {
    var raw = normalizeText(href);
    if (!raw) return '';
    try {
      return new URL(raw, 'https://medium.com').href;
    } catch (error) {
      return raw;
    }
  }

  function parseDateFromText(text) {
    var raw = normalizeText(text);
    if (!raw) return '';

    var match = raw.match(/\b(?:[A-Z][a-z]{2}\s+\d{1,2}|[A-Z][a-z]{3,8}\s+\d{1,2},?\s+\d{4}|\d+[dhmw]\s*ago)\b/);
    return match ? normalizeText(match[0]) : '';
  }

  function isMeaningfulDescription(text, title, author) {
    var value = normalizeText(text);
    if (!value) return false;
    if (value === title || value === author) return false;
    if (value.length < 16) return false;
    if (/^[\W_]+$/.test(value)) return false;
    if (/member-only story|response icon/i.test(value)) return false;
    if (/^\d+\s*min\s*read$/i.test(value)) return false;
    if (/^\d+(?:\.\d+)?[KkMm]?\s*claps?$/i.test(value)) return false;
    if (/^in\s+.+\s+by\s+.+$/i.test(value)) return false;
    return true;
  }

  function parseMediumPostsFromDocument(doc, limit) {
    var max = normalizeLimit(limit, 20, 50);
    var posts = [];
    var seen = {};
    var articles = Array.prototype.slice.call(doc.querySelectorAll('article'));

    for (var i = 0; i < articles.length; i += 1) {
      if (posts.length >= max) break;
      var article = articles[i];

      var titleEl = article.querySelector('h2, h3, h1');
      var title = normalizeText(titleEl && titleEl.textContent);
      if (!title) continue;

      var linkEl = (titleEl && titleEl.closest('a')) || article.querySelector('a[href*="/@"], a[href*="/p/"]');
      var url = toAbsoluteUrl(linkEl && linkEl.getAttribute('href'));
      if (!url || seen[url]) continue;

      var author = '';
      var authorLinks = article.querySelectorAll('a[href^="/@"]');
      for (var j = 0; j < authorLinks.length; j += 1) {
        var candidate = normalizeText(authorLinks[j].textContent);
        if (candidate && candidate !== title) {
          author = candidate;
          break;
        }
      }

      var allText = normalizeText(article.textContent);
      var timeEl = article.querySelector('time');
      var date = normalizeText(timeEl && timeEl.textContent) || normalizeText(timeEl && timeEl.getAttribute('datetime'));
      if (!date) {
        date = parseDateFromText(allText);
      }

      if (!date) {
        var metaNodes = article.querySelectorAll('p, span, a');
        for (var m = 0; m < metaNodes.length; m += 1) {
          var metaText = normalizeText(metaNodes[m].textContent);
          var parsedDate = parseDateFromText(metaText);
          if (parsedDate) {
            date = parsedDate;
            break;
          }
        }
      }

      var readMatch = allText.match(/(\d+)\s*min\s*read/i);
      var readTime = readMatch ? normalizeText(readMatch[0]) : '';

      var clapMatch = allText.match(/\b(\d+(?:\.\d+)?[KkMm]?)\s*claps?\b/i);
      var claps = clapMatch ? normalizeText(clapMatch[1]) : '';

      var description = '';
      var descNodes = article.querySelectorAll('h3, p');
      for (var k = 0; k < descNodes.length; k += 1) {
        var desc = normalizeText(descNodes[k].textContent);
        if (!isMeaningfulDescription(desc, title, author)) continue;
        description = desc;
        break;
      }

      seen[url] = true;
      posts.push({
        rank: posts.length + 1,
        title: title,
        author: author,
        date: date,
        readTime: readTime,
        claps: claps,
        description: description ? description.slice(0, 150) : '',
        url: url
      });
    }

    return posts;
  }

  function parseXmlItems(xmlText) {
    var parser = new DOMParser();
    var xml = parser.parseFromString(String(xmlText || ''), 'text/xml');
    return Array.prototype.slice.call(xml.querySelectorAll('item'));
  }

  function getXmlFieldText(item, field) {
    var key = normalizeText(field);
    if (!key) return '';

    var selector = key.replace(/:/g, '\\:');
    var node = item.querySelector(selector);
    if (!node) {
      var exactNodes = item.getElementsByTagName(key);
      if (exactNodes && exactNodes.length) {
        node = exactNodes[0];
      }
    }

    if (!node && key.indexOf(':') !== -1) {
      var local = key.split(':').pop();
      var localNodes = item.getElementsByTagName(local);
      if (localNodes && localNodes.length) {
        for (var i = 0; i < localNodes.length; i += 1) {
          var candidate = localNodes[i];
          if (String(candidate.localName || '').toLowerCase() === String(local).toLowerCase()) {
            node = candidate;
            break;
          }
        }
        if (!node) {
          node = localNodes[0];
        }
      }
    }

    return normalizeText(node && node.textContent);
  }

  function parseRssDate(value) {
    var d = new Date(String(value || ''));
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toISOString().slice(0, 10);
  }

  function stripHtml(value) {
    var parser = new DOMParser();
    var doc = parser.parseFromString('<div>' + String(value || '') + '</div>', 'text/html');
    return normalizeText(doc.body && doc.body.textContent);
  }

  function parseMediumTagRss(xmlText, limit) {
    var max = normalizeLimit(limit, 20, 25);
    var items = parseXmlItems(xmlText);
    var rows = [];

    for (var i = 0; i < items.length && rows.length < max; i += 1) {
      var item = items[i];
      var categories = Array.prototype.slice.call(item.querySelectorAll('category')).map(function (node) {
        return normalizeText(node && node.textContent);
      }).filter(Boolean);

      rows.push({
        rank: rows.length + 1,
        title: getXmlFieldText(item, 'title'),
        author: getXmlFieldText(item, 'dc:creator'),
        description: stripHtml(getXmlFieldText(item, 'description')),
        categories: categories.join(', '),
        published: parseRssDate(getXmlFieldText(item, 'pubDate')),
        url: getXmlFieldText(item, 'link')
      });
    }

    return rows;
  }

  function validateTag(value) {
    var tag = normalizeText(value).toLowerCase();
    if (!tag) return '';
    if (!TAG_PATTERN.test(tag)) return '';
    return tag;
  }

  window.__mediauseMediumHelpers = {
    asErr: asErr,
    asOk: asOk,
    normalizeText: normalizeText,
    normalizeLimit: normalizeLimit,
    normalizeUsername: normalizeUsername,
    buildTagUrl: buildTagUrl,
    buildSearchUrl: buildSearchUrl,
    buildUserUrl: buildUserUrl,
    parseMediumPostsFromDocument: parseMediumPostsFromDocument,
    parseMediumTagRss: parseMediumTagRss,
    validateTag: validateTag
  };
})();
