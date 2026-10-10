(function () {
  var helpers = window.__mediauseBilibiliHelpers || {};

  var TYPE_MAP = {
    DYNAMIC_TYPE_AV: 'video',
    DYNAMIC_TYPE_DRAW: 'draw',
    DYNAMIC_TYPE_ARTICLE: 'article',
    DYNAMIC_TYPE_FORWARD: 'forward',
    DYNAMIC_TYPE_WORD: 'text',
    DYNAMIC_TYPE_LIVE_RCMD: 'live',
    DYNAMIC_TYPE_PGC: 'bangumi'
  };

  function asString(value) {
    return typeof helpers.asString === 'function' ? helpers.asString(value) : String(value == null ? '' : value).trim();
  }

  function errorResult(code, message, details) {
    return typeof helpers.errorResult === 'function'
      ? helpers.errorResult(code, message, details)
      : { success: false, error: { code: code, message: message, details: details || null } };
  }

  function successItems(items) {
    return typeof helpers.successItems === 'function'
      ? helpers.successItems(items)
      : { success: true, data: { items: Array.isArray(items) ? items : [] } };
  }

  function successData(data) {
    return typeof helpers.successData === 'function'
      ? helpers.successData(data)
      : { success: true, data: data };
  }

  function sanitizeLimit(value, fallback, maxValue) {
    return typeof helpers.sanitizeLimit === 'function'
      ? helpers.sanitizeLimit(value, fallback, maxValue)
      : fallback;
  }

  function payloadData(payload) {
    return typeof helpers.payloadData === 'function' ? helpers.payloadData(payload) : (payload && payload.data ? payload.data : payload);
  }

  function stripHtml(text) {
    return typeof helpers.stripHtml === 'function' ? helpers.stripHtml(text) : asString(text);
  }

  function formatDuration(value) {
    return typeof helpers.formatDuration === 'function' ? helpers.formatDuration(value) : String(value);
  }

  async function apiGet(path, options) {
    return helpers.apiGet(path, options || {});
  }

  async function apiPost(path, options) {
    return helpers.apiPost(path, options || {});
  }

  async function resolveBvid(value) {
    return helpers.resolveBvid(value);
  }

  async function resolveUid(value) {
    return helpers.resolveUid(value);
  }

  async function getSelfUid() {
    return helpers.getSelfUid();
  }

  function ensureOkPayload(payload, label) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Bilibili ' + label + ' API returned a malformed payload');
    }
    if (payload.code !== 0) {
      throw new Error('Bilibili ' + label + ' API failed: ' + (payload.message || 'unknown error') + ' (' + payload.code + ')');
    }
    return payload.data;
  }

  function parseBoolean(value, defaultValue) {
    if (typeof value === 'boolean') {
      return value;
    }
    var raw = asString(value).toLowerCase();
    if (!raw) {
      return !!defaultValue;
    }
    if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'y') {
      return true;
    }
    if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'n') {
      return false;
    }
    return !!defaultValue;
  }

  function parseDynamicItem(item) {
    var modules = item && item.modules ? item.modules : {};
    var authorModule = modules.module_author || {};
    var dynamicModule = modules.module_dynamic || {};
    var major = dynamicModule.major || {};
    var stat = modules.module_stat || {};
    var title = '';
    var url = item && item.id_str ? helpers.toDynamicUrl(item.id_str) : '';
    var itemType = TYPE_MAP[item && item.type] || asString(item && item.type);

    if (major.archive) {
      title = major.archive.title || '';
      url = major.archive.jump_url ? 'https:' + major.archive.jump_url : url;
    }
    if (!title && major.article) {
      title = major.article.title || '';
      url = major.article.jump_url ? 'https:' + major.article.jump_url : url;
    }
    if (!title && dynamicModule.desc && dynamicModule.desc.text) {
      title = stripHtml(dynamicModule.desc.text).slice(0, 60);
    }
    if (!title && major.draw) {
      var imageCount = Array.isArray(major.draw.items) ? major.draw.items.length : 0;
      title = imageCount > 0 ? '[image x' + imageCount + ']' : '[draw dynamic]';
    }
    if (!title && item && item.basic && item.basic.is_only_fans) {
      title = '[subscriber only]';
    }
    if (!title && item && item.type === 'DYNAMIC_TYPE_FORWARD') {
      title = '[forwarded dynamic]';
    }
    if (!title) {
      title = '[' + (itemType || 'dynamic') + ']';
    }

    return {
      title: title,
      url: url,
      type: itemType,
      author: authorModule.name || '',
      time: authorModule.pub_time || '',
      likes: stat.like && stat.like.count ? stat.like.count : 0,
      comments: stat.comment && stat.comment.count ? stat.comment.count : 0,
      forwards: stat.forward && stat.forward.count ? stat.forward.count : 0
    };
  }

  async function accountHealth() {
    try {
      var nav = await helpers.getNavData();
      var data = nav && nav.data ? nav.data : {};
      var loggedIn = !!data.isLogin;
      return successData({
        healthy: loggedIn,
        account: {
          id: loggedIn ? String(data.mid || '') : null,
          nick: loggedIn ? (data.uname || null) : null,
          login: loggedIn
        }
      });
    } catch (_error) {
      return successData({
        healthy: false,
        account: {
          id: null,
          nick: null,
          login: false
        }
      });
    }
  }

  async function searchVideo(payload) {
    try {
      var query = asString(payload && payload.query);
      if (!query) {
        return errorResult('bilibili.search.query_required', 'query is required');
      }
      var pageNum = Math.max(1, Math.floor(Number(payload && payload.page) || 1));
      var limit = sanitizeLimit(payload && payload.limit, 20, 50);
      var result = await apiGet('/x/web-interface/wbi/search/type', {
        params: { search_type: 'video', keyword: query, page: pageNum },
        signed: true
      });
      var items = payloadData(result) && Array.isArray(payloadData(result).result) ? payloadData(result).result : [];
      return successItems(items.slice(0, limit).map(function (item, index) {
        return {
          rank: index + 1,
          title: stripHtml(item.title || ''),
          author: item.author || '',
          score: item.play || 0,
          bvid: item.bvid || '',
          url: helpers.toVideoUrl(item.bvid || '')
        };
      }));
    } catch (error) {
      return errorResult('bilibili.search.video_failed', 'search video failed', String(error));
    }
  }

  async function searchUser(payload) {
    try {
      var query = asString(payload && payload.query);
      if (!query) {
        return errorResult('bilibili.search.query_required', 'query is required');
      }
      var pageNum = Math.max(1, Math.floor(Number(payload && payload.page) || 1));
      var limit = sanitizeLimit(payload && payload.limit, 20, 50);
      var result = await apiGet('/x/web-interface/wbi/search/type', {
        params: { search_type: 'bili_user', keyword: query, page: pageNum },
        signed: true
      });
      var items = payloadData(result) && Array.isArray(payloadData(result).result) ? payloadData(result).result : [];
      return successItems(items.slice(0, limit).map(function (item, index) {
        return {
          rank: index + 1,
          name: stripHtml(item.uname || ''),
          sign: asString(item.usign),
          fans: item.fans || 0,
          uid: asString(item.mid),
          url: item.mid ? 'https://space.bilibili.com/' + item.mid : ''
        };
      }));
    } catch (error) {
      return errorResult('bilibili.search.user_failed', 'search user failed', String(error));
    }
  }

  async function getHot(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 20, 50);
      var result = await apiGet('/x/web-interface/popular', { params: { ps: limit, pn: 1 } });
      var items = payloadData(result) && Array.isArray(payloadData(result).list) ? payloadData(result).list : [];
      return successItems(items.slice(0, limit).map(function (item, index) {
        return {
          rank: index + 1,
          title: item.title || '',
          author: item.owner && item.owner.name ? item.owner.name : '',
          play: item.stat && item.stat.view ? item.stat.view : 0,
          danmaku: item.stat && item.stat.danmaku ? item.stat.danmaku : 0,
          bvid: item.bvid || '',
          url: helpers.toVideoUrl(item.bvid || '')
        };
      }));
    } catch (error) {
      return errorResult('bilibili.get.hot_failed', 'get hot failed', String(error));
    }
  }

  async function getRanking(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 20, 50);
      var result = await apiGet('/x/web-interface/ranking/v2', { params: { rid: 0, type: 'all' } });
      var items = payloadData(result) && Array.isArray(payloadData(result).list) ? payloadData(result).list : [];
      return successItems(items.slice(0, limit).map(function (item, index) {
        return {
          rank: index + 1,
          title: item.title || '',
          author: item.owner && item.owner.name ? item.owner.name : '',
          score: item.stat && item.stat.view ? item.stat.view : 0,
          bvid: item.bvid || '',
          url: helpers.toVideoUrl(item.bvid || '')
        };
      }));
    } catch (error) {
      return errorResult('bilibili.get.ranking_failed', 'get ranking failed', String(error));
    }
  }

  async function getHistory(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 20, 30);
      var result = await apiGet('/x/web-interface/history/cursor', {
        params: { ps: limit, type: 'archive' }
      });
      var items = payloadData(result) && Array.isArray(payloadData(result).list) ? payloadData(result).list : [];
      return successItems(items.slice(0, limit).map(function (item, index) {
        var progress = Number(item.progress || 0);
        var duration = Number(item.duration || 0);
        var progressText = 'Completed';
        if (!(progress < 0 || progress >= duration)) {
          var pct = duration > 0 ? Math.round(progress / duration * 100) : 0;
          progressText = formatDuration(progress) + '/' + formatDuration(duration) + ' (' + pct + '%)';
        }
        return {
          rank: index + 1,
          title: item.title || '',
          author: item.author_name || '',
          progress: progressText,
          url: item.history && item.history.bvid ? helpers.toVideoUrl(item.history.bvid) : ''
        };
      }));
    } catch (error) {
      return errorResult('bilibili.get.history_failed', 'get history failed', String(error));
    }
  }

  async function buildFeedItems(uid, payload) {
    var limit = sanitizeLimit(payload && payload.limit, 20, 100);
    var pages = sanitizeLimit(payload && payload.pages, 1, 5);
    var filterType = asString(payload && payload.type).toLowerCase();
    if (!filterType || filterType === 'all' || /^\{\{.*\}\}$/.test(filterType)) {
      filterType = '';
    }

    var rows = [];
    var offset = '';
    for (var pageIndex = 0; pageIndex < pages; pageIndex += 1) {
      if (rows.length >= limit) {
        break;
      }
      var result;
      if (uid) {
        var userParams = { host_mid: uid, timezone_offset: -480 };
        if (offset) {
          userParams.offset = offset;
        }
        result = await apiGet('/x/polymer/web-dynamic/v1/feed/space', { params: userParams });
      } else {
        var feedParams = { timezone_offset: -480, type: filterType || 'all', page: pageIndex + 1 };
        if (offset) {
          feedParams.offset = offset;
        }
        result = await apiGet('/x/polymer/web-dynamic/v1/feed/all', { params: feedParams });
      }

      var data = payloadData(result) || {};
      var items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) {
        break;
      }

      for (var i = 0; i < items.length; i += 1) {
        if (rows.length >= limit) {
          break;
        }
        var parsed = parseDynamicItem(items[i]);
        if (filterType && parsed.type !== filterType) {
          continue;
        }
        rows.push({
          rank: rows.length + 1,
          time: parsed.time,
          author: parsed.author,
          title: parsed.title,
          type: parsed.type,
          likes: parsed.likes,
          comments: parsed.comments,
          url: parsed.url
        });
      }

      offset = data.offset || (items[items.length - 1] && items[items.length - 1].id_str) || '';
      if (!offset || !data.has_more) {
        break;
      }
    }

    return rows;
  }

  async function getFeed(payload) {
    try {
      return successItems(await buildFeedItems('', payload));
    } catch (error) {
      return errorResult('bilibili.get.feed_failed', 'get feed failed', String(error));
    }
  }

  async function getDynamic(payload) {
    try {
      var limit = sanitizeLimit(payload && payload.limit, 15, 100);
      var result = await apiGet('/x/polymer/web-dynamic/v1/feed/all', { params: {} });
      var items = payloadData(result) && Array.isArray(payloadData(result).items) ? payloadData(result).items : [];
      return successItems(items.slice(0, limit).map(function (item) {
        var text = '';
        if (item && item.modules && item.modules.module_dynamic && item.modules.module_dynamic.desc && item.modules.module_dynamic.desc.text) {
          text = item.modules.module_dynamic.desc.text;
        } else if (item && item.modules && item.modules.module_dynamic && item.modules.module_dynamic.major && item.modules.module_dynamic.major.archive) {
          text = item.modules.module_dynamic.major.archive.title || '';
        }

        return {
          id: asString(item && item.id_str),
          author: asString(item && item.modules && item.modules.module_author && item.modules.module_author.name),
          text: asString(text),
          likes: item && item.modules && item.modules.module_stat && item.modules.module_stat.like ? (item.modules.module_stat.like.count || 0) : 0,
          url: helpers.toDynamicUrl(item && item.id_str ? item.id_str : '')
        };
      }));
    } catch (error) {
      return errorResult('bilibili.get.dynamic_failed', 'get dynamic failed', String(error));
    }
  }

  async function readVideo(payload) {
    try {
      var bvid = await resolveBvid(payload && payload.bvid);
      var result = await apiGet('/x/web-interface/view', { params: { bvid: bvid } });
      var data = ensureOkPayload(result, 'view');
      var stat = data.stat || {};
      var owner = data.owner || {};
      var pubDate = data.pubdate ? new Date(data.pubdate * 1000).toISOString().slice(0, 16).replace('T', ' ') : '';
      var duration = Number(data.duration || 0);
      var durationText = duration ? formatDuration(duration) + ' (' + duration + 's)' : '';
      return successItems([
        { field: 'bvid', value: data.bvid || bvid },
        { field: 'aid', value: asString(data.aid) },
        { field: 'title', value: data.title || '' },
        { field: 'author', value: owner.name ? (owner.name + ' (mid: ' + owner.mid + ')') : '' },
        { field: 'category', value: data.tname_v2 || data.tname || '' },
        { field: 'publish_time', value: pubDate },
        { field: 'duration', value: durationText },
        { field: 'view', value: asString(stat.view) },
        { field: 'danmaku', value: asString(stat.danmaku) },
        { field: 'reply', value: asString(stat.reply) },
        { field: 'like', value: asString(stat.like) },
        { field: 'coin', value: asString(stat.coin) },
        { field: 'favorite', value: asString(stat.favorite) },
        { field: 'share', value: asString(stat.share) },
        { field: 'parts', value: asString(data.videos || 1) },
        { field: 'thumbnail', value: data.pic || '' },
        { field: 'description', value: data.desc || '' },
        { field: 'url', value: helpers.toVideoUrl(data.bvid || bvid) }
      ]);
    } catch (error) {
      return errorResult('bilibili.read.video_failed', 'read video failed', String(error));
    }
  }

  async function readSubtitle(payload) {
    try {
      var bvid = await resolveBvid(payload && payload.bvid);
      var view = await apiGet('/x/web-interface/view', { params: { bvid: bvid } });
      var viewData = ensureOkPayload(view, 'view');
      var cid = viewData && viewData.cid;
      if (!cid) {
        throw new Error('Cannot resolve cid for ' + bvid);
      }
      var player = await apiGet('/x/player/wbi/v2', {
        params: { bvid: bvid, cid: cid },
        signed: true
      });
      if (!player || typeof player !== 'object' || Array.isArray(player)) {
        throw new Error('player payload malformed');
      }
      if (player.code !== 0) {
        throw new Error('Bilibili player API failed: ' + (player.message || 'unknown error') + ' (' + player.code + ')');
      }
      var subtitles = player.data && player.data.subtitle ? player.data.subtitle.subtitles : null;
      if (!Array.isArray(subtitles) || !subtitles.length) {
        throw new Error('No subtitles available');
      }
      var lang = asString(payload && payload.lang);
      var target = lang ? (subtitles.find(function (item) { return item.lan === lang; }) || subtitles[0]) : subtitles[0];
      var targetUrl = target && target.subtitle_url ? asString(target.subtitle_url) : '';
      if (!targetUrl) {
        throw new Error('subtitle_url missing');
      }
      var finalUrl = targetUrl.indexOf('//') === 0 ? ('https:' + targetUrl) : targetUrl;
      var response = await fetch(finalUrl, { credentials: 'include' });
      var text = await response.text();
      var json;
      try {
        json = JSON.parse(text);
      } catch (_error) {
        throw new Error('Subtitle payload is not valid JSON');
      }
      var body = Array.isArray(json && json.body) ? json.body : (Array.isArray(json) ? json : null);
      if (!Array.isArray(body) || !body.length) {
        throw new Error('Subtitle body is empty');
      }
      return successItems(body.map(function (item, index) {
        return {
          index: index + 1,
          from: Number(item.from || 0).toFixed(2) + 's',
          to: Number(item.to || 0).toFixed(2) + 's',
          content: asString(item.content)
        };
      }));
    } catch (error) {
      return errorResult('bilibili.read.subtitle_failed', 'read subtitle failed', String(error));
    }
  }

  async function readSummary(payload) {
    try {
      var bvid = await resolveBvid(payload && payload.bvid);
      var view = await apiGet('/x/web-interface/view', { params: { bvid: bvid } });
      var viewData = ensureOkPayload(view, 'view');
      var cid = viewData && viewData.cid;
      var upMid = viewData && viewData.owner ? viewData.owner.mid : null;
      if (!cid || !upMid) {
        throw new Error('view API did not return cid/up_mid for ' + bvid);
      }
      var conclusion = await apiGet('/x/web-interface/view/conclusion/get', {
        params: { bvid: bvid, cid: cid, up_mid: upMid },
        signed: true
      });
      var conclusionData = ensureOkPayload(conclusion, 'conclusion');
      if (!conclusionData || conclusionData.code !== 0) {
        throw new Error('No AI summary available for ' + bvid);
      }
      var modelResult = conclusionData.model_result;
      if (typeof modelResult === 'string') {
        modelResult = JSON.parse(modelResult);
      }
      if (!modelResult || typeof modelResult !== 'object' || Array.isArray(modelResult)) {
        throw new Error('model_result malformed');
      }
      var summary = asString(modelResult.summary);
      if (!summary) {
        throw new Error('No AI summary available for ' + bvid);
      }
      var outline = Array.isArray(modelResult.outline) ? modelResult.outline : [];
      var rows = [{ time: '', content: summary }];
      outline.forEach(function (section) {
        if (!section || typeof section !== 'object' || Array.isArray(section)) {
          return;
        }
        var sectionTitle = asString(section.title);
        var sectionTime = formatDuration(section.timestamp || 0);
        if (sectionTitle) {
          rows.push({ time: sectionTime, content: '# ' + sectionTitle });
        }
        var points = Array.isArray(section.part_outline) ? section.part_outline : [];
        points.forEach(function (point) {
          if (!point || typeof point !== 'object' || Array.isArray(point)) {
            return;
          }
          var content = asString(point.content);
          if (content) {
            rows.push({ time: formatDuration(point.timestamp || 0), content: content });
          }
        });
      });
      return successItems(rows);
    } catch (error) {
      return errorResult('bilibili.read.summary_failed', 'read summary failed', String(error));
    }
  }

  async function readComments(payload) {
    try {
      var bvid = await resolveBvid(payload && payload.bvid);
      var limit = sanitizeLimit(payload && payload.limit, 20, 50);
      var parent = payload && payload.parent != null ? Math.floor(Number(payload.parent)) : null;
      if (parent != null && (!Number.isFinite(parent) || parent <= 0)) {
        return errorResult('bilibili.read.comments_invalid_parent', 'parent must be a positive integer');
      }
      var view = await apiGet('/x/web-interface/view', { params: { bvid: bvid } });
      var viewData = ensureOkPayload(view, 'view');
      var aid = viewData && viewData.aid;
      if (!aid) {
        throw new Error('Cannot resolve aid for ' + bvid);
      }
      var result = parent != null
        ? await apiGet('/x/v2/reply/reply', { params: { oid: aid, type: 1, root: parent, pn: 1, ps: limit } })
        : await apiGet('/x/v2/reply/main', { params: { oid: aid, type: 1, mode: 3, ps: limit }, signed: true });
      var data = ensureOkPayload(result, parent != null ? 'reply thread' : 'reply main');
      var replies = data && data.replies === null ? [] : (data && Array.isArray(data.replies) ? data.replies : null);
      if (!Array.isArray(replies)) {
        throw new Error('comments payload missing replies');
      }
      return successItems(replies.slice(0, limit).map(function (reply, index) {
        var ctime = Number(reply && reply.ctime);
        return {
          rank: index + 1,
          rpid: asString(reply && reply.rpid),
          author: asString(reply && reply.member && reply.member.uname),
          text: asString(reply && reply.content && reply.content.message).replace(/\n/g, ' '),
          likes: reply && reply.like ? reply.like : 0,
          replies: reply && reply.rcount ? reply.rcount : 0,
          time: Number.isFinite(ctime) ? new Date(ctime * 1000).toISOString().slice(0, 16).replace('T', ' ') : ''
        };
      }));
    } catch (error) {
      return errorResult('bilibili.read.comments_failed', 'read comments failed', String(error));
    }
  }

  async function readDynamic(payload) {
    try {
      var id = asString(payload && payload.id);
      if (!id) {
        return errorResult('bilibili.read.dynamic_id_required', 'id is required');
      }
      var result = await apiGet('/x/polymer/web-dynamic/v1/detail', {
        params: { id: id, timezone_offset: -480 }
      });
      var data = payloadData(result);
      var item = data && data.item ? data.item : null;
      if (!item) {
        return successItems([{ field: 'error', value: 'dynamic not found or inaccessible' }]);
      }
      var modules = item.modules || {};
      var author = modules.module_author || {};
      var dynamicModule = modules.module_dynamic || {};
      var major = dynamicModule.major || {};
      var stat = modules.module_stat || {};
      var rows = [
        { field: 'id', value: item.id_str || id },
        { field: 'author', value: author.name || '' },
        { field: 'time', value: author.pub_time || '' },
        { field: 'type', value: TYPE_MAP[item.type] || asString(item.type) }
      ];
      if (dynamicModule.desc && dynamicModule.desc.text) {
        rows.push({ field: 'text', value: stripHtml(dynamicModule.desc.text) });
      }
      if (major.archive) {
        rows.push({ field: 'video_title', value: major.archive.title || '' });
        rows.push({ field: 'video_desc', value: major.archive.desc || '' });
        rows.push({ field: 'video_url', value: major.archive.jump_url ? ('https:' + major.archive.jump_url) : '' });
      }
      if (major.article) {
        rows.push({ field: 'article_title', value: major.article.title || '' });
        rows.push({ field: 'article_url', value: major.article.jump_url ? ('https:' + major.article.jump_url) : '' });
      }
      if (major.draw && Array.isArray(major.draw.items) && major.draw.items.length) {
        rows.push({ field: 'images', value: major.draw.items.map(function (img) { return img.src; }).join('\n') });
      }
      if (major.opus && major.opus.summary && major.opus.summary.text) {
        rows.push({ field: 'opus_text', value: stripHtml(major.opus.summary.text) });
      }
      if (major.opus && major.opus.title) {
        rows.push({ field: 'opus_title', value: major.opus.title });
      }
      if (item.orig) {
        var origAuthor = item.orig.modules && item.orig.modules.module_author ? item.orig.modules.module_author.name : '';
        var origDesc = item.orig.modules && item.orig.modules.module_dynamic && item.orig.modules.module_dynamic.desc
          ? item.orig.modules.module_dynamic.desc.text : '';
        rows.push({ field: 'forward_from', value: origAuthor || '' });
        if (origDesc) {
          rows.push({ field: 'forward_text', value: stripHtml(origDesc).slice(0, 200) });
        }
      }
      rows.push({ field: 'likes', value: asString(stat.like && stat.like.count ? stat.like.count : 0) });
      rows.push({ field: 'comments', value: asString(stat.comment && stat.comment.count ? stat.comment.count : 0) });
      rows.push({ field: 'forwards', value: asString(stat.forward && stat.forward.count ? stat.forward.count : 0) });
      rows.push({ field: 'url', value: helpers.toDynamicUrl(item.id_str || id) });
      return successItems(rows);
    } catch (error) {
      return errorResult('bilibili.read.dynamic_failed', 'read dynamic failed', String(error));
    }
  }

  async function userProfile(payload) {
    try {
      var meOnly = parseBoolean(payload && payload.me, false);
      var uidInput = asString(payload && payload.uid);
      var uid = (!uidInput || meOnly) ? await getSelfUid() : await resolveUid(uidInput);
      var result = await apiGet('/x/space/wbi/acc/info', {
        params: { mid: uid },
        signed: true
      });
      var data = payloadData(result) || {};
      return successItems([
        { field: 'name', value: data.name || '' },
        { field: 'uid', value: asString(data.mid || uid) },
        { field: 'level', value: asString(data.level) },
        { field: 'coins', value: asString(data.coins) },
        { field: 'followers', value: asString(data.follower) },
        { field: 'following', value: asString(data.following) },
        { field: 'sign', value: data.sign || '' },
        { field: 'url', value: 'https://space.bilibili.com/' + asString(data.mid || uid) }
      ]);
    } catch (error) {
      return errorResult('bilibili.user.profile_failed', 'get user profile failed', String(error));
    }
  }

  async function userMe(_payload) {
    return userProfile({ me: true });
  }

  async function userFollowing(payload) {
    try {
      var uidInput = asString(payload && payload.uid);
      var uid = uidInput ? await resolveUid(uidInput) : await getSelfUid();
      var pageNum = Math.max(1, Math.floor(Number(payload && payload.page) || 1));
      var limit = sanitizeLimit(payload && payload.limit, 50, 50);
      var result = await helpers.fetchJson('https://api.bilibili.com/x/relation/followings?vmid=' + encodeURIComponent(uid) + '&pn=' + pageNum + '&ps=' + limit + '&order=desc', {
        credentials: 'include'
      });
      if (!result || result.code !== 0) {
        throw new Error('followings API failed: ' + (result && result.message ? result.message : 'unknown error'));
      }
      var list = result && result.data && Array.isArray(result.data.list) ? result.data.list : [];
      return successItems(list.map(function (item) {
        return {
          mid: item.mid,
          name: item.uname,
          sign: asString(item.sign).slice(0, 40),
          following: item.attribute === 6 ? 'mutual' : 'following',
          fans: item.official_verify && item.official_verify.desc ? item.official_verify.desc : ''
        };
      }));
    } catch (error) {
      return errorResult('bilibili.user.following_failed', 'get following failed', String(error));
    }
  }

  async function userVideos(payload) {
    try {
      var uid = await resolveUid(payload && payload.uid);
      var limit = sanitizeLimit(payload && payload.limit, 20, 50);
      var pageNum = Math.max(1, Math.floor(Number(payload && payload.page) || 1));
      var order = asString(payload && payload.order) || 'pubdate';
      var result = await apiGet('/x/space/wbi/arc/search', {
        params: { mid: uid, pn: pageNum, ps: limit, order: order },
        signed: true
      });
      var vlist = payloadData(result) && payloadData(result).list ? payloadData(result).list.vlist : null;
      var items = Array.isArray(vlist) ? vlist : [];
      return successItems(items.slice(0, limit).map(function (item, index) {
        return {
          rank: index + 1,
          title: item.title || '',
          plays: item.play || 0,
          likes: item.like || 0,
          date: item.created ? new Date(item.created * 1000).toISOString().slice(0, 10) : '',
          url: item.bvid ? helpers.toVideoUrl(item.bvid) : ''
        };
      }));
    } catch (error) {
      return errorResult('bilibili.user.videos_failed', 'get user videos failed', String(error));
    }
  }

  async function userFeed(payload) {
    try {
      var uid = await resolveUid(payload && payload.uid);
      return successItems(await buildFeedItems(uid, payload));
    } catch (error) {
      return errorResult('bilibili.user.feed_failed', 'get user feed failed', String(error));
    }
  }

  async function collectionFavorite(payload) {
    try {
      var favoriteId = payload && payload.fid != null ? Number(payload.fid) : null;
      var limit = sanitizeLimit(payload && payload.limit, 20, 40);
      var pageNum = Math.max(1, Math.floor(Number(payload && payload.page) || 1));
      var fid = favoriteId;
      if (!fid) {
        var uid = await getSelfUid();
        var foldersPayload = await apiGet('/x/v3/fav/folder/created/list-all', {
          params: { up_mid: uid },
          signed: true
        });
        var folders = payloadData(foldersPayload) && Array.isArray(payloadData(foldersPayload).list)
          ? payloadData(foldersPayload).list : [];
        if (!folders.length) {
          return successItems([]);
        }
        fid = folders[0].id;
      }
      var result = await apiGet('/x/v3/fav/resource/list', {
        params: { media_id: fid, pn: pageNum, ps: limit },
        signed: true
      });
      var medias = payloadData(result) && Array.isArray(payloadData(result).medias) ? payloadData(result).medias : [];
      return successItems(medias.slice(0, limit).map(function (item, index) {
        return {
          rank: index + 1,
          title: item.title || '',
          author: item.upper && item.upper.name ? item.upper.name : '',
          plays: item.cnt_info && item.cnt_info.play ? item.cnt_info.play : 0,
          url: item.bvid ? helpers.toVideoUrl(item.bvid) : ''
        };
      }));
    } catch (error) {
      return errorResult('bilibili.collection.favorite_failed', 'get favorite failed', String(error));
    }
  }

  async function engageComment(payload) {
    try {
      var execute = parseBoolean(payload && payload.execute, false);
      if (!execute) {
        return errorResult('bilibili.engage.comment_execute_required', 'pass execute=true to actually publish this comment');
      }
      var text = asString((payload && payload.text) || (payload && payload.message));
      if (!text) {
        return errorResult('bilibili.engage.comment_text_required', 'text is required');
      }
      var bvid = await resolveBvid(payload && payload.bvid);
      var parent = payload && payload.parent != null ? Math.floor(Number(payload.parent)) : null;
      if (parent != null && (!Number.isFinite(parent) || parent <= 0)) {
        return errorResult('bilibili.engage.comment_invalid_parent', 'parent must be a positive integer');
      }
      var view = await apiGet('/x/web-interface/view', { params: { bvid: bvid } });
      var viewData = ensureOkPayload(view, 'view');
      var oid = viewData && viewData.aid;
      if (!oid) {
        throw new Error('Cannot resolve aid for ' + bvid);
      }
      var atNameToMid = {};
      var mentionMatches = text.matchAll(/@([^\s@]+)/g);
      for (var match of mentionMatches) {
        var name = match[1];
        if (Object.prototype.hasOwnProperty.call(atNameToMid, name)) {
          continue;
        }
        try {
          var mid = Number(await resolveUid(name));
          if (Number.isInteger(mid) && mid > 0) {
            atNameToMid[name] = mid;
          }
        } catch (_error) {
          // Keep unresolved mentions as plain text.
        }
      }
      var params = {
        oid: oid,
        type: 1,
        message: text,
        plat: 1
      };
      if (parent != null) {
        params.root = parent;
        params.parent = parent;
      }
      if (Object.keys(atNameToMid).length > 0) {
        params.at_name_to_mid = JSON.stringify(atNameToMid);
      }
      var result = await apiPost('/x/v2/reply/add', { params: params });
      var data = ensureOkPayload(result, 'reply add');
      var rpid = data && data.rpid ? data.rpid : null;
      if (!rpid) {
        throw new Error('reply add API did not return rpid');
      }
      return successItems([{
        rpid: String(rpid),
        bvid: bvid,
        oid: String(oid),
        message: text,
        url: helpers.toVideoUrl(bvid) + '#reply' + rpid
      }]);
    } catch (error) {
      return errorResult('bilibili.engage.comment_failed', 'post comment failed', String(error));
    }
  }

  window.__mediauseBilibili = {
    accountHealth: accountHealth,
    collectionFavorite: collectionFavorite,
    engageComment: engageComment,
    getDynamic: getDynamic,
    getFeed: getFeed,
    getHistory: getHistory,
    getHot: getHot,
    getRanking: getRanking,
    readComments: readComments,
    readDynamic: readDynamic,
    readSubtitle: readSubtitle,
    readSummary: readSummary,
    readVideo: readVideo,
    searchUser: searchUser,
    searchVideo: searchVideo,
    userFeed: userFeed,
    userMe: userMe,
    userFollowing: userFollowing,
    userProfile: userProfile,
    userVideos: userVideos
  };
})();
