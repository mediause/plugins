(function () {
  function asErr(code, message, details) {
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
    if (typeof window.__mediauseGoogle !== 'object' || window.__mediauseGoogle === null) {
      return asErr('google.bridge.not_ready', 'window.__mediauseGoogle is not available');
    }

    var method = window.__mediauseGoogle[methodName];
    if (typeof method !== 'function') {
      return asErr('google.bridge.handler_not_implemented', 'window.__mediauseGoogle.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseGoogle, payload || {});
    } catch (error) {
      return asErr('google.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseGoogleSiteBridge = {
    call: callSite
  };
})();
