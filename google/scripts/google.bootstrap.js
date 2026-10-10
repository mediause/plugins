(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'google',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return window.__mediauseGoogleSiteBridge.call('accountHealth', payload);
      },
      'search.web': async function (payload) {
        return window.__mediauseGoogleSiteBridge.call('searchWeb', payload);
      },
      'search.suggest': async function (payload) {
        return window.__mediauseGoogleSiteBridge.call('searchSuggest', payload);
      },
      'get.news': async function (payload) {
        return window.__mediauseGoogleSiteBridge.call('getNews', payload);
      },
      'get.trends': async function (payload) {
        return window.__mediauseGoogleSiteBridge.call('getTrends', payload);
      }
    }
  });
})();
