(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseFifa2026SiteBridge || typeof window.__mediauseFifa2026SiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'fifa2026.bridge.not_ready',
          message: 'window.__mediauseFifa2026SiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseFifa2026SiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'fifa2026',
    version: 'v1',
    handlers: {
      'search.player': async function (payload) {
        return forward('searchPlayer', payload);
      },
      'search.team': async function (payload) {
        return forward('searchTeam', payload);
      },
      'search.group': async function (payload) {
        return forward('searchGroup', payload);
      },
      'get.player': async function (payload) {
        return forward('getPlayer', payload);
      },
      'get.team': async function (payload) {
        return forward('getTeam', payload);
      },
      'get.player-stats': async function (payload) {
        return forward('getPlayerStats', payload);
      },
      'get.team-stats': async function (payload) {
        return forward('getTeamStats', payload);
      },
      'compare.teams': async function (payload) {
        return forward('compareTeams', payload);
      },
      'predict.match': async function (payload) {
        return forward('predictMatch', payload);
      }
    }
  });
})();
