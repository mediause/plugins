(function () {
  var helpers = window.__mediauseDouyinV2Helpers || {};

  function fail(code, message, details) {
    if (typeof helpers.errorResult === 'function') {
      return helpers.errorResult(code, message, details);
    }
    return {
      success: false,
      error: { code: code, message: message, details: details || null }
    };
  }

  function ok(data) {
    if (typeof helpers.ok === 'function') {
      return helpers.ok(data);
    }
    return { success: true, data: data || {} };
  }

  function okItems(items, extra) {
    if (typeof helpers.okItems === 'function') {
      return helpers.okItems(items, extra);
    }
    return { success: true, data: Object.assign({ items: items || [] }, extra || {}) };
  }

  async function accountHealth() {
    try {
      var user = await helpers.fetchCreatorProfile();
      return ok({
        healthy: !!user.uid,
        account: {
          id: user.uid || null,
          nick: user.nickname || null,
          login: !!user.uid
        }
      });
    } catch (_error) {
      return ok({
        healthy: false,
        account: {
          id: null,
          nick: null,
          login: false
        }
      });
    }
  }

  async function userProfile() {
    try {
      var user = await helpers.fetchCreatorProfile();
      return ok({
        uid: user.uid,
        nickname: user.nickname,
        follower_count: user.follower_count || 0,
        following_count: user.following_count || 0,
        aweme_count: user.aweme_count || 0
      });
    } catch (error) {
      return fail('douyinv2.user.profile_failed', 'fetch creator profile failed', String(error));
    }
  }

  async function contentVideos(payload) {
    try {
      var limit = helpers.sanitizeLimit(payload && payload.limit, 20, 100);
      var page = helpers.sanitizeLimit(payload && payload.page, 1, 1000);
      var status = String((payload && payload.status) || 'all').trim() || 'all';
      var statusCode = helpers.statusFilterToCode(status);
      var url = helpers.CREATOR_BASE + '/janus/douyin/creator/pc/work_list?page_size=' + limit + '&page_num=' + page + '&status=' + statusCode;
      var result = await helpers.creatorFetch('GET', url);
      var items = (result.data && result.data.work_list) || result.aweme_list || [];
      if (status === 'scheduled') {
        items = items.filter(function (item) {
          return Number(item.public_time || 0) > Date.now() / 1000;
        });
      }
      var rows = items.map(function (item) {
        return {
          aweme_id: item.aweme_id,
          title: item.desc || '',
          status: helpers.normalizeVideoStatus(item.status, item.public_time),
          play_count: item.statistics && item.statistics.play_count || 0,
          digg_count: item.statistics && item.statistics.digg_count || 0,
          create_time: helpers.formatZhTime(item.create_time || item.public_time || 0)
        };
      });
      return okItems(rows);
    } catch (error) {
      return fail('douyinv2.content.videos_failed', 'fetch creator videos failed', String(error));
    }
  }

  async function contentDrafts(payload) {
    try {
      var limit = helpers.sanitizeLimit(payload && payload.limit, 20, 100);
      var result = await helpers.creatorFetch('GET', helpers.CREATOR_BASE + '/web/api/media/aweme/draft/?aid=' + helpers.AID_CREATOR);
      var items = (result.aweme_list || []).slice(0, limit).map(function (item) {
        return {
          aweme_id: item.aweme_id,
          title: item.desc || '',
          create_time: helpers.formatZhTime(item.create_time || 0)
        };
      });
      return okItems(items);
    } catch (error) {
      return fail('douyinv2.content.drafts_failed', 'fetch drafts failed', String(error));
    }
  }

  async function metadataActivities() {
    try {
      var result = await helpers.creatorFetch('GET', helpers.CREATOR_BASE + '/web/api/media/activity/get/?aid=' + helpers.AID_CREATOR);
      return okItems((result.activity_list || []).map(function (item) {
        return {
          activity_id: item.activity_id,
          title: item.title || item.activity_name || '',
          end_time: typeof item.end_time === 'number' ? helpers.formatZhTime(item.end_time) : (item.show_end_time || '')
        };
      }));
    } catch (error) {
      return fail('douyinv2.metadata.activities_failed', 'fetch activities failed', String(error));
    }
  }

  async function metadataCollections(payload) {
    try {
      var limit = helpers.sanitizeLimit(payload && payload.limit, 20, 100);
      var url = helpers.CREATOR_BASE + '/web/api/mix/list/?status=0,1,2,3,6&count=' + limit + '&cursor=0&should_query_new_mix=1&device_platform=web&aid=' + helpers.AID_CREATOR;
      var result = await helpers.creatorFetch('GET', url);
      return okItems((result.mix_list || []).map(function (item) {
        return {
          mix_id: item.mix_id,
          name: item.mix_name,
          item_count: item.item_count
        };
      }));
    } catch (error) {
      return fail('douyinv2.metadata.collections_failed', 'fetch collections failed', String(error));
    }
  }

  async function metadataHashtag(payload) {
    try {
      var action = String(payload && payload.action || '').trim();
      var keyword = String(payload && payload.keyword || '').trim();
      var cover = String(payload && payload.cover || '').trim();
      var limit = helpers.sanitizeLimit(payload && payload.limit, 10, 50);
      if (action === 'search') {
        var searchUrl = helpers.CREATOR_BASE + '/aweme/v1/challenge/search/?keyword=' + encodeURIComponent(keyword) + '&count=' + limit + '&aid=' + helpers.AID_CREATOR;
        var searchResult = await helpers.creatorFetch('GET', searchUrl);
        return okItems((searchResult.challenge_list || []).map(function (item) {
          var info = item.challenge_info || {};
          return {
            name: info.cha_name,
            id: info.cid,
            view_count: info.view_count
          };
        }));
      }
      if (action === 'suggest') {
        var suggestUrl = helpers.CREATOR_BASE + '/web/api/media/hashtag/rec/?cover_uri=' + encodeURIComponent(cover) + '&aid=' + helpers.AID_CREATOR;
        var suggestResult = await helpers.creatorFetch('GET', suggestUrl);
        return okItems((suggestResult.hashtag_list || []).map(function (item) {
          return {
            name: item.name,
            id: item.id,
            view_count: item.view_count
          };
        }));
      }
      if (action === 'hot') {
        var hotUrl = helpers.CREATOR_BASE + '/aweme/v1/hotspot/recommend/?' + (keyword ? ('keyword=' + encodeURIComponent(keyword) + '&') : '') + 'aid=' + helpers.AID_CREATOR;
        var hotResult = await helpers.creatorFetch('GET', hotUrl);
        var items = hotResult.hotspot_list || (hotResult.all_sentences || []).map(function (item) {
          return {
            sentence: item.word || '',
            hot_value: item.hot_value,
            sentence_id: item.sentence_id || ''
          };
        });
        return okItems(items.slice(0, limit).map(function (item) {
          return {
            name: item.sentence,
            id: item.sentence_id || '',
            view_count: item.hot_value
          };
        }));
      }
      return fail('douyinv2.metadata.hashtag_invalid_action', 'action must be one of search/suggest/hot');
    } catch (error) {
      return fail('douyinv2.metadata.hashtag_failed', 'fetch hashtag failed', String(error));
    }
  }

  async function metadataLocation(payload) {
    try {
      var query = String(payload && payload.query || '').trim();
      if (!query) {
        return fail('douyinv2.metadata.location_query_required', 'query is required');
      }
      var limit = helpers.sanitizeLimit(payload && payload.limit, 20, 50);
      var url = helpers.CREATOR_BASE + '/aweme/v1/life/video_api/search/poi/?keyword=' + encodeURIComponent(query) + '&count=' + limit + '&aid=' + helpers.AID_CREATOR;
      var result = await helpers.creatorFetch('GET', url);
      return okItems((result.poi_list || []).map(function (item) {
        return {
          poi_id: item.poi_id,
          name: item.poi_name,
          address: item.address,
          city: item.city_name
        };
      }));
    } catch (error) {
      return fail('douyinv2.metadata.location_failed', 'fetch location failed', String(error));
    }
  }

  async function insightsStats(payload) {
    try {
      var awemeId = String(payload && payload.aweme_id || '').trim();
      if (!awemeId) {
        return fail('douyinv2.insights.aweme_id_required', 'aweme_id is required');
      }
      var now = Math.floor(Date.now() / 1000);
      var start = now - 7 * 86400;
      var result = await helpers.creatorFetch('POST', helpers.CREATOR_BASE + '/janus/douyin/creator/data/item_analysis/metrics_trend', {
        body: {
          aweme_id: awemeId,
          start_time: start,
          end_time: now,
          metrics: ['play_count', 'like_count', 'comment_count', 'share_count']
        }
      });
      var data = result.data || {};
      return okItems(Object.keys(data).map(function (metric) {
        return { metric: metric, value: data[metric] };
      }));
    } catch (error) {
      return fail('douyinv2.insights.stats_failed', 'fetch stats failed', String(error));
    }
  }

  async function userVideos(payload) {
    try {
      var secUid = String(payload && payload.sec_uid || '').trim();
      if (!secUid) {
        return fail('douyinv2.user.sec_uid_required', 'sec_uid is required');
      }
      var limit = helpers.sanitizeLimit(payload && payload.limit, 20, 20);
      var withComments = !(payload && payload.with_comments === false) && !String(payload && payload.with_comments || '').trim().toLowerCase().match(/^false|0|no$/);
      var commentLimit = helpers.sanitizeLimit(payload && payload.comment_limit, 10, 10);
      var videos = (await helpers.fetchDouyinUserVideos(secUid, limit)).slice(0, limit);
      var rows = withComments
        ? await helpers.mapInBatches(videos, 4, async function (video) {
            var comments = [];
            try {
              comments = await helpers.fetchDouyinComments(video.aweme_id, commentLimit);
            } catch (_error) {
              comments = [];
            }
            return {
              raw: video,
              top_comments: comments
            };
          })
        : videos.map(function (video) {
            return { raw: video, top_comments: [] };
          });

      return okItems(rows.map(function (entry, index) {
        var video = entry.raw || {};
        var playUrl = video.video && video.video.play_addr && video.video.play_addr.url_list && video.video.play_addr.url_list[0] || '';
        return {
          index: index + 1,
          aweme_id: video.aweme_id,
          title: video.desc || '',
          duration: Math.round(((video.video && video.video.duration) || 0) / 1000),
          digg_count: video.statistics && video.statistics.digg_count || 0,
          play_url: playUrl,
          top_comments: entry.top_comments || []
        };
      }));
    } catch (error) {
      return fail('douyinv2.user.videos_failed', 'fetch public user videos failed', String(error));
    }
  }

  async function contentDelete(payload) {
    try {
      var awemeId = String(payload && payload.aweme_id || '').trim();
      if (!awemeId) {
        return fail('douyinv2.content.aweme_id_required', 'aweme_id is required');
      }
      await helpers.creatorFetch('POST', helpers.CREATOR_BASE + '/web/api/media/aweme/delete/?aid=' + helpers.AID_CREATOR, {
        body: { aweme_id: awemeId }
      });
      return ok({ status: 'deleted', aweme_id: awemeId });
    } catch (error) {
      return fail('douyinv2.content.delete_failed', 'delete content failed', String(error));
    }
  }

  async function contentUpdate(payload) {
    try {
      var awemeId = String(payload && payload.aweme_id || '').trim();
      var reschedule = String(payload && payload.reschedule || '').trim();
      var caption = String(payload && payload.caption || '').trim();
      if (!awemeId) {
        return fail('douyinv2.content.aweme_id_required', 'aweme_id is required');
      }
      if (!reschedule && !caption) {
        return fail('douyinv2.content.update_input_required', 'reschedule or caption is required');
      }
      if (reschedule) {
        var publishTime = helpers.toUnixSeconds(reschedule);
        helpers.validateTiming(publishTime);
        await helpers.creatorFetch('POST', helpers.CREATOR_BASE + '/web/api/media/update/timer/?aid=' + helpers.AID_CREATOR, {
          body: { aweme_id: awemeId, publish_time: publishTime }
        });
      }
      if (caption) {
        await helpers.creatorFetch('POST', helpers.CREATOR_BASE + '/web/api/media/update/desc/?aid=' + helpers.AID_CREATOR, {
          body: { aweme_id: awemeId, desc: caption }
        });
      }
      return ok({ status: 'updated', aweme_id: awemeId });
    } catch (error) {
      return fail('douyinv2.content.update_failed', 'update content failed', String(error));
    }
  }

  async function contentPublish(payload) {
    try {
      var videoPath = String(payload && payload.video || '').trim();
      var title = String(payload && payload.title || '').trim();
      var schedule = String(payload && payload.schedule || '').trim();
      var caption = String(payload && payload.caption || '');
      var coverPath = String(payload && payload.cover || '').trim();
      if (!videoPath) {
        return fail('douyinv2.content.video_required', 'video is required');
      }
      if (!title) {
        return fail('douyinv2.content.title_required', 'title is required');
      }
      if (title.length > 30) {
        return fail('douyinv2.content.title_too_long', 'title cannot exceed 30 chars');
      }
      if (caption.length > 1000) {
        return fail('douyinv2.content.caption_too_long', 'caption cannot exceed 1000 chars');
      }

      await helpers.getFileInfo(videoPath);
      if (coverPath) {
        await helpers.getFileInfo(coverPath);
      }

      var timingTs = helpers.toUnixSeconds(schedule);
      helpers.validateTiming(timingTs);
      var visibilityType = helpers.VISIBILITY_MAP[String(payload && payload.visibility || 'public').trim() || 'public'];
      if (!Number.isFinite(visibilityType)) {
        visibilityType = 0;
      }

      var credentials = await helpers.getSts2Credentials();
      var videoInfo = await helpers.getFileInfo(videoPath);
      var vodUrl = 'https://vod.bytedanceapi.com/?Action=ApplyVideoUpload&ServiceId=1128&Version=2021-01-01&FileType=video&FileSize=' + Number(videoInfo.size || 0);
      var vodResult = await fetch(vodUrl, { credentials: 'include' }).then(function (response) { return response.json(); });
      var uploadAddress = vodResult && vodResult.Result ? vodResult.Result.UploadAddress : null;
      if (!uploadAddress || !uploadAddress.UploadHosts || !uploadAddress.StoreInfos || !uploadAddress.UploadHosts[0] || !uploadAddress.StoreInfos[0]) {
        throw new Error('ApplyVideoUpload did not return upload address');
      }
      var videoId = uploadAddress.VideoId;
      var uploadInfo = {
        tos_upload_url: 'https://' + uploadAddress.UploadHosts[0] + '/' + uploadAddress.StoreInfos[0].StoreUri,
        auth: uploadAddress.StoreInfos[0].Auth,
        video_id: videoId
      };

      await helpers.uploadLocalFileToTos(videoPath, uploadInfo, credentials);
      await helpers.creatorFetch('GET', helpers.CREATOR_BASE + '/web/api/media/video/enable/?video_id=' + encodeURIComponent(videoId) + '&aid=' + helpers.AID_CREATOR);

      var transcode = await helpers.pollTranscode(videoId, 300000);
      var coverUri = coverPath ? await helpers.uploadCoverToImagex(coverPath) : (transcode.poster_uri || '');
      var coverWidth = transcode.width || 720;
      var coverHeight = transcode.height || 1280;

      if (!(payload && payload.no_safety_check === true) && !String(payload && payload.no_safety_check || '').trim().toLowerCase().match(/^true|1|yes$/)) {
        var safetyBody = { video_id: videoId, title: title, desc: caption };
        await helpers.creatorFetch('POST', helpers.CREATOR_BASE + '/aweme/v1/post_assistant/fast_detect/pre_check', { body: safetyBody });
        var deadline = Date.now() + 30000;
        var safetyPassed = false;
        while (Date.now() < deadline) {
          var pollResult = await helpers.creatorFetch('POST', helpers.CREATOR_BASE + '/aweme/v1/post_assistant/fast_detect/poll', { body: safetyBody });
          if (Number(pollResult.status) === 0) {
            safetyPassed = true;
            break;
          }
          if (Number(pollResult.status) === 1) {
            throw new Error('content safety check failed');
          }
          await helpers.wait(2000);
        }
        if (!safetyPassed) {
          throw new Error('content safety check timed out');
        }
      }

      var hashtagNames = helpers.extractHashtagNames(caption);
      var hashtags = [];
      var searchFrom = 0;
      for (var i = 0; i < hashtagNames.length; i += 1) {
        var name = hashtagNames[i];
        var idx = caption.indexOf('#' + name, searchFrom);
        if (idx < 0) {
          continue;
        }
        hashtags.push({ name: name, id: 0, start: idx, end: idx + name.length + 1 });
        searchFrom = idx + name.length + 1;
      }
      var textExtra = helpers.parseTextExtra(caption, hashtags);
      var publishBody = {
        item: {
          common: {
            text: caption,
            caption: '',
            item_title: title,
            activity: JSON.stringify(payload && payload.activity ? [payload.activity] : []),
            text_extra: JSON.stringify(textExtra),
            challenges: '[]',
            mentions: '[]',
            hashtag_source: '',
            hot_sentence: String(payload && payload.hotspot || ''),
            interaction_stickers: '[]',
            visibility_type: visibilityType,
            download: payload && payload.allow_download ? 1 : 0,
            timing: timingTs,
            creation_id: 'pin' + Math.random().toString(36).slice(2, 6) + Date.now(),
            media_type: 4,
            video_id: videoId,
            music_source: 0,
            music_id: null,
            poi_id: payload && payload.poi_id ? payload.poi_id : undefined,
            poi_name: payload && payload.poi_name ? payload.poi_name : undefined
          },
          cover: {
            poster: coverUri,
            custom_cover_image_height: coverHeight,
            custom_cover_image_width: coverWidth,
            poster_delay: 0,
            cover_tools_info: JSON.stringify({
              video_cover_source: 2,
              cover_timestamp: 0,
              recommend_timestamp: 0,
              is_cover_edit: 0,
              is_cover_template: 0,
              cover_template_id: '',
              is_text_template: 0,
              text_template_id: '',
              text_template_content: '',
              is_text: 0,
              text_num: 0,
              text_content: '',
              is_use_sticker: 0,
              sticker_id: '',
              is_use_filter: 0,
              filter_id: '',
              is_cover_modify: 0,
              to_status: 0,
              cover_type: 0,
              initial_cover_uri: '',
              cut_coordinate: ''
            }),
            cover_tools_extend_info: '{}'
          },
          mix: payload && payload.collection ? { mix_id: payload.collection, mix_order: 0 } : {},
          chapter: { chapter: JSON.stringify({ chapter_abstract: '', chapter_details: [], chapter_type: 0 }) },
          anchor: {},
          sync: {
            should_sync: false,
            sync_to_toutiao: payload && payload.sync_toutiao ? 1 : 0
          },
          open_platform: {},
          assistant: { is_preview: 0, is_post_assistant: 1 },
          declare: { user_declare_info: '{}' }
        }
      };
      var publishUrl = helpers.CREATOR_BASE + '/web/api/media/aweme/create_v2/?read_aid=2906&aid=1128&cookie_enabled=true&screen_width=1512&screen_height=982&browser_language=zh-CN&browser_platform=Win32&browser_name=Mozilla&browser_online=true&timezone_name=Asia%2FShanghai&support_h265=1';
      var publishResult = await helpers.creatorFetch('POST', publishUrl, { body: publishBody });
      if (!publishResult.aweme_id) {
        throw new Error('publish succeeded but aweme_id missing');
      }
      return ok({
        status: 'scheduled',
        aweme_id: publishResult.aweme_id,
        url: 'https://www.douyin.com/video/' + publishResult.aweme_id,
        publish_time: helpers.formatZhTime(timingTs)
      });
    } catch (error) {
      return fail('douyinv2.content.publish_failed', 'publish content failed', String(error));
    }
  }

  async function contentDraft(payload) {
    try {
      var videoPath = String(payload && payload.video || '').trim();
      var title = String(payload && payload.title || '').trim();
      var caption = String(payload && payload.caption || '');
      var coverPath = String(payload && payload.cover || '').trim();
      var visibility = String(payload && payload.visibility || 'public').trim() || 'public';
      if (!videoPath || !title) {
        return fail('douyinv2.content.draft_input_required', 'video and title are required');
      }
      await helpers.getFileInfo(videoPath);
      if (coverPath) {
        await helpers.getFileInfo(coverPath);
      }
      var bridge = helpers.ensureCdp();
      var cdp = bridge.cdp;
      var invoke = bridge.invoke;
      var evalFn = bridge.evaluate;
      var created = await cdp.createWindow({ platform: 'douyinv2', account_id: 'douyinv2_draft_' + Date.now().toString(36), visible: true });
      var createdResult = created && Object.prototype.hasOwnProperty.call(created, 'result') ? created.result : created;
      var windowId = createdResult && (createdResult.window_id || createdResult.windowId) ? String(createdResult.window_id || createdResult.windowId) : '';
      if (!windowId) {
        throw new Error('createWindow did not return window_id');
      }

      async function run(op, args) {
        var response = await cdp[op].apply(cdp, args);
        if (response && response.ok === false) {
          throw new Error((response.error && response.error.message) || (op + ' failed'));
        }
        return response && Object.prototype.hasOwnProperty.call(response, 'result') ? response.result : response;
      }

      function withWindow(extra) {
        return Object.assign({ windowId: windowId }, extra || {});
      }

      async function evaluate(script) {
        return evalFn(script, withWindow({ timeout: 20000 }));
      }

      try {
        await run('goto', [helpers.DRAFT_UPLOAD_URL, withWindow({ timeout: 30000 })]);
        await run('waitForSelector', ['input[type=file]', withWindow({ timeout: 30000 })]);
        await evaluate("(() => { ['我知道了','知道了','关闭'].forEach((text) => { const btn = Array.from(document.querySelectorAll('button,[role=button]')).find((el) => (el.textContent || '').trim() === text); if (btn) { btn.click(); } }); return true; })()");
        await run('setInputFiles', ['input[type=file]', videoPath, withWindow()]);

        var composerReady = false;
        for (var attempt = 0; attempt < 120; attempt += 1) {
          var readyResult = await evaluate("(() => ({ ready: !!Array.from(document.querySelectorAll('input')).find((el) => (el.placeholder || '').includes('填写作品标题')) && !!Array.from(document.querySelectorAll('button')).find((el) => (el.textContent || '').includes('暂存离开')) }))()");
          if (readyResult && readyResult.ready) {
            composerReady = true;
            break;
          }
          await helpers.wait(500);
        }
        if (!composerReady) {
          throw new Error('draft composer not ready');
        }

        if (coverPath) {
          var coverSelector = await evaluate("(() => { const label = Array.from(document.querySelectorAll('label')).find((el) => (el.textContent || '').includes('上传新封面')); if (label) { label.click(); } const target = Array.from(document.querySelectorAll('input[type=file]')).reverse().find((el) => !el.disabled); if (!target) { return ''; } document.querySelectorAll('[data-mediause-cover-input=1]').forEach((el) => el.removeAttribute('data-mediause-cover-input')); target.setAttribute('data-mediause-cover-input', '1'); return '[data-mediause-cover-input=1]'; })()");
          if (coverSelector) {
            await run('setInputFiles', [coverSelector, coverPath, withWindow()]);
            await helpers.wait(3000);
          }
        }

        await evaluate("(() => { const title = " + JSON.stringify(title) + "; const caption = " + JSON.stringify(caption) + "; const visibility = " + JSON.stringify(helpers.VISIBILITY_LABELS[visibility] || helpers.VISIBILITY_LABELS.public) + "; const titleInput = Array.from(document.querySelectorAll('input')).find((el) => (el.placeholder || '').includes('填写作品标题')); if (!titleInput) { throw new Error('title input missing'); } titleInput.focus(); titleInput.value = title; titleInput.dispatchEvent(new Event('input', { bubbles: true })); titleInput.dispatchEvent(new Event('change', { bubbles: true })); const editor = document.querySelector('[contenteditable=true]'); if (editor) { editor.focus(); editor.textContent = caption; editor.dispatchEvent(new Event('input', { bubbles: true })); } const label = Array.from(document.querySelectorAll('label')).find((el) => (el.textContent || '').includes(visibility)); if (label) { label.click(); } const extractCreationId = () => { const fiberKey = Object.keys(titleInput).find((key) => key.startsWith('__reactFiber$')); let fiber = fiberKey ? titleInput[fiberKey] : null; while (fiber) { const props = fiber.memoizedProps; if (typeof props?.creation_id === 'string' && props.creation_id) { return props.creation_id; } fiber = fiber.return; } return ''; }; const creationId = extractCreationId(); const button = Array.from(document.querySelectorAll('button')).find((el) => (el.textContent || '').includes('暂存离开')); if (!button) { throw new Error('draft button missing'); } button.click(); return { creationId: creationId }; })()");

        var draftId = '';
        for (var index = 0; index < 20; index += 1) {
          var state = await evaluate("(() => ({ href: location.href, bodyText: document.body ? document.body.innerText : '' }))()");
          if (state && String(state.href || '').includes('/creator-micro/content/upload') && /继续编辑/.test(String(state.bodyText || ''))) {
            draftId = 'saved';
            break;
          }
          await helpers.wait(1000);
        }
        if (!draftId) {
          throw new Error('draft save confirmation not found');
        }

        return ok({ status: 'draft_saved', draft_id: draftId });
      } finally {
        try {
          await invoke('closeWindow', { window_id: windowId });
        } catch (_closeError) {
        }
      }
    } catch (error) {
      return fail('douyinv2.content.draft_failed', 'draft upload failed', String(error));
    }
  }

  window.__mediauseDouyinV2 = {
    accountHealth: accountHealth,
    userProfile: userProfile,
    userVideos: userVideos,
    contentVideos: contentVideos,
    contentDrafts: contentDrafts,
    contentDraft: contentDraft,
    contentDelete: contentDelete,
    contentPublish: contentPublish,
    contentUpdate: contentUpdate,
    metadataActivities: metadataActivities,
    metadataCollections: metadataCollections,
    metadataHashtag: metadataHashtag,
    metadataLocation: metadataLocation,
    insightsStats: insightsStats
  };
})();