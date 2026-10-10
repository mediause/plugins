(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseCivitaiSiteBridge || typeof window.__mediauseCivitaiSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'civitai.bridge.not_ready',
          message: 'window.__mediauseCivitaiSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseCivitaiSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'civitai',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return forward('accountHealth', payload);
      },
      'search.models': async function (payload) {
        return forward('searchModels', payload);
      },
      'search.images': async function (payload) {
        return forward('searchImages', payload);
      },
      'search.tags': async function (payload) {
        return forward('searchTags', payload);
      },
      'search.articles': async function (payload) {
        return forward('searchArticles', payload);
      },
      'get.model': async function (payload) {
        return forward('getModel', payload);
      },
      'get.image': async function (payload) {
        return forward('getImage', payload);
      },
      'get.article': async function (payload) {
        return forward('getArticle', payload);
      },
      'get.tag': async function (payload) {
        return forward('getTag', payload);
      },
      'user.profile': async function (payload) {
        return forward('getUserProfile', payload);
      }
    }
  });
})();
