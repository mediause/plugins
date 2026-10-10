(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseWeixinSiteBridge || typeof window.__mediauseWeixinSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'weixin.bridge.not_ready',
          message: 'window.__mediauseWeixinSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseWeixinSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'weixin',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return forward('accountHealth', payload);
      },
      'search.articles': async function (payload) {
        return forward('searchArticles', payload);
      },
      'get.drafts': async function (payload) {
        return forward('getDrafts', payload);
      },
      'get.article': async function (payload) {
        return forward('getArticle', payload);
      },
      'post.create-draft': async function (payload) {
        return forward('createDraft', payload);
      }
    }
  });
})();
