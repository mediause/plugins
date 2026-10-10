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
    if (typeof window.__mediauseTwitter !== 'object' || window.__mediauseTwitter === null) {
      return errorResult('twitter.bridge.not_ready', 'window.__mediauseTwitter is not available');
    }

    var method = window.__mediauseTwitter[methodName];
    if (typeof method !== 'function') {
      return errorResult('twitter.bridge.handler_not_implemented', 'window.__mediauseTwitter.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseTwitter, payload || {});
    } catch (error) {
      return errorResult('twitter.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseTwitterSiteBridge = {
    call: callSite
  };
})();