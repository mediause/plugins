(function () {
  var BLOOMBERG_FEEDS = {
    main: 'https://feeds.bloomberg.com/news.rss',
    markets: 'https://feeds.bloomberg.com/markets/news.rss',
    economics: 'https://feeds.bloomberg.com/economics/news.rss',
    industries: 'https://feeds.bloomberg.com/industries/news.rss',
    tech: 'https://feeds.bloomberg.com/technology/news.rss',
    politics: 'https://feeds.bloomberg.com/politics/news.rss',
    businessweek: 'https://feeds.bloomberg.com/businessweek/news.rss',
    opinions: 'https://feeds.bloomberg.com/bview/news.rss'
  };

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

  function stripCdata(value) {
    var match = String(value || '').match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    return match ? match[1] : String(value || '');
  }

  function stripHtml(value) {
    return String(value || '').replace(/<[^>]+>/g, ' ');
  }

  function decodeXmlEntities(value) {
    return String(value || '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&#(\d+);/g, function (_m, code) { return String.fromCodePoint(Number(code)); })
      .replace(/&#x([0-9a-f]+);/gi, function (_m, code) { return String.fromCodePoint(parseInt(code, 16)); })
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function extractTagText(block, tag) {
    var safeTag = escapeRegExp(tag);
    var match = String(block || '').match(new RegExp('<' + safeTag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + safeTag + '>', 'i'));
    if (!match) {
      return '';
    }

    return normalizeText(stripHtml(decodeXmlEntities(stripCdata(match[1]))));
  }

  function extractMediaLinksFromRssItem(block) {
    var urls = {};
    var result = [];
    var matcher = /<(?:media:content|media:thumbnail|enclosure)\b[^>]*\burl="([^"]+)"[^>]*>/gi;
    var match = null;

    while ((match = matcher.exec(String(block || ''))) !== null) {
      var url = decodeXmlEntities(match[1] || '').trim();
      if (!url || urls[url]) {
        continue;
      }
      urls[url] = true;
      result.push(url);
    }

    return result;
  }

  function parseBloombergRss(xml) {
    var items = [];
    var matcher = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    var match = null;

    while ((match = matcher.exec(String(xml || ''))) !== null) {
      var block = String(match[1] || '');
      var title = extractTagText(block, 'title');
      var summary = extractTagText(block, 'description');
      var link = extractTagText(block, 'link') || extractTagText(block, 'guid');
      var mediaLinks = extractMediaLinksFromRssItem(block);
      if (!title || !link) {
        continue;
      }

      items.push({
        title: title,
        summary: summary,
        link: link,
        mediaLinks: mediaLinks
      });
    }

    return items;
  }

  function parseCurrentDocumentRss() {
    var xml = '';
    try {
      xml = new XMLSerializer().serializeToString(document);
    } catch (_error) {
      xml = String(document && document.documentElement && document.documentElement.outerHTML || '');
    }
    return parseBloombergRss(xml);
  }

  async function fetchBloombergFeed(name, limit) {
    var feedUrl = BLOOMBERG_FEEDS[name];
    if (!feedUrl) {
      throw new Error('Unknown Bloomberg feed: ' + String(name || ''));
    }

    var response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; mediause)'
      }
    });

    if (!response.ok) {
      throw new Error('Bloomberg RSS HTTP ' + String(response.status));
    }

    var xml = await response.text();
    var rows = parseBloombergRss(xml);
    return rows.slice(0, normalizeLimit(limit, 1, 20));
  }

  function normalizeBloombergLink(input) {
    var raw = String(input || '').trim();
    if (!raw) {
      throw new Error('A Bloomberg link is required');
    }
    if (raw.indexOf('/') === 0) {
      return 'https://www.bloomberg.com' + raw;
    }
    return raw;
  }

  function validateBloombergLink(input) {
    var normalized = normalizeBloombergLink(input);
    var url;
    try {
      url = new URL(normalized);
    } catch (_error) {
      throw new Error('Invalid Bloomberg link: ' + String(input || ''));
    }

    if (!/(?:\.|^)bloomberg\.com$/i.test(url.hostname)) {
      throw new Error('Expected a bloomberg.com link, got: ' + url.hostname);
    }

    return url.toString();
  }

  function renderStoryBody(body) {
    var blocks = Array.isArray(body && body.content) ? body.content : [];
    var parts = [];
    var index = 0;
    for (index = 0; index < blocks.length; index += 1) {
      var block = blocks[index];
      if (!block || typeof block !== 'object') {
        continue;
      }
      if (block.type === 'paragraph' && Array.isArray(block.content)) {
        parts.push(normalizeText(renderInlineNodes(block.content)));
        continue;
      }
      if (block.type === 'heading' && Array.isArray(block.content)) {
        var heading = normalizeText(renderInlineNodes(block.content));
        if (heading) {
          parts.push('## ' + heading);
        }
        continue;
      }
      if (block.type === 'blockquote' && Array.isArray(block.content)) {
        var quote = normalizeText(renderInlineNodes(block.content));
        if (quote) {
          parts.push('> ' + quote);
        }
        continue;
      }
      if (block.type === 'list' && Array.isArray(block.content)) {
        var lineItems = [];
        var listIndex = 0;
        for (listIndex = 0; listIndex < block.content.length; listIndex += 1) {
          var listItem = block.content[listIndex];
          var itemText = normalizeText(extractGenericText(listItem));
          if (itemText) {
            lineItems.push('- ' + itemText);
          }
        }
        if (lineItems.length > 0) {
          parts.push(lineItems.join('\n'));
        }
        continue;
      }
      if (block.type === 'media') {
        var caption = normalizeText(extractGenericText(block && block.data));
        if (caption) {
          parts.push(caption);
        }
        continue;
      }

      var generic = normalizeText(extractGenericText(block));
      if (generic) {
        parts.push(generic);
      }
    }

    return parts.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function renderInlineNodes(nodes) {
    var out = [];
    var index = 0;
    for (index = 0; index < nodes.length; index += 1) {
      out.push(renderInlineNode(nodes[index]));
    }
    return out.join('');
  }

  function renderInlineNode(node) {
    if (node == null) {
      return '';
    }
    if (typeof node === 'string') {
      return decodeXmlEntities(node);
    }
    if (Array.isArray(node.content) && node.content.length > 0) {
      return renderInlineNodes(node.content);
    }
    if (typeof node.value === 'string') {
      return decodeXmlEntities(node.value);
    }
    return '';
  }

  function extractGenericText(value) {
    var out = [];
    collectText(value, out);
    return out.join(' ').replace(/\s+/g, ' ').trim();
  }

  function collectText(value, out) {
    if (value == null) {
      return;
    }
    if (typeof value === 'string') {
      var text = normalizeText(stripHtml(decodeXmlEntities(value)));
      if (text) {
        out.push(text);
      }
      return;
    }
    if (Array.isArray(value)) {
      var index = 0;
      for (index = 0; index < value.length; index += 1) {
        collectText(value[index], out);
      }
      return;
    }
    if (typeof value === 'object') {
      if (typeof value.value === 'string') {
        var objectText = normalizeText(stripHtml(decodeXmlEntities(value.value)));
        if (objectText) {
          out.push(objectText);
        }
      }
      if (Array.isArray(value.content)) {
        collectText(value.content, out);
      }

      var keys = Object.keys(value);
      var keyIndex = 0;
      for (keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        var key = keys[keyIndex];
        if (key === 'value' || key === 'content') {
          continue;
        }
        collectText(value[key], out);
      }
    }
  }

  function normalizeMediaUrl(value) {
    var url = decodeXmlEntities(String(value || '')).trim();
    if (!/^https?:\/\//i.test(url)) {
      return null;
    }
    return url;
  }

  function collectMediaUrls(value, out, seenObjects) {
    if (value == null) {
      return;
    }
    if (typeof value === 'string') {
      var normalized = normalizeMediaUrl(value);
      if (normalized) {
        out[normalized] = true;
      }
      return;
    }
    if (Array.isArray(value)) {
      var arrayIndex = 0;
      for (arrayIndex = 0; arrayIndex < value.length; arrayIndex += 1) {
        collectMediaUrls(value[arrayIndex], out, seenObjects);
      }
      return;
    }
    if (typeof value === 'object') {
      if (seenObjects.indexOf(value) >= 0) {
        return;
      }
      seenObjects.push(value);

      var candidateKeys = ['url', 'src', 'fallback', 'poster'];
      var keyIndex = 0;
      for (keyIndex = 0; keyIndex < candidateKeys.length; keyIndex += 1) {
        var candidate = value[candidateKeys[keyIndex]];
        if (typeof candidate === 'string') {
          var normalizedUrl = normalizeMediaUrl(candidate);
          if (normalizedUrl) {
            out[normalizedUrl] = true;
          }
        }
      }

      var keys = Object.keys(value);
      var valueIndex = 0;
      for (valueIndex = 0; valueIndex < keys.length; valueIndex += 1) {
        collectMediaUrls(value[keys[valueIndex]], out, seenObjects);
      }
    }
  }

  function extractStoryMediaLinks(story) {
    var mediaMap = {};
    var seenObjects = [];
    collectMediaUrls(story && story.ledeImageUrl, mediaMap, seenObjects);
    collectMediaUrls(story && story.socialImageUrl, mediaMap, seenObjects);
    collectMediaUrls(story && story.lede, mediaMap, seenObjects);
    collectMediaUrls(story && story.imageAttachments, mediaMap, seenObjects);
    collectMediaUrls(story && story.videoAttachments, mediaMap, seenObjects);

    var mediaBlocks = Array.isArray(story && story.body && story.body.content)
      ? story.body.content.filter(function (block) { return block && block.type === 'media'; })
      : [];
    collectMediaUrls(mediaBlocks, mediaMap, seenObjects);
    return Object.keys(mediaMap);
  }

  window.__mediauseBloombergHelpers = {
    BLOOMBERG_FEEDS: BLOOMBERG_FEEDS,
    successItems: successItems,
    successAccount: successAccount,
    errorResult: errorResult,
    normalizeLimit: normalizeLimit,
    fetchBloombergFeed: fetchBloombergFeed,
    parseCurrentDocumentRss: parseCurrentDocumentRss,
    validateBloombergLink: validateBloombergLink,
    renderStoryBody: renderStoryBody,
    extractStoryMediaLinks: extractStoryMediaLinks
  };
})();
