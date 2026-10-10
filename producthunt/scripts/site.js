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
    if (typeof window.__mediauseProducthunt !== 'object' || window.__mediauseProducthunt === null) {
      return errorResult('producthunt.bridge.not_ready', 'window.__mediauseProducthunt is not available');
    }

    var method = window.__mediauseProducthunt[methodName];
    if (typeof method !== 'function') {
      return errorResult('producthunt.bridge.handler_not_implemented', 'window.__mediauseProducthunt.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseProducthunt, payload || {});
    } catch (error) {
      return errorResult('producthunt.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseProducthuntSiteBridge = {
    call: callSite
  };
})();
