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
    if (typeof window.__mediauseHuggingface !== 'object' || window.__mediauseHuggingface === null) {
      return errorResult('huggingface.bridge.not_ready', 'window.__mediauseHuggingface is not available');
    }

    var method = window.__mediauseHuggingface[methodName];
    if (typeof method !== 'function') {
      return errorResult('huggingface.bridge.handler_not_implemented', 'window.__mediauseHuggingface.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseHuggingface, payload || {});
    } catch (error) {
      return errorResult('huggingface.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseHuggingfaceSiteBridge = {
    call: callSite
  };
})();
