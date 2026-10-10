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
    if (typeof window.__mediauseCivitai !== 'object' || window.__mediauseCivitai === null) {
      return errorResult('civitai.bridge.not_ready', 'window.__mediauseCivitai is not available');
    }

    var method = window.__mediauseCivitai[methodName];
    if (typeof method !== 'function') {
      return errorResult('civitai.bridge.handler_not_implemented', 'window.__mediauseCivitai.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseCivitai, payload || {});
    } catch (error) {
      return errorResult('civitai.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseCivitaiSiteBridge = {
    call: callSite
  };
})();
