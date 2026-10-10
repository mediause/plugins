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
    if (typeof window.__mediauseLinkedin !== 'object' || window.__mediauseLinkedin === null) {
      return errorResult('linkedin.bridge.not_ready', 'window.__mediauseLinkedin is not available');
    }

    var method = window.__mediauseLinkedin[methodName];
    if (typeof method !== 'function') {
      return errorResult('linkedin.bridge.handler_not_implemented', 'window.__mediauseLinkedin.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseLinkedin, payload || {});
    } catch (error) {
      return errorResult('linkedin.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseLinkedinSiteBridge = {
    call: callSite
  };
})();
