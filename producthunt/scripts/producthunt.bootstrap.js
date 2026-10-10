(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseProducthuntSiteBridge || typeof window.__mediauseProducthuntSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'producthunt.bridge.not_ready',
          message: 'window.__mediauseProducthuntSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseProducthuntSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'producthunt',
    version: 'v1',
    handlers: {
      'get.posts': async function (payload) { return forward('getPosts', payload); },
      'get.today': async function (payload) { return forward('getToday', payload); },
      'get.hot': async function (payload) { return forward('getHot', payload); },
      'get.detail': async function (payload) { return forward('getDetail', payload); },
      'search.browse': async function (payload) { return forward('searchBrowse', payload); }
    }
  });
})();
