(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseSemrushSiteBridge || typeof window.__mediauseSemrushSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'semrush.bridge.not_ready',
          message: 'window.__mediauseSemrushSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseSemrushSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'semrush',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) { return forward('accountHealth', payload); },
      'search.domain': async function (payload) { return forward('searchDomain', payload); },
      'domain.overview': async function (payload) { return forward('getOverview', payload); },
      'domain.competitors': async function (payload) { return forward('getCompetitors', payload); },
      'keyword.overview': async function (payload) { return forward('getKeyword', payload); },
      'keyword.positions': async function (payload) { return forward('getPositions', payload); },
      'organic.overview': async function (payload) { return forward('getOrganic', payload); },
      'organic.pages': async function (payload) { return forward('getOrganicPages', payload); },
      'organic.positions': async function (payload) { return forward('getPositionsList', payload); },
      'backlinks.overview': async function (payload) { return forward('getBacklinks', payload); },
      'backlinks.domains': async function (payload) { return forward('getBacklinksDomains', payload); },
      'backlinks.detail': async function (payload) { return forward('getBacklinksDetail', payload); },
      'backlinks.new_lost': async function (payload) { return forward('getBacklinksNewLost', payload); },
      'backlinks.anchors': async function (payload) { return forward('getBacklinksAnchors', payload); },
      'project.overview': async function (payload) { return forward('getProject', payload); },
      'project.position_tracking': async function (payload) { return forward('getProjectPositionTracking', payload); },
      'project.site_audit_overview': async function (payload) { return forward('getSiteAuditOverview', payload); },
      'project.site_audit_issues': async function (payload) { return forward('getSiteAuditIssues', payload); },
      'seo.keyword_gap': async function (payload) { return forward('getKeywordGap', payload); },
      'seo.backlink_gap': async function (payload) { return forward('getBacklinkGap', payload); },
      'seo.quick_wins': async function (payload) { return forward('getQuickWins', payload); },
      'seo.position_distribution': async function (payload) { return forward('getPositionDistribution', payload); },
      'seo.serp_features_coverage': async function (payload) { return forward('getSerpFeaturesCoverage', payload); },
      'seo.content_recommendations': async function (payload) { return forward('getContentRecommendations', payload); }
    }
  });
})();
