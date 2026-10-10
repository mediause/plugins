(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseInstagramSiteBridge || typeof window.__mediauseInstagramSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'instagram.bridge.not_ready',
          message: 'window.__mediauseInstagramSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseInstagramSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'instagram',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return forward('accountHealth', payload);
      },
      'search.users': async function (payload) {
        return forward('searchUsers', payload);
      },
      'get.explore': async function (payload) {
        return forward('getExplore', payload);
      },
      'get.saved': async function (payload) {
        return forward('getSaved', payload);
      },
      'user.profile': async function (payload) {
        return forward('userProfile', payload);
      },
      'user.feed': async function (payload) {
        return forward('userFeed', payload);
      },
      'user.followers': async function (payload) {
        return forward('userFollowers', payload);
      },
      'user.following': async function (payload) {
        return forward('userFollowing', payload);
      },
      'engage.follow': async function (payload) {
        return forward('engageFollow', payload);
      },
      'engage.unfollow': async function (payload) {
        return forward('engageUnfollow', payload);
      },
      'engage.like': async function (payload) {
        return forward('engageLike', payload);
      },
      'engage.unlike': async function (payload) {
        return forward('engageUnlike', payload);
      },
      'engage.save': async function (payload) {
        return forward('engageSave', payload);
      },
      'engage.unsave': async function (payload) {
        return forward('engageUnsave', payload);
      },
      'engage.comment': async function (payload) {
        return forward('engageComment', payload);
      },
      'collection.create': async function (payload) {
        return forward('collectionCreate', payload);
      },
      'collection.delete': async function (payload) {
        return forward('collectionDelete', payload);
      },
      'post.note': async function (payload) {
        return forward('postNote', payload);
      },
      'post.feed': async function (payload) {
        return forward('postFeed', payload);
      },
      'post.reel': async function (payload) {
        return forward('postReel', payload);
      },
      'post.story': async function (payload) {
        return forward('postStory', payload);
      },
      'download.media': async function (payload) {
        return forward('downloadMedia', payload);
      }
    }
  });
})();