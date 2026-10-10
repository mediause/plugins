(function () {
  var helpers = window.__mediauseCivitaiHelpers || {};

  var MODEL_SORTS = [
    'Most Downloaded',
    'Highest Rated',
    'Most Liked',
    'Most Discussed',
    'Most Collected',
    'Most Images',
    'Newest'
  ];

  var IMAGE_SORTS = [
    'Most Reactions',
    'Most Comments',
    'Newest'
  ];

  var PERIODS = [
    'AllTime',
    'Year',
    'Month',
    'Week',
    'Day'
  ];

  var ARTICLE_SORTS = [
    'Most Bookmarks',
    'Most Comments',
    'Most Reactions',
    'Newest'
  ];

  var ARTICLE_PERIODS = [
    'Day',
    'Week',
    'Month',
    'Year',
    'AllTime'
  ];

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

  function accountHealth() {
    try {
      var profileLink = document.querySelector('a[href^="/user/"]');
      var username = '';
      if (profileLink && profileLink.getAttribute) {
        username = String(profileLink.getAttribute('href') || '').replace('/user/', '').trim();
      }

      if (!username) {
        return helpers.successAccount({
          healthy: true,
          account: {
            id: 'guest',
            nick: 'guest',
            login: false
          }
        });
      }

      return helpers.successAccount({
        healthy: true,
        account: {
          id: username,
          nick: username,
          login: true
        }
      });
    } catch (error) {
      return errorResult('civitai.account.health_failed', 'account health check failed', String(error));
    }
  }

  async function searchModels(payload) {
    try {
      var query = helpers.normalizeString(payload && payload.query);
      if (query) {
        return errorResult(
          'civitai.search.models.query_not_supported',
          'Model keyword search is temporarily unavailable from public API. Use images search or tags search instead.'
        );
      }

      var pageCheck = helpers.normalizePositiveInt(payload && payload.page, 1, 1000, 'page');
      if (!pageCheck.ok) {
        return pageCheck.error;
      }

      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 100, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var includeNsfw = helpers.normalizeBool(payload && payload.nsfw, false);

      var data = await helpers.fetchJson('/api/v1/models', {
        sort: helpers.normalizeEnum(payload && payload.sort, MODEL_SORTS, 'Most Downloaded'),
        period: helpers.normalizeEnum(payload && payload.period, PERIODS, 'AllTime'),
        types: helpers.normalizeTypes(payload && payload.types),
        page: pageCheck.value,
        limit: limitCheck.value,
        nsfw: includeNsfw ? true : null
      });

      var rows = Array.isArray(data && data.items) ? data.items : [];
      if (!rows.length) {
        return errorResult('civitai.search.models.empty', 'No Civitai models found');
      }

      var items = rows.map(function (row, index) {
        return helpers.mapModelRecord(row, ((pageCheck.value - 1) * limitCheck.value) + index + 1);
      });

      return helpers.successData({
        items: items,
        metadata: {
          currentPage: data && data.metadata ? data.metadata.currentPage : pageCheck.value,
          pageSize: data && data.metadata ? data.metadata.pageSize : limitCheck.value,
          totalItems: data && data.metadata ? data.metadata.totalItems : items.length,
          totalPages: data && data.metadata ? data.metadata.totalPages : 1
        }
      });
    } catch (error) {
      return errorResult('civitai.search.models.failed', 'search models failed', String(error));
    }
  }

  async function searchImages(payload) {
    try {
      var pageCheck = helpers.normalizePositiveInt(payload && payload.page, 1, 1000, 'page');
      if (!pageCheck.ok) {
        return pageCheck.error;
      }

      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 200, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var includeNsfw = helpers.normalizeBool(payload && payload.nsfw, false);

      var data = await helpers.fetchJson('/api/v1/images', {
        query: helpers.normalizeString(payload && payload.query),
        sort: helpers.normalizeEnum(payload && payload.sort, IMAGE_SORTS, 'Most Reactions'),
        period: helpers.normalizeEnum(payload && payload.period, PERIODS, 'AllTime'),
        username: helpers.normalizeString(payload && payload.username),
        modelId: helpers.normalizeString(payload && payload.modelId),
        page: pageCheck.value,
        limit: limitCheck.value,
        nsfw: includeNsfw ? 'X' : null
      });

      var rows = Array.isArray(data && data.items) ? data.items : [];
      if (!rows.length) {
        return errorResult('civitai.search.images.empty', 'No Civitai images found');
      }

      var items = rows.map(function (row, index) {
        return helpers.mapImageRecord(row, ((pageCheck.value - 1) * limitCheck.value) + index + 1);
      });

      return helpers.successData({
        items: items,
        metadata: {
          currentPage: data && data.metadata ? data.metadata.currentPage : pageCheck.value,
          pageSize: data && data.metadata ? data.metadata.pageSize : limitCheck.value,
          totalItems: data && data.metadata ? data.metadata.totalItems : items.length,
          totalPages: data && data.metadata ? data.metadata.totalPages : 1
        }
      });
    } catch (error) {
      return errorResult('civitai.search.images.failed', 'search images failed', String(error));
    }
  }

  async function getModel(payload) {
    try {
      var id = helpers.normalizeString(payload && payload.id);
      if (!id) {
        return errorResult('civitai.get.model.id_required', 'id is required');
      }

      var data = await helpers.fetchJson('/api/v1/models/' + encodeURIComponent(id));
      if (!data || typeof data !== 'object' || !data.id) {
        return errorResult('civitai.get.model.not_found', 'Model not found');
      }

      var model = helpers.mapModelRecord(data, 1);
      model.description = helpers.normalizeString(data.description);
      model.allowNoCredit = !!data.allowNoCredit;
      model.allowCommercialUse = data.allowCommercialUse;
      model.allowDerivatives = !!data.allowDerivatives;
      model.allowDifferentLicense = !!data.allowDifferentLicense;
      model.modelVersions = Array.isArray(data.modelVersions)
        ? data.modelVersions.map(function (version) {
            return {
              id: version && version.id,
              name: helpers.normalizeString(version && version.name),
              baseModel: helpers.normalizeString(version && version.baseModel),
              createdAt: helpers.normalizeString(version && version.createdAt),
              fileCount: Array.isArray(version && version.files) ? version.files.length : 0
            };
          })
        : [];

      return helpers.successItems([model]);
    } catch (error) {
      return errorResult('civitai.get.model.failed', 'get model failed', String(error));
    }
  }

  async function getImage(payload) {
    try {
      var id = helpers.normalizeString(payload && payload.id);
      if (!id) {
        return errorResult('civitai.get.image.id_required', 'id is required');
      }

      var nextData = window.__NEXT_DATA__;
      var queries = nextData
        && nextData.props
        && nextData.props.pageProps
        && nextData.props.pageProps.trpcState
        && nextData.props.pageProps.trpcState.json
        && Array.isArray(nextData.props.pageProps.trpcState.json.queries)
        ? nextData.props.pageProps.trpcState.json.queries
        : [];

      function findTrpcData(domain, procedure) {
        for (var i = 0; i < queries.length; i += 1) {
          var query = queries[i] || {};
          var key = query.queryKey && query.queryKey[0];
          if (!Array.isArray(key) || key.length < 2) {
            continue;
          }
          if (key[0] === domain && key[1] === procedure) {
            return query && query.state ? query.state.data : null;
          }
        }
        return null;
      }

      var detail = findTrpcData('image', 'get');
      var generation = findTrpcData('image', 'getGenerationData');

      if (detail && detail.id) {
        var stats = detail.stats || {};
        var user = detail.user || {};
        var resources = Array.isArray(generation && generation.resources) ? generation.resources : [];
        var normalizedResources = resources.map(function (resource) {
          return {
            id: resource && resource.id ? resource.id : null,
            modelId: resource && resource.modelId ? resource.modelId : null,
            modelVersionId: resource && resource.modelVersionId ? resource.modelVersionId : null,
            modelName: helpers.normalizeString(resource && resource.modelName),
            modelType: helpers.normalizeString(resource && resource.modelType),
            type: helpers.normalizeString(resource && resource.type),
            strength: typeof (resource && resource.strength) === 'number' ? resource.strength : null,
            weight: typeof (resource && resource.weight) === 'number' ? resource.weight : null
          };
        });

        var modelMap = {};
        for (var j = 0; j < normalizedResources.length; j += 1) {
          var key = String(normalizedResources[j].modelId || '') + ':' + String(normalizedResources[j].modelVersionId || '');
          if (key === ':') {
            continue;
          }
          if (!modelMap[key]) {
            modelMap[key] = {
              modelId: normalizedResources[j].modelId,
              modelVersionId: normalizedResources[j].modelVersionId,
              modelName: normalizedResources[j].modelName,
              modelType: normalizedResources[j].modelType
            };
          }
        }

        var generationMeta = generation && generation.meta ? generation.meta : null;

        return helpers.successItems([
          {
            rank: 1,
            id: detail.id,
            name: helpers.normalizeString(detail.name),
            url: detail.id ? ('https://civitai.com/images/' + detail.id) : '',
            imageUrl: helpers.normalizeString(detail.url),
            width: Number(detail.width) || 0,
            height: Number(detail.height) || 0,
            postId: detail.postId || null,
            username: helpers.normalizeString(user.username || user.name),
            nsfwLevel: Number(detail.nsfwLevel) || 0,
            likeCount: Number(stats.likeCountAllTime || stats.likeCount) || 0,
            heartCount: Number(stats.heartCountAllTime || stats.heartCount) || 0,
            commentCount: Number(stats.commentCountAllTime || stats.commentCount) || 0,
            cryCount: Number(stats.cryCountAllTime || stats.cryCount) || 0,
            laughCount: Number(stats.laughCountAllTime || stats.laughCount) || 0,
            meta: generationMeta,
            prompt: helpers.normalizeString(generationMeta && generationMeta.prompt),
            modelId: normalizedResources.length ? (normalizedResources[0].modelId || null) : null,
            modelName: normalizedResources.length ? normalizedResources[0].modelName : '',
            modelType: normalizedResources.length ? normalizedResources[0].modelType : '',
            modelVersionId: normalizedResources.length ? (normalizedResources[0].modelVersionId || null) : null,
            models: Object.keys(modelMap).map(function (modelKey) {
              return modelMap[modelKey];
            }),
            resources: normalizedResources,
            generation: {
              type: helpers.normalizeString(generation && generation.type),
              process: helpers.normalizeString(generation && generation.process),
              displayKeys: Array.isArray(generation && generation.displayKeys) ? generation.displayKeys : []
            }
          }
        ]);
      }

      var data = await helpers.fetchJson('/api/v1/images', {
        imageId: id
      });

      var rows = Array.isArray(data && data.items) ? data.items : [];
      if (!rows.length) {
        return errorResult('civitai.get.image.not_found', 'Image not found');
      }

      var image = helpers.mapImageRecord(rows[0], 1);
      image.meta = rows[0] && rows[0].meta ? rows[0].meta : null;

      return helpers.successItems([image]);
    } catch (error) {
      return errorResult('civitai.get.image.failed', 'get image failed', String(error));
    }
  }

  async function getUserProfile(payload) {
    try {
      var username = helpers.normalizeString(payload && payload.username);
      if (!username) {
        return errorResult('civitai.user.profile.username_required', 'username is required');
      }

      var pageCheck = helpers.normalizePositiveInt(payload && payload.page, 1, 1000, 'page');
      if (!pageCheck.ok) {
        return pageCheck.error;
      }

      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 100, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var data = await helpers.fetchJson('/api/v1/models', {
        username: username,
        sort: 'Newest',
        period: 'AllTime',
        page: pageCheck.value,
        limit: limitCheck.value
      });

      var rows = Array.isArray(data && data.items) ? data.items : [];
      if (!rows.length) {
        return errorResult('civitai.user.profile.empty', 'No creator models found');
      }

      var firstCreator = rows[0] && rows[0].creator ? rows[0].creator : {};
      var profile = {
        username: helpers.normalizeString(firstCreator.username) || username,
        image: helpers.normalizeString(firstCreator.image),
        link: helpers.normalizeString(firstCreator.link)
      };

      var items = rows.map(function (row, index) {
        return helpers.mapModelRecord(row, ((pageCheck.value - 1) * limitCheck.value) + index + 1);
      });

      return helpers.successData({
        profile: profile,
        items: items,
        metadata: {
          currentPage: data && data.metadata ? data.metadata.currentPage : pageCheck.value,
          pageSize: data && data.metadata ? data.metadata.pageSize : limitCheck.value,
          totalItems: data && data.metadata ? data.metadata.totalItems : items.length,
          totalPages: data && data.metadata ? data.metadata.totalPages : 1
        }
      });
    } catch (error) {
      return errorResult('civitai.user.profile.failed', 'get user profile failed', String(error));
    }
  }

  async function getArticle(payload) {
    try {
      var idRaw = helpers.normalizeString(payload && payload.id);
      if (!idRaw) {
        return errorResult('civitai.get.article.id_required', 'id is required');
      }

      var id = Number(idRaw);
      if (!Number.isFinite(id) || id <= 0 || Math.floor(id) !== id) {
        return errorResult('civitai.get.article.invalid_id', 'id must be a positive integer');
      }

      var article = await helpers.fetchTrpc('article.getById', { id: id });
      if (!article || !article.id) {
        return errorResult('civitai.get.article.not_found', 'Article not found');
      }

      var stats = article.stats || {};
      var user = article.user || {};

      return helpers.successItems([
        {
          id: article.id,
          title: helpers.normalizeString(article.title),
          publishedAt: helpers.normalizeString(article.publishedAt),
          updatedAt: helpers.normalizeString(article.updatedAt),
          author: helpers.normalizeString(user.username || user.name),
          tagNames: Array.isArray(article.tags)
            ? article.tags.map(function (tag) {
                return helpers.normalizeString(tag && tag.name);
              }).filter(Boolean)
            : [],
          bookmarkCount: Number(stats.bookmarkCount) || 0,
          commentCount: Number(stats.commentCount) || 0,
          likeCount: Number(stats.likeCount) || 0,
          viewCount: Number(stats.viewCount) || 0,
          contentHtml: helpers.normalizeString(article.content),
          url: 'https://civitai.com/articles/' + article.id
        }
      ]);
    } catch (error) {
      return errorResult('civitai.get.article.failed', 'get article failed', String(error));
    }
  }

  async function searchTags(payload) {
    try {
      var pageCheck = helpers.normalizePositiveInt(payload && payload.page, 1, 1000, 'page');
      if (!pageCheck.ok) {
        return pageCheck.error;
      }

      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 100, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var data = await helpers.fetchJson('/api/v1/tags', {
        query: helpers.normalizeString(payload && payload.query),
        page: pageCheck.value,
        limit: limitCheck.value
      });

      var rows = Array.isArray(data && data.items) ? data.items : [];
      if (!rows.length) {
        return errorResult('civitai.search.tags.empty', 'No Civitai tags found');
      }

      var items = rows.map(function (row, index) {
        return {
          rank: ((pageCheck.value - 1) * limitCheck.value) + index + 1,
          id: row && row.id,
          name: helpers.normalizeString(row && row.name),
          modelCount: Number(row && row.modelCount) || 0,
          url: row && row.name ? 'https://civitai.com/models?tag=' + encodeURIComponent(row.name) : ''
        };
      });

      return helpers.successData({
        items: items,
        metadata: {
          currentPage: data && data.metadata ? data.metadata.currentPage : pageCheck.value,
          pageSize: data && data.metadata ? data.metadata.pageSize : limitCheck.value,
          totalItems: data && data.metadata ? data.metadata.totalItems : items.length,
          totalPages: data && data.metadata ? data.metadata.totalPages : 1
        }
      });
    } catch (error) {
      return errorResult('civitai.search.tags.failed', 'search tags failed', String(error));
    }
  }

  async function getTag(payload) {
    try {
      var name = helpers.normalizeString(payload && payload.name);
      if (!name) {
        return errorResult('civitai.get.tag.name_required', 'name is required');
      }

      var data = await helpers.fetchJson('/api/v1/tags', {
        query: name,
        limit: 50,
        page: 1
      });

      var rows = Array.isArray(data && data.items) ? data.items : [];
      if (!rows.length) {
        return errorResult('civitai.get.tag.not_found', 'Tag not found');
      }

      var exact = null;
      for (var i = 0; i < rows.length; i += 1) {
        var tagName = helpers.normalizeString(rows[i] && rows[i].name);
        if (tagName.toLowerCase() === name.toLowerCase()) {
          exact = rows[i];
          break;
        }
      }

      var target = exact || rows[0];
      return helpers.successItems([
        {
          id: target && target.id,
          name: helpers.normalizeString(target && target.name),
          modelCount: Number(target && target.modelCount) || 0,
          url: target && target.name ? 'https://civitai.com/models?tag=' + encodeURIComponent(target.name) : ''
        }
      ]);
    } catch (error) {
      return errorResult('civitai.get.tag.failed', 'get tag failed', String(error));
    }
  }

  async function searchArticles(payload) {
    try {
      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 100, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var query = helpers.normalizeString(payload && payload.query).toLowerCase();
      var sort = helpers.normalizeEnum(payload && payload.sort, ARTICLE_SORTS, 'Most Bookmarks');
      var period = helpers.normalizeEnum(payload && payload.period, ARTICLE_PERIODS, 'Month');

      var data = await helpers.fetchTrpc('article.getInfinite', {
        period: period,
        periodMode: 'published',
        sort: sort,
        browsingLevel: 1,
        excludedTagIds: [5161, 5162, 5188, 5249, 130818, 130820, 133182],
        direction: 'forward',
        limit: limitCheck.value
      });

      var rows = Array.isArray(data && data.items) ? data.items : [];
      if (!rows.length) {
        return errorResult('civitai.search.articles.empty', 'No Civitai articles found');
      }

      var filtered = rows.filter(function (item) {
        if (!query) {
          return true;
        }
        var title = helpers.normalizeString(item && item.title).toLowerCase();
        return title.indexOf(query) >= 0;
      });

      if (!filtered.length) {
        return errorResult('civitai.search.articles.empty_query', 'No Civitai articles matched the query');
      }

      var items = filtered.map(function (item, index) {
        var stats = item && item.stats ? item.stats : {};
        var user = item && item.user ? item.user : {};
        var slug = helpers.normalizeString(item && item.slug);

        return {
          rank: index + 1,
          id: item && item.id,
          title: helpers.normalizeString(item && item.title),
          publishedAt: helpers.normalizeString(item && item.publishedAt),
          author: helpers.normalizeString(user.username || user.name),
          bookmarkCount: Number(stats.bookmarkCount) || 0,
          commentCount: Number(stats.commentCount) || 0,
          likeCount: Number(stats.likeCount) || 0,
          viewCount: Number(stats.viewCount) || 0,
          url: item && item.id
            ? ('https://civitai.com/articles/' + item.id + (slug ? '/' + slug : ''))
            : ''
        };
      });

      return helpers.successItems(items);
    } catch (error) {
      return errorResult('civitai.search.articles.failed', 'search articles failed', String(error));
    }
  }

  window.__mediauseCivitai = {
    accountHealth: accountHealth,
    searchModels: searchModels,
    searchImages: searchImages,
    getModel: getModel,
    getImage: getImage,
    getArticle: getArticle,
    getUserProfile: getUserProfile,
    searchTags: searchTags,
    getTag: getTag,
    searchArticles: searchArticles
  };
})();
