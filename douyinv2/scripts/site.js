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
    if (typeof window.__mediauseDouyinV2 !== 'object' || window.__mediauseDouyinV2 === null) {
      return errorResult('douyinv2.bridge.not_ready', 'window.__mediauseDouyinV2 is not available');
    }

    var method = window.__mediauseDouyinV2[methodName];
    if (typeof method !== 'function') {
      return errorResult('douyinv2.bridge.handler_not_implemented', 'window.__mediauseDouyinV2.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseDouyinV2, payload || {});
    } catch (error) {
      return errorResult('douyinv2.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseDouyinV2SiteBridge = {
    call: callSite
  };
})();

