(function () {
  var helpers = window.__mediauseMediumHelpers;

  function err(code, message, details) {
    return helpers.asErr(code, message, details);
  }

  function ok(data) {
    return helpers.asOk(data);
  }

  function parseDateFromText(text) {
    var raw = helpers.normalizeText(text);
    if (!raw) return '';
    var match = raw.match(/\b(?:[A-Z][a-z]{2}\s+\d{1,2}|[A-Z][a-z]{3,8}\s+\d{1,2},?\s+\d{4}|\d+[dhmw]\s*ago)\b/);
    return match ? helpers.normalizeText(match[0]) : '';
  }

  function extractArticleParagraphs(root) {
    var nodes = root.querySelectorAll('p');
    var parts = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var text = helpers.normalizeText(nodes[i].textContent);
      if (!text) continue;
      if (text.length < 3) continue;
      if (/^member-only story$/i.test(text)) continue;
      if (/^responses?\s*\(\d+\)$/i.test(text)) continue;
      parts.push(text);
    }
    return parts;
  }

  function uniqueTexts(values) {
    var out = [];
    var seen = {};
    for (var i = 0; i < values.length; i += 1) {
      var key = helpers.normalizeText(values[i]);
      if (!key) continue;
      if (seen[key]) continue;
      seen[key] = true;
      out.push(key);
    }
    return out;
  }

  function toAbsoluteUrl(rawUrl, baseUrl) {
    var value = helpers.normalizeText(rawUrl);
    if (!value) return '';
    try {
      return new URL(value, baseUrl || 'https://medium.com').href;
    } catch (error) {
      return value;
    }
  }

  function extractArticleImages(root, pageUrl) {
    var images = [];
    var seen = {};
    var nodes = root.querySelectorAll('img[src], figure img[src]');

    for (var i = 0; i < nodes.length; i += 1) {
      var img = nodes[i];
      var src = toAbsoluteUrl(img.getAttribute('src') || img.getAttribute('data-src') || '', pageUrl);
      if (!src || seen[src]) continue;

      var width = Number(img.getAttribute('width') || '0');
      var height = Number(img.getAttribute('height') || '0');
      if ((Number.isFinite(width) && width > 0 && width <= 64) || (Number.isFinite(height) && height > 0 && height <= 64)) {
        continue;
      }
      if (/\/resize:fill:\d{1,2}:\d{1,2}\//i.test(src)) {
        continue;
      }

      seen[src] = true;

      var figure = img.closest('figure');
      var caption = '';
      if (figure) {
        var captionNode = figure.querySelector('figcaption');
        caption = helpers.normalizeText(captionNode && captionNode.textContent);
      }

      images.push({
        url: src,
        alt: helpers.normalizeText(img.getAttribute('alt')),
        caption: caption
      });
    }

    return images;
  }

  function findArticleRoot(doc) {
    return doc.querySelector('article') ||
      doc.querySelector('main article') ||
      doc.querySelector('main') ||
      doc.querySelector('[role="main"]');
  }

  async function accountHealth() {
    return ok({
      healthy: true,
      account: {
        id: null,
        nick: null,
        login: false
      }
    });
  }

  async function getFeed(payload) {
    try {
      var safe = payload || {};
      var topic = helpers.normalizeText(safe.topic);
      var limit = helpers.normalizeLimit(safe.limit, 20, 50);
      var items = helpers.parseMediumPostsFromDocument(document, limit);

      if (!items.length) {
        var tag = helpers.validateTag(topic || 'technology') || 'technology';
        var rssResp = await fetch('https://medium.com/feed/tag/' + encodeURIComponent(tag), {
          headers: {
            accept: 'application/rss+xml, application/xml'
          }
        });

        if (rssResp.ok) {
          var rssXml = await rssResp.text();
          var rssRows = helpers.parseMediumTagRss(rssXml, Math.min(limit, 25));
          items = rssRows.map(function (row, idx) {
            return {
              rank: idx + 1,
              title: helpers.normalizeText(row.title),
              author: helpers.normalizeText(row.author),
              date: helpers.normalizeText(row.published),
              readTime: '',
              claps: '',
              description: helpers.normalizeText(row.description),
              url: helpers.normalizeText(row.url)
            };
          });
        }
      }

      if (!items.length) {
        return err('medium.feed.not_found', 'No Medium posts found for topic', { topic: topic || 'technology' });
      }

      return ok({
        topic: topic || 'technology',
        limit: limit,
        items: items
      });
    } catch (error) {
      return err('medium.feed.failed', 'Fetch Medium feed failed', String(error));
    }
  }

  async function searchPosts(payload) {
    try {
      var safe = payload || {};
      var keyword = helpers.normalizeText(safe.keyword);
      if (!keyword) {
        return err('medium.search.keyword_required', 'keyword is required');
      }

      var limit = helpers.normalizeLimit(safe.limit, 20, 50);
      var items = helpers.parseMediumPostsFromDocument(document, limit);
      if (!items.length) {
        return err('medium.search.not_found', 'No search results found', { keyword: keyword });
      }

      return ok({
        keyword: keyword,
        limit: limit,
        items: items
      });
    } catch (error) {
      return err('medium.search.failed', 'Search Medium posts failed', String(error));
    }
  }

  async function userPosts(payload) {
    try {
      var safe = payload || {};
      var username = helpers.normalizeText(safe.username);
      if (!username) {
        return err('medium.user.username_required', 'username is required');
      }

      var limit = helpers.normalizeLimit(safe.limit, 20, 50);
      var items = helpers.parseMediumPostsFromDocument(document, limit);
      if (!items.length) {
        return err('medium.user.not_found', 'No posts found for user', { username: helpers.normalizeUsername(username) });
      }

      return ok({
        username: helpers.normalizeUsername(username),
        limit: limit,
        items: items
      });
    } catch (error) {
      return err('medium.user.failed', 'Fetch Medium user posts failed', String(error));
    }
  }

  async function readItem(payload) {
    try {
      var safe = payload || {};
      var url = helpers.normalizeText(safe.url || window.location.href);
      if (!url) {
        return err('medium.read.url_required', 'url is required');
      }

      var maxLength = helpers.normalizeLimit(safe.max_length, 4000, 20000);
      if (maxLength < 500) {
        maxLength = 500;
      }

      var article = findArticleRoot(document);

      if (!article) {
        try {
          var htmlResp = await fetch(url, {
            headers: {
              accept: 'text/html,application/xhtml+xml'
            }
          });
          if (htmlResp.ok) {
            var html = await htmlResp.text();
            var parsed = new DOMParser().parseFromString(html, 'text/html');
            article = findArticleRoot(parsed);
          }
        } catch (innerError) {
          // Keep original not_found behavior if fallback fetch also fails.
        }
      }

      if (!article) {
        return err('medium.read.not_found', 'Article content not found on page', { url: url });
      }

      var title = helpers.normalizeText(
        (article.querySelector('h1') && article.querySelector('h1').textContent) ||
        (document.querySelector('h1') && document.querySelector('h1').textContent)
      );

      var author = '';
      var authorLinks = article.querySelectorAll('a[href^="/@"]');
      for (var i = 0; i < authorLinks.length; i += 1) {
        var candidate = helpers.normalizeText(authorLinks[i].textContent);
        if (candidate && candidate !== title) {
          author = candidate;
          break;
        }
      }

      var timeEl = article.querySelector('time') || document.querySelector('time');
      var date = helpers.normalizeText(timeEl && timeEl.getAttribute('datetime')) || helpers.normalizeText(timeEl && timeEl.textContent);
      if (!date) {
        date = parseDateFromText(article.textContent);
      }

      var text = helpers.normalizeText(article.textContent);
      var readMatch = text.match(/(\d+)\s*min\s*read/i);
      var readTime = readMatch ? helpers.normalizeText(readMatch[0]) : '';
      var clapMatch = text.match(/\b(\d+(?:\.\d+)?[KkMm]?)\s*claps?\b/i);
      var claps = clapMatch ? helpers.normalizeText(clapMatch[1]) : '';

      var tags = [];
      var tagNodes = article.querySelectorAll('a[href*="/tag/"]');
      for (var t = 0; t < tagNodes.length; t += 1) {
        tags.push(helpers.normalizeText(tagNodes[t].textContent));
      }
      tags = uniqueTexts(tags);

      var paragraphs = extractArticleParagraphs(article);
      var content = paragraphs.join('\n\n');
      if (content.length > maxLength) {
        content = content.slice(0, maxLength) + '\n\n... [truncated]';
      }

      var images = extractArticleImages(article, url);

      return ok({
        url: url,
        title: title,
        author: author,
        date: date,
        readTime: readTime,
        claps: claps,
        tags: tags,
        images: images,
        content: content
      });
    } catch (error) {
      return err('medium.read.failed', 'Read Medium article failed', String(error));
    }
  }

  async function getTag(payload) {
    try {
      var safe = payload || {};
      var rawTag = helpers.normalizeText(safe.tag);
      var tag = helpers.validateTag(rawTag);
      if (!tag) {
        return err('medium.tag.invalid_tag', 'tag is required and must be alphanumeric or hyphenated');
      }

      var limit = helpers.normalizeLimit(safe.limit, 20, 25);
      var url = 'https://medium.com/feed/tag/' + encodeURIComponent(tag);
      var resp = await fetch(url, {
        headers: {
          accept: 'application/rss+xml, application/xml'
        }
      });

      if (resp.status === 404) {
        return err('medium.tag.not_found', 'Medium tag does not exist', { tag: tag });
      }
      if (!resp.ok) {
        return err('medium.tag.fetch_failed', 'HTTP ' + resp.status, { tag: tag });
      }

      var xml = await resp.text();
      var items = helpers.parseMediumTagRss(xml, limit);
      if (!items.length) {
        return err('medium.tag.empty', 'Medium tag RSS has no items', { tag: tag });
      }

      return ok({
        tag: tag,
        limit: limit,
        items: items
      });
    } catch (error) {
      return err('medium.tag.failed', 'Fetch Medium tag RSS failed', String(error));
    }
  }

  window.__mediauseMedium = {
    accountHealth: accountHealth,
    getFeed: getFeed,
    getTag: getTag,
    readItem: readItem,
    searchPosts: searchPosts,
    userPosts: userPosts
  };
})();
