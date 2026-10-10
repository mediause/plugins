(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseArxivSiteBridge || typeof window.__mediauseArxivSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'arxiv.bridge.not_ready',
          message: 'window.__mediauseArxivSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseArxivSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'arxiv',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return forward('accountHealth', payload);
      },
      'search.papers': async function (payload) {
        return forward('searchPapers', payload);
      },
      'get.paper': async function (payload) {
        return forward('getPaper', payload);
      },
      'get.recent': async function (payload) {
        return forward('getRecent', payload);
      },
      'user.author': async function (payload) {
        return forward('userPapers', payload);
      }
    }
  });
})();
