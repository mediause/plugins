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
    if (typeof window.__mediauseInstagram !== 'object' || window.__mediauseInstagram === null) {
      return errorResult('instagram.bridge.not_ready', 'window.__mediauseInstagram is not available');
    }

    var method = window.__mediauseInstagram[methodName];
    if (typeof method !== 'function') {
      return errorResult('instagram.bridge.handler_not_implemented', 'window.__mediauseInstagram.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseInstagram, payload || {});
    } catch (error) {
      return errorResult('instagram.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseInstagramSiteBridge = {
    call: callSite
  };
})();