(function () {
  var helpers = window.__mediauseLinkedinHelpers || {};

  function normalizeString(value) {
    return helpers.normalizeString ? helpers.normalizeString(value) : String(value || '').replace(/\s+/g, ' ').trim();
  }

  function errorResult(code, message, details) {
    if (helpers.errorResult) {
      return helpers.errorResult(code, message, details);
    }
    return { success: false, error: { code: code, message: message, details: details || null } };
  }

  function successItems(items) {
    return helpers.successItems ? helpers.successItems(items) : { success: true, data: { items: items || [] } };
  }

  function successObject(data) {
    return helpers.successObject ? helpers.successObject(data) : { success: true, data: data || {} };
  }

  function normalizeLimit(value, fallback, max, fieldName) {
    if (helpers.normalizePositiveInt) {
      return helpers.normalizePositiveInt(value, fallback, max, fieldName);
    }
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || Math.floor(parsed) !== parsed) {
      return { ok: false, error: errorResult('linkedin.validation.invalid_' + fieldName, fieldName + ' must be a positive integer') };
    }
    return { ok: true, value: Math.min(parsed, max) };
  }

  function normalizeName(value) {
    return normalizeString(value)
      .replace(/\s*[•·]\s*(?:1st|2nd|3rd\+?|degree connection).*$/i, '')
      .replace(/\s+LinkedIn.*$/i, '')
      .replace(/\b(p\.?eng\.?|cpa|mba|ph\.?d\.?)\b/ig, '')
      .replace(/[^\p{L}\p{N}\s.'-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isLinkedInHost(hostname) {
    var host = String(hostname || '').toLowerCase();
    return host === 'linkedin.com' || host === 'www.linkedin.com' || /\.linkedin\.com$/.test(host);
  }

  function canonicalizeLinkedInProfileUrl(value) {
    var raw = normalizeString(value);
    if (!raw) {
      return '';
    }

    try {
      var parsed = new URL(raw, 'https://www.linkedin.com');
      if (parsed.protocol !== 'https:' || !isLinkedInHost(parsed.hostname)) {
        return '';
      }

      var match = parsed.pathname.match(/^\/in\/([^/?#]+)\/?$/i);
      if (!match || !match[1]) {
        return '';
      }

      parsed.hostname = 'www.linkedin.com';
      parsed.hash = '';
      parsed.search = '';
      if (!/\/$/.test(parsed.pathname)) {
        parsed.pathname += '/';
      }
      return parsed.toString();
    } catch (_error) {
      return '';
    }
  }

  function canonicalizeLinkedInThreadUrl(value) {
    var raw = normalizeString(value);
    if (!raw) {
      return '';
    }

    try {
      var parsed = new URL(raw, 'https://www.linkedin.com');
      if (parsed.protocol !== 'https:' || !isLinkedInHost(parsed.hostname)) {
        return '';
      }

      var match = parsed.pathname.match(/^\/messaging\/thread\/([^/?#]+)\/?$/i);
      if (!match || !match[1]) {
        return '';
      }

      parsed.hostname = 'www.linkedin.com';
      parsed.hash = '';
      parsed.search = '';
      if (!/\/$/.test(parsed.pathname)) {
        parsed.pathname += '/';
      }
      return parsed.toString();
    } catch (_error) {
      return '';
    }
  }

  function profileNameMatches(candidate, expected) {
    var c = normalizeName(candidate);
    var e = normalizeName(expected);
    if (!c || !e) {
      return false;
    }
    if (c === e || c.indexOf(e) >= 0 || e.indexOf(c) >= 0) {
      return true;
    }

    var cTokens = c.replace(/[.'-]+/g, ' ').split(/\s+/).filter(function (t) { return t.length >= 2; });
    var eTokens = e.replace(/[.'-]+/g, ' ').split(/\s+/).filter(function (t) { return t.length >= 2; });
    if (cTokens.length < 2 || eTokens.length < 2) {
      return false;
    }

    var set = {};
    cTokens.forEach(function (token) { set[token] = true; });
    var matched = eTokens.filter(function (token) { return !!set[token]; }).length;
    return matched >= 2 && (matched / eTokens.length) >= 0.8;
  }

  function authBlocked(context) {
    var blocked = helpers.looksAuthWall ? helpers.looksAuthWall() : false;
    if (blocked) {
      return errorResult('linkedin.auth.required', context + ' requires an active LinkedIn session', {
        url: window.location.href,
        title: document.title
      });
    }

    var jsessionPair = String(document.cookie || '').split('; ').find(function (c) {
      return c.indexOf('JSESSIONID=') === 0;
    });
    var jsession = normalizeString((jsessionPair || '').split('=').slice(1).join('='));
    if (!jsession) {
      return errorResult('linkedin.auth.login_required', context + ' requires LinkedIn login; run mediause auth login linkedin and re-bind account context', {
        url: window.location.href,
        title: document.title
      });
    }

    return null;
  }

  function collectPosts(limit) {
    var items = [];
    var seen = {};
    var posts = Array.prototype.slice.call(document.querySelectorAll(
      'div.feed-shared-update-v2, article[data-urn], div[data-id^="urn:li:activity:"]'
    ));

    for (var i = 0; i < posts.length && items.length < limit; i += 1) {
      var root = posts[i];
      var link = root.querySelector('a[href*="/posts/"], a[href*="/feed/update/"]');
      var authorLink = root.querySelector('a[href*="/in/"], a[href*="/company/"]');
      var textNode = root.querySelector(
        '[data-test-id="main-feed-activity-card__commentary"], .feed-shared-inline-show-more-text, span[dir="ltr"], p'
      );
      var postedNode = root.querySelector('time, span[aria-label*="ago" i], span.update-components-actor__sub-description');
      var reactionsNode = root.querySelector('.social-details-social-counts__reactions-count, [aria-label*="reaction" i]');
      var commentsNode = root.querySelector('[aria-label*="comment" i], .social-details-social-counts__comments');
      var key = normalizeString((link && link.href) || '') + '::' + normalizeString((authorLink && authorLink.textContent) || '');

      if (!key || seen[key]) {
        continue;
      }
      seen[key] = true;

      var entry = {
        rank: items.length + 1,
        id: key,
        author: normalizeString(authorLink && authorLink.textContent),
        author_url: normalizeString(authorLink && authorLink.href),
        text: normalizeString(textNode && textNode.textContent),
        posted_at: normalizeString(postedNode && postedNode.textContent),
        url: normalizeString(link && link.href),
        reactions: helpers.normalizeMetric ? helpers.normalizeMetric(normalizeString(reactionsNode && reactionsNode.textContent)) : 0,
        comments: helpers.normalizeMetric ? helpers.normalizeMetric(normalizeString(commentsNode && commentsNode.textContent)) : 0
      };

      if (!entry.author || !entry.text) {
        continue;
      }

      items.push(entry);
    }

    return items;
  }

  async function accountHealth() {
    var blocked = authBlocked('account.health');
    if (blocked) {
      return blocked;
    }

    try {
      var jsessionPair = String(document.cookie || '').split('; ').find(function (c) {
        return c.indexOf('JSESSIONID=') === 0;
      });
      var jsession = normalizeString((jsessionPair || '').split('=').slice(1).join('')).replace(/^"|"$/g, '');
      if (!jsession) {
        return errorResult('linkedin.auth.login_required', 'account.health requires logged-in LinkedIn session; run mediause auth login linkedin first');
      }

      var response = await fetch('/voyager/api/me', {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'csrf-token': jsession
        }
      });

      if (response.status === 401 || response.status === 403) {
        return errorResult('linkedin.auth.login_required', 'LinkedIn login session is not valid; please run mediause auth login linkedin and use account again', {
          http_status: response.status
        });
      }

      if (!response.ok) {
        return errorResult('linkedin.account.health.http_failed', 'LinkedIn account health probe failed', {
          http_status: response.status
        });
      }

      var data = await response.json();
      var mini = data && data.miniProfile;
      if (!mini || !mini.publicIdentifier) {
        return errorResult('linkedin.auth.login_required', 'LinkedIn account identity is unavailable; login required');
      }

      var firstName = normalizeString((mini.firstName && (mini.firstName.text || mini.firstName)) || '');
      var lastName = normalizeString((mini.lastName && (mini.lastName.text || mini.lastName)) || '');
      var nick = normalizeString((firstName + ' ' + lastName).trim()) || mini.publicIdentifier;

      return successObject({
        healthy: true,
        account: {
          id: normalizeString(data && data.plainId) || normalizeString(mini.publicIdentifier) || null,
          nick: nick || null,
          login: true
        }
      });
    } catch (error) {
      return errorResult('linkedin.account.health.failed', 'LinkedIn account health check failed', String(error));
    }
  }

  async function searchJobs(payload) {
    var blocked = authBlocked('search.jobs');
    if (blocked) {
      return blocked;
    }

    var limitCheck = normalizeLimit(payload && payload.limit, 20, 100, 'limit');
    if (!limitCheck.ok) {
      return limitCheck.error;
    }

    var cards = Array.prototype.slice.call(document.querySelectorAll(
      'li.jobs-search-results__list-item a[href*="/jobs/view/"], .job-card-container a[href*="/jobs/view/"], a.job-card-container__link'
    ));
    var seen = {};
    var items = [];

    cards.forEach(function (link) {
      if (items.length >= limitCheck.value) {
        return;
      }

      var href = normalizeString(link.href || '');
      if (!href || seen[href]) {
        return;
      }
      seen[href] = true;

      var card = link.closest('li.jobs-search-results__list-item, .job-card-container, li, div') || link;
      var title = normalizeString(link.textContent);
      var companyNode = card.querySelector('.artdeco-entity-lockup__subtitle, [class*="company"], a[href*="/company/"]');
      var locationNode = card.querySelector('.artdeco-entity-lockup__caption, [class*="location"], span');

      if (!title) {
        return;
      }

      items.push({
        rank: items.length + 1,
        title: title,
        company: normalizeString(companyNode && companyNode.textContent),
        location: normalizeString(locationNode && locationNode.textContent),
        job_url: href
      });
    });

    return successItems(items);
  }

  async function searchPeople(payload) {
    var blocked = authBlocked('search.people');
    if (blocked) {
      return blocked;
    }

    var limitCheck = normalizeLimit(payload && payload.limit, 20, 100, 'limit');
    if (!limitCheck.ok) {
      return limitCheck.error;
    }

    var main = document.querySelector('main') || document.body;
    var anchors = Array.prototype.slice.call(main.querySelectorAll('a[href*="/in/"]'));
    var personEntries = [];
    var seenHandles = {};

    anchors.forEach(function (a) {
      var href = normalizeString(a.getAttribute('href'));
      var matched = href.match(/\/in\/([^/?#]+)/);
      if (!matched || !matched[1] || seenHandles[matched[1]]) {
        return;
      }
      seenHandles[matched[1]] = true;

      var aria = a.querySelector('span[aria-hidden="true"]');
      var name = normalizeString((aria && aria.textContent) || a.textContent)
        .replace(/^Status is (online|offline)\.?\s*/i, '')
        .replace(/'?s profile$/i, '')
        .replace(/\s*[•·].*$/, '')
        .trim();
      if (!name) {
        return;
      }

      personEntries.push({
        handle: matched[1],
        name: name
      });
    });

    var lines = normalizeString(main.innerText || '').split(/\n+/).map(function (line) {
      return normalizeString(line);
    }).filter(Boolean);

    function shouldSkipLine(line) {
      if (!line) {
        return true;
      }
      return /^Status is/.test(line)
        || /^(Message|Connect|Follow|View profile|Pending|Remove)$/i.test(line)
        || /^[•·]\s*(?:1st|2nd|3rd\+?|degree)/i.test(line)
        || line.indexOf('mutual connection') >= 0
        || line.indexOf('shared connection') >= 0;
    }

    var items = [];
    for (var i = 0; i < personEntries.length && items.length < limitCheck.value; i += 1) {
      var person = personEntries[i];
      var start = -1;
      for (var j = 0; j < lines.length; j += 1) {
        var current = lines[j];
        if (!shouldSkipLine(current) && (current === person.name || current.indexOf(person.name + ' ') === 0)) {
          start = j;
          break;
        }
      }

      var headline = '';
      var location = '';
      if (start >= 0) {
        for (var k = start + 1; k < lines.length; k += 1) {
          if (lines[k] === person.name) {
            break;
          }
          if (shouldSkipLine(lines[k])) {
            continue;
          }
          if (!headline) {
            headline = lines[k];
          } else if (!location) {
            location = lines[k];
            break;
          }
        }
      }

      items.push({
        rank: items.length + 1,
        name: person.name,
        headline: headline,
        location: location,
        profile_url: 'https://www.linkedin.com/in/' + person.handle + '/'
      });
    }

    return successItems(items);
  }

  async function searchSalesnav(payload) {
    var blocked = authBlocked('search.salesnav');
    if (blocked) {
      return blocked;
    }

    var limitCheck = normalizeLimit(payload && payload.limit, 25, 500, 'limit');
    if (!limitCheck.ok) {
      return limitCheck.error;
    }

    var links = Array.prototype.slice.call(document.querySelectorAll('a[href*="/sales/lead/"]'));
    var seen = {};
    var items = [];

    links.forEach(function (link) {
      if (items.length >= limitCheck.value) {
        return;
      }
      var href = normalizeString(link.href || '');
      var name = normalizeString(link.textContent);
      if (!href || !name || seen[href]) {
        return;
      }
      seen[href] = true;

      var card = link.closest('li, div') || link;
      var titleNode = card.querySelector('[class*="title"], [class*="occupation"], span');
      var companyNode = card.querySelector('[class*="company"], [class*="subtitle"], span');

      items.push({
        rank: items.length + 1,
        name: name,
        title: normalizeString(titleNode && titleNode.textContent),
        company: normalizeString(companyNode && companyNode.textContent),
        lead_url: href
      });
    });

    return successItems(items);
  }

  async function getTimeline(payload) {
    var blocked = authBlocked('get.timeline');
    if (blocked) {
      return blocked;
    }

    var limitCheck = normalizeLimit(payload && payload.limit, 20, 100, 'limit');
    if (!limitCheck.ok) {
      return limitCheck.error;
    }

    return successItems(collectPosts(limitCheck.value));
  }

  async function getInbox(payload) {
    var blocked = authBlocked('get.inbox');
    if (blocked) {
      return blocked;
    }

    var limitCheck = normalizeLimit(payload && payload.limit, 20, 100, 'limit');
    if (!limitCheck.ok) {
      return limitCheck.error;
    }

    var unreadOnly = !!(payload && payload.unread_only);
    var links = Array.prototype.slice.call(document.querySelectorAll('a[href*="/messaging/thread/"]'));
    var seen = {};
    var items = [];

    links.forEach(function (link) {
      if (items.length >= limitCheck.value) {
        return;
      }

      var href = normalizeString(link.href || '');
      if (!href || seen[href]) {
        return;
      }
      seen[href] = true;

      var row = link.closest('li, div') || link;
      var name = normalizeString(link.textContent);
      var snippetNode = row.querySelector('p, span');
      var unread = /unread/i.test(normalizeString(row.getAttribute('class'))) || /unread/i.test(normalizeString(row.textContent));
      if (unreadOnly && !unread) {
        return;
      }

      items.push({
        rank: items.length + 1,
        person_name: name,
        snippet: normalizeString(snippetNode && snippetNode.textContent),
        unread: unread,
        thread_url: href
      });
    });

    return successItems(items);
  }

  async function getJobDetail(payload) {
    var blocked = authBlocked('get.job-detail');
    if (blocked) {
      return blocked;
    }

    var titleNode = document.querySelector('h1');
    var companyNode = document.querySelector('a[href*="/company/"], [class*="company"]');
    var locationNode = document.querySelector('[class*="location"], [class*="workplace"], span');
    var descriptionNode = document.querySelector('[class*="description"], [id*="job-details"], article, main');
    var applyNode = document.querySelector('a[href*="apply"], button[aria-label*="Apply"]');

    return successItems([{
      job_url: normalizeString(payload && payload.job_url) || window.location.href,
      title: normalizeString(titleNode && titleNode.textContent),
      company: normalizeString(companyNode && companyNode.textContent),
      location: normalizeString(locationNode && locationNode.textContent),
      description: normalizeString(descriptionNode && descriptionNode.textContent).slice(0, 8000),
      apply_url: normalizeString((applyNode && applyNode.href) || '')
    }]);
  }

  async function getJobsPreferences() {
    var blocked = authBlocked('get.jobs-preferences');
    if (blocked) {
      return blocked;
    }

    var rows = Array.prototype.slice.call(document.querySelectorAll('label, [role="switch"], [role="checkbox"]')).map(function (node) {
      var text = normalizeString(node.textContent);
      if (!text) {
        return null;
      }
      var checked = false;
      if (node.matches('[role="switch"], [role="checkbox"]')) {
        checked = String(node.getAttribute('aria-checked') || '').toLowerCase() === 'true';
      } else {
        var input = node.querySelector('input[type="checkbox"], input[type="radio"]');
        checked = !!(input && input.checked);
      }

      return {
        setting: text,
        enabled: checked
      };
    }).filter(Boolean);

    return successItems(rows);
  }

  async function getSentInvitations() {
    var blocked = authBlocked('get.sent-invitations');
    if (blocked) {
      return blocked;
    }

    var items = [];
    var seen = {};
    Array.prototype.slice.call(document.querySelectorAll('a[href*="/in/"]')).forEach(function (link) {
      var href = normalizeString(link.href || '').replace(/\?.*$/, '');
      var name = normalizeString(link.textContent);
      if (!href || !name || seen[href]) {
        return;
      }
      seen[href] = true;
      items.push({
        rank: items.length + 1,
        name: name,
        profile_url: href
      });
    });

    return successItems(items);
  }

  async function getServicesRead(payload) {
    var blocked = authBlocked('get.services-read');
    if (blocked) {
      return blocked;
    }

    var heading = document.querySelector('h1, h2');
    var summary = document.querySelector('main p, section p, article p');
    var services = Array.prototype.slice.call(document.querySelectorAll('li, [role="listitem"]')).map(function (node) {
      return normalizeString(node.textContent);
    }).filter(function (value) {
      return value && value.length <= 180;
    }).slice(0, 20);

    return successItems([{
      profile_url: normalizeString(payload && payload.profile_url),
      services_url: normalizeString(payload && payload.services_url) || window.location.href,
      title: normalizeString(heading && heading.textContent),
      overview: normalizeString(summary && summary.textContent),
      services: services
    }]);
  }

  async function getThreadSnapshot(payload) {
    var blocked = authBlocked('get.thread-snapshot');
    if (blocked) {
      return blocked;
    }

    var messages = Array.prototype.slice.call(document.querySelectorAll('li, div')).map(function (node) {
      var text = normalizeString(node.textContent);
      if (!text || text.length < 2 || text.length > 1200) {
        return null;
      }
      return { text: text };
    }).filter(Boolean).slice(-200);

    return successItems([{
      thread_url: normalizeString(payload && payload.thread_url) || window.location.href,
      messages: messages,
      message_count: messages.length
    }]);
  }

  function findSectionText(name) {
    var headings = Array.prototype.slice.call(document.querySelectorAll('h2, h3'));
    var target = headings.find(function (el) {
      return normalizeString(el.textContent).toLowerCase() === String(name || '').toLowerCase();
    });

    if (!target) {
      return '';
    }

    var section = target.closest('section') || target.parentElement;
    return normalizeString(section && section.textContent).replace(new RegExp('^' + name + '\\s*', 'i'), '');
  }

  async function profileRead() {
    var blocked = authBlocked('profile.read');
    if (blocked) {
      return blocked;
    }

    var name = normalizeString((document.querySelector('main h1') || {}).textContent || '');
    var headline = normalizeString((document.querySelector('main h2') || {}).textContent || '');

    return successItems([{
      profile_url: window.location.href,
      name: name,
      headline: headline,
      about: findSectionText('About'),
      experience: findSectionText('Experience'),
      education: findSectionText('Education'),
      services: findSectionText('Services'),
      featured: findSectionText('Featured')
    }]);
  }

  async function profileExperience() {
    var blocked = authBlocked('profile.experience');
    if (blocked) {
      return blocked;
    }

    var sectionText = findSectionText('Experience');
    var lines = sectionText.split(/\n+/).map(normalizeString).filter(Boolean);
    var items = lines.slice(0, 50).map(function (line, index) {
      return {
        rank: index + 1,
        entry: line
      };
    });

    return successItems(items);
  }

  async function profileProjects() {
    var blocked = authBlocked('profile.projects');
    if (blocked) {
      return blocked;
    }

    var sectionText = findSectionText('Projects');
    var lines = sectionText.split(/\n+/).map(normalizeString).filter(Boolean);
    var items = lines.slice(0, 50).map(function (line, index) {
      return {
        rank: index + 1,
        entry: line
      };
    });

    return successItems(items);
  }

  async function profileAnalytics() {
    var blocked = authBlocked('profile.analytics');
    if (blocked) {
      return blocked;
    }

    var text = normalizeString(document.body && document.body.innerText);
    var profileViews = (text.match(/(\d[\d,\.kKmM]*)\s+profile views/i) || [])[1] || '';
    var postImpressions = (text.match(/(\d[\d,\.kKmM]*)\s+post impressions/i) || [])[1] || '';
    var searchAppearances = (text.match(/(\d[\d,\.kKmM]*)\s+search appearances/i) || [])[1] || '';

    return successItems([{
      profile_url: window.location.href,
      profile_views: helpers.normalizeMetric ? helpers.normalizeMetric(profileViews) : 0,
      post_impressions: helpers.normalizeMetric ? helpers.normalizeMetric(postImpressions) : 0,
      search_appearances: helpers.normalizeMetric ? helpers.normalizeMetric(searchAppearances) : 0
    }]);
  }

  async function postAnalytics(payload) {
    var blocked = authBlocked('post.analytics');
    if (blocked) {
      return blocked;
    }

    var limitCheck = normalizeLimit(payload && payload.limit, 20, 100, 'limit');
    if (!limitCheck.ok) {
      return limitCheck.error;
    }

    var posts = collectPosts(limitCheck.value).map(function (post) {
      return {
        id: post.id,
        author: post.author,
        text: post.text,
        reactions: post.reactions,
        comments: post.comments,
        posted_at: post.posted_at,
        url: post.url
      };
    });

    return successItems(posts);
  }

  async function engageConnect(payload) {
    var blocked = authBlocked('engage.connect');
    if (blocked) {
      return blocked;
    }

    var expectedName = normalizeString(payload && payload.expected_name);
    if (!expectedName) {
      return errorResult('linkedin.engage.connect.expected_name_required', 'expected_name is required');
    }

    var titleName = normalizeString((document.title || '').replace(/^\(\d+\+?\)\s*/, '').replace(/\s*[|｜]\s*LinkedIn\s*$/i, ''));
    var visibleName = normalizeString((document.querySelector('main h1, main h2, .text-heading-xlarge') || {}).textContent || '') || titleName;
    if (!profileNameMatches(visibleName, expectedName)) {
      return errorResult('linkedin.engage.connect.identity_mismatch', 'profile name does not match expected_name', {
        expected_name: expectedName,
        visible_name: visibleName
      });
    }

    var expectedProfileUrl = canonicalizeLinkedInProfileUrl(payload && payload.profile_url);
    var actualProfileUrl = canonicalizeLinkedInProfileUrl(window.location.href);
    if (expectedProfileUrl && actualProfileUrl && expectedProfileUrl !== actualProfileUrl) {
      return errorResult('linkedin.engage.connect.profile_url_mismatch', 'current profile url does not match expected profile_url', {
        expected: expectedProfileUrl,
        actual: actualProfileUrl
      });
    }

    var labels = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"], a')).map(function (node) {
      return normalizeString(node.innerText || node.textContent || node.getAttribute('aria-label'));
    }).filter(Boolean);
    var alreadyConnected = labels.some(function (text) {
      var lower = text.toLowerCase();
      return lower === 'message' || lower.indexOf('1st degree connection') >= 0;
    });
    if (alreadyConnected) {
      return successItems([{ status: 'not_connectable', recipient: visibleName, reason: 'already_connected', connectable: false }]);
    }
    if (labels.some(function (text) { return /pending/i.test(text); })) {
      return successItems([{ status: 'not_connectable', recipient: visibleName, reason: 'connection_pending', connectable: false }]);
    }

    var connectBtn = Array.prototype.slice.call(document.querySelectorAll('button, a[role="button"]')).find(function (node) {
      return /^connect$/i.test(normalizeString(node.textContent || node.innerText || node.getAttribute('aria-label')));
    });

    if (!connectBtn) {
      return errorResult('linkedin.engage.connect.button_not_found', 'connect button not found');
    }

    if (!(payload && payload.send)) {
      return successItems([{
        status: 'dry_run_verified',
        recipient: visibleName,
        profile_url: normalizeString(payload && payload.profile_url) || window.location.href
      }]);
    }

    connectBtn.click();
    var note = normalizeString(payload && payload.note);
    if (note) {
      var addNoteBtn = Array.prototype.slice.call(document.querySelectorAll('button')).find(function (node) {
        return /add a note/i.test(normalizeString(node.textContent));
      });
      if (addNoteBtn) {
        addNoteBtn.click();
      }
      var noteArea = document.querySelector('textarea[name="message"], textarea');
      if (noteArea) {
        noteArea.value = note;
        noteArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    var sendBtn = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"] button, button')).find(function (node) {
      return /^send$/i.test(normalizeString(node.textContent)) || /^send without a note$/i.test(normalizeString(node.textContent));
    });

    if (!sendBtn) {
      return errorResult('linkedin.engage.connect.send_not_found', 'connect dialog send button not found');
    }

    sendBtn.click();
    return successItems([{
      status: 'sent_verified',
      recipient: visibleName,
      profile_url: normalizeString(payload && payload.profile_url) || window.location.href
    }]);
  }

  async function messageSafeSend(payload) {
    var blocked = authBlocked('message.safe-send');
    if (blocked) {
      return blocked;
    }

    var expectedName = normalizeString(payload && payload.expected_name);
    var message = normalizeString(payload && payload.message);
    if (!expectedName || !message) {
      return errorResult('linkedin.message.safe_send.invalid_payload', 'expected_name and message are required');
    }

    var headerCandidates = Array.prototype.slice.call(document.querySelectorAll(
      '.msg-thread__link-to-profile, .msg-thread__link-to-profile span[aria-hidden="true"], .msg-entity-lockup__entity-title, .msg-conversation-card__participant-names, main h1, main h2, [data-anonymize="person-name"]'
    )).map(function (node) {
      return normalizeString(node.innerText || node.textContent || node.getAttribute('aria-label'));
    }).filter(Boolean);
    var header = headerCandidates.find(function (candidate) {
      return profileNameMatches(candidate, expectedName);
    }) || headerCandidates[0] || '';

    if (!profileNameMatches(header, expectedName)) {
      return errorResult('linkedin.message.safe_send.identity_mismatch', 'active thread recipient does not match expected_name', {
        expected_name: expectedName,
        visible_header: header
      });
    }

    var expectedThreadUrl = canonicalizeLinkedInThreadUrl(payload && payload.thread_url);
    var actualThreadUrl = canonicalizeLinkedInThreadUrl(window.location.href);
    if (expectedThreadUrl && actualThreadUrl && expectedThreadUrl !== actualThreadUrl) {
      return errorResult('linkedin.message.safe_send.thread_url_mismatch', 'active thread url does not match thread_url', {
        expected_thread_url: expectedThreadUrl,
        actual_thread_url: actualThreadUrl
      });
    }

    var messageBlocks = Array.prototype.slice.call(document.querySelectorAll(
      '.msg-s-message-list__event, .msg-s-event-listitem, [data-event-urn], .msg-s-message-list-content, [data-test-id*="message"]'
    )).map(function (node) {
      return normalizeString(node.innerText || node.textContent);
    }).filter(Boolean);
    var lastMessage = messageBlocks.length ? messageBlocks[messageBlocks.length - 1] : '';
    var expectedLastText = normalizeString(payload && payload.expected_last_text);
    if (expectedLastText && lastMessage.toLowerCase().indexOf(expectedLastText.toLowerCase()) < 0) {
      return errorResult('linkedin.message.safe_send.last_message_mismatch', 'latest message does not contain expected_last_text', {
        expected_last_text: expectedLastText,
        actual_last_text: lastMessage
      });
    }

    if (!(payload && payload.send)) {
      return successItems([{
        status: 'dry_run_verified',
        recipient: expectedName,
        latest_text: lastMessage,
        thread_url: normalizeString(payload && payload.thread_url) || window.location.href
      }]);
    }

    var editor = Array.prototype.slice.call(document.querySelectorAll(
      '[contenteditable="true"][role="textbox"], div.msg-form__contenteditable[contenteditable="true"], [aria-label*="Write a message" i], textarea'
    )).find(function (node) {
      return !node.closest('[aria-hidden="true"]') && (!node.matches('[contenteditable="false"]'));
    });
    if (!editor) {
      return errorResult('linkedin.message.safe_send.editor_not_found', 'message editor not found');
    }

    if (editor.tagName === 'TEXTAREA') {
      editor.value = message;
    } else {
      editor.textContent = message;
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    var composerText = normalizeString(editor.tagName === 'TEXTAREA' ? editor.value : editor.innerText || editor.textContent);
    if (composerText !== message) {
      return errorResult('linkedin.message.safe_send.composer_text_mismatch', 'composer text does not match intended message', {
        expected_text: message,
        actual_text: composerText
      });
    }

    var sendBtn = Array.prototype.slice.call(document.querySelectorAll('button')).find(function (node) {
      var label = normalizeString(node.textContent || node.innerText || node.getAttribute('aria-label')).toLowerCase();
      return label === 'send' || label === 'send message';
    });
    if (!sendBtn) {
      return errorResult('linkedin.message.safe_send.send_not_found', 'send button not found');
    }

    sendBtn.click();
    return successItems([{
      status: 'sent_verified',
      recipient: expectedName,
      thread_url: normalizeString(payload && payload.thread_url) || window.location.href
    }]);
  }

  async function salesnavInbox(payload) {
    var blocked = authBlocked('salesnav.inbox');
    if (blocked) {
      return blocked;
    }

    var limitCheck = normalizeLimit(payload && payload.limit, 25, 500, 'limit');
    if (!limitCheck.ok) {
      return limitCheck.error;
    }

    var unreadOnly = !!(payload && payload.unread_only);
    var rows = Array.prototype.slice.call(document.querySelectorAll('a[href*="/sales/inbox/"]'));
    var items = [];
    var seen = {};

    rows.forEach(function (node) {
      if (items.length >= limitCheck.value) {
        return;
      }
      var href = normalizeString(node.href || '');
      if (!href || seen[href]) {
        return;
      }
      seen[href] = true;

      var row = node.closest('li, div') || node;
      var unread = /unread/i.test(normalizeString(row.getAttribute('class'))) || /unread/i.test(normalizeString(row.textContent));
      if (unreadOnly && !unread) {
        return;
      }

      items.push({
        rank: items.length + 1,
        person_name: normalizeString(node.textContent),
        unread: unread,
        thread_url: href
      });
    });

    return successItems(items);
  }

  async function salesnavMessage(payload) {
    var blocked = authBlocked('salesnav.message');
    if (blocked) {
      return blocked;
    }

    var recipient = normalizeString(payload && payload.recipient);
    var subject = normalizeString(payload && payload.subject);
    var body = normalizeString(payload && payload.body);
    if (!recipient || !subject || !body) {
      return errorResult('linkedin.salesnav.message.invalid_payload', 'recipient, subject and body are required');
    }

    if (!(payload && payload.send)) {
      return successItems([{
        status: 'dry_run_verified',
        recipient: recipient,
        subject: subject
      }]);
    }

    var subjectInput = document.querySelector('input[name="subject"], input[placeholder*="Subject"]');
    var bodyInput = document.querySelector('textarea[name="body"], [contenteditable="true"]');
    if (!subjectInput || !bodyInput) {
      return errorResult('linkedin.salesnav.message.editor_not_found', 'sales navigator message inputs are not available');
    }

    subjectInput.value = subject;
    subjectInput.dispatchEvent(new Event('input', { bubbles: true }));

    if (bodyInput.tagName === 'TEXTAREA') {
      bodyInput.value = body;
    } else {
      bodyInput.textContent = body;
    }
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));

    var sendBtn = Array.prototype.slice.call(document.querySelectorAll('button')).find(function (node) {
      return /send/i.test(normalizeString(node.textContent));
    });
    if (!sendBtn) {
      return errorResult('linkedin.salesnav.message.send_not_found', 'send button not found');
    }

    sendBtn.click();
    return successItems([{
      status: 'sent_verified',
      recipient: recipient,
      subject: subject
    }]);
  }

  async function salesnavThread(payload) {
    var blocked = authBlocked('salesnav.thread');
    if (blocked) {
      return blocked;
    }

    var limitCheck = normalizeLimit(payload && payload.limit, 50, 500, 'limit');
    if (!limitCheck.ok) {
      return limitCheck.error;
    }

    var rows = Array.prototype.slice.call(document.querySelectorAll('[data-test-id*="message"], li, div')).map(function (node) {
      return normalizeString(node.textContent);
    }).filter(function (text) {
      return text && text.length > 1 && text.length < 1200;
    });

    var items = rows.slice(Math.max(0, rows.length - limitCheck.value)).map(function (text, index) {
      return {
        rank: index + 1,
        text: text
      };
    });

    return successItems(items);
  }

  window.__mediauseLinkedin = {
    accountHealth: accountHealth,
    searchJobs: searchJobs,
    searchPeople: searchPeople,
    searchSalesnav: searchSalesnav,
    getTimeline: getTimeline,
    getInbox: getInbox,
    getJobDetail: getJobDetail,
    getJobsPreferences: getJobsPreferences,
    getSentInvitations: getSentInvitations,
    getServicesRead: getServicesRead,
    getThreadSnapshot: getThreadSnapshot,
    profileRead: profileRead,
    profileExperience: profileExperience,
    profileProjects: profileProjects,
    profileAnalytics: profileAnalytics,
    postAnalytics: postAnalytics,
    engageConnect: engageConnect,
    messageSafeSend: messageSafeSend,
    salesnavInbox: salesnavInbox,
    salesnavMessage: salesnavMessage,
    salesnavThread: salesnavThread
  };
})();
