(function () {
  function errorResult(code, message, details) {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  async function callSite(methodName, payload) {
    if (typeof window.__mediauseXiaohongshu !== 'object' || window.__mediauseXiaohongshu === null) {
      return errorResult('xiaohongshu.bridge.not_ready', 'window.__mediauseXiaohongshu is not available');
    }

    var method = window.__mediauseXiaohongshu[methodName];
    if (typeof method !== 'function') {
      return errorResult('xiaohongshu.bridge.handler_not_implemented', 'window.__mediauseXiaohongshu.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseXiaohongshu, payload || {});
    } catch (error) {
      return errorResult('xiaohongshu.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseXiaohongshuSiteBridge = {
    call: callSite
  };
})();
