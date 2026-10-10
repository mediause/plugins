(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  function forward(methodName, payload) {
    return window.__mediauseDouyinV2SiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'douyinv2',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return forward('accountHealth', payload);
      },
      'user.profile': async function (payload) {
        return forward('userProfile', payload);
      },
      'user.videos': async function (payload) {
        return forward('userVideos', payload);
      },
      'content.videos': async function (payload) {
        return forward('contentVideos', payload);
      },
      'content.drafts': async function (payload) {
        return forward('contentDrafts', payload);
      },
      'content.draft': async function (payload) {
        return forward('contentDraft', payload);
      },
      'content.delete': async function (payload) {
        return forward('contentDelete', payload);
      },
      'content.publish': async function (payload) {
        return forward('contentPublish', payload);
      },
      'content.update': async function (payload) {
        return forward('contentUpdate', payload);
      },
      'metadata.activities': async function (payload) {
        return forward('metadataActivities', payload);
      },
      'metadata.collections': async function (payload) {
        return forward('metadataCollections', payload);
      },
      'metadata.hashtag': async function (payload) {
        return forward('metadataHashtag', payload);
      },
      'metadata.location': async function (payload) {
        return forward('metadataLocation', payload);
      },
      'insights.stats': async function (payload) {
        return forward('insightsStats', payload);
      }
    }
  });
})();
