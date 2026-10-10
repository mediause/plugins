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
    if (typeof window.__mediauseBloomberg !== 'object' || window.__mediauseBloomberg === null) {
      return errorResult('bloomberg.bridge.not_ready', 'window.__mediauseBloomberg is not available');
    }

    var method = window.__mediauseBloomberg[methodName];
    if (typeof method !== 'function') {
      return errorResult('bloomberg.bridge.handler_not_implemented', 'window.__mediauseBloomberg.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseBloomberg, payload || {});
    } catch (error) {
      return errorResult('bloomberg.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseBloombergSiteBridge = {
    call: callSite
  };
})();
