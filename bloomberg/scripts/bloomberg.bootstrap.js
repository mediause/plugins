(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseBloombergSiteBridge || typeof window.__mediauseBloombergSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'bloomberg.bridge.not_ready',
          message: 'window.__mediauseBloombergSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseBloombergSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'bloomberg',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return forward('accountHealth', payload);
      },
      'feeds.list': async function (payload) {
        return forward('listFeeds', payload);
      },
      'get.main': async function (payload) {
        return forward('getMain', payload);
      },
      'get.markets': async function (payload) {
        return forward('getMarkets', payload);
      },
      'get.economics': async function (payload) {
        return forward('getEconomics', payload);
      },
      'get.industries': async function (payload) {
        return forward('getIndustries', payload);
      },
      'get.tech': async function (payload) {
        return forward('getTech', payload);
      },
      'get.politics': async function (payload) {
        return forward('getPolitics', payload);
      },
      'get.businessweek': async function (payload) {
        return forward('getBusinessweek', payload);
      },
      'get.opinions': async function (payload) {
        return forward('getOpinions', payload);
      },
      'read.news': async function (payload) {
        return forward('readNews', payload);
      }
    }
  });
})();
