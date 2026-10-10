(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseHuggingfaceSiteBridge || typeof window.__mediauseHuggingfaceSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'huggingface.bridge.not_ready',
          message: 'window.__mediauseHuggingfaceSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseHuggingfaceSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'huggingface',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return forward('accountHealth', payload);
      },
      'get.top': async function (payload) {
        return forward('getTop', payload);
      },
      'get.models': async function (payload) {
        return forward('getModels', payload);
      },
      'get.datasets': async function (payload) {
        return forward('getDatasets', payload);
      },
      'get.spaces': async function (payload) {
        return forward('getSpaces', payload);
      },
      'get.paper': async function (payload) {
        return forward('getPaper', payload);
      }
    }
  });
})();
