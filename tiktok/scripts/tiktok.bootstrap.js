(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'tiktok',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('accountHealth', payload);
      },
      'search.posts': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('searchPosts', payload);
      },
      'get.explore': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('getExplore', payload);
      },
      'get.live': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('getLive', payload);
      },
      'get.following': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('getFollowing', payload);
      },
      'get.friends': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('getFriends', payload);
      },
      'get.notifications': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('getNotifications', payload);
      },
      'user.profile': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('userProfile', payload);
      },
      'user.videos': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('userVideos', payload);
      },
      'creator.videos': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('creatorVideos', payload);
      },
      'engage.follow': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('engageFollow', payload);
      },
      'engage.unfollow': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('engageUnfollow', payload);
      },
      'engage.like': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('engageLike', payload);
      },
      'engage.unlike': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('engageUnlike', payload);
      },
      'engage.save': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('engageSave', payload);
      },
      'engage.unsave': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('engageUnsave', payload);
      },
      'engage.comment': async function (payload) {
        return window.__mediauseTiktokSiteBridge.call('engageComment', payload);
      }
    }
  });
})();
