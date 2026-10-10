(function () {
  var CHATGPT_URL = 'https://chatgpt.com';
  var COMPOSER_SELECTORS = [
    '[aria-label="Chat with ChatGPT"]',
    '[placeholder="Ask anything"]',
    '#prompt-textarea',
    '[data-testid="prompt-textarea"]',
    '[contenteditable="true"][role="textbox"]'
  ];
  var SEND_BUTTON_LABELS = ['Send prompt', 'Send message', 'Send'];

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

  function asOk(data) {
    return {
      success: true,
      data: data
    };
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function normalizeBoolean(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (value == null || value === '') return !!fallback;
    var normalized = String(value).trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }

  function parseConversationId(value) {
    var raw = String(value || '').trim();
    var match = raw.match(/(?:^|\/c\/)([A-Za-z0-9_-]{8,})(?:[/?#]|$)/);
    if (match) return match[1];
    if (/^[A-Za-z0-9_-]{8,}$/.test(raw)) return raw;
    return '';
  }

  async function sleep(ms) {
    return await new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function ensureOnChatGPT() {
    var href = String(window.location && window.location.href || '');
    if (href.indexOf('chatgpt.com') >= 0) return false;
    window.location.href = CHATGPT_URL;
    await sleep(2000);
    return true;
  }

  function findComposer() {
    for (var i = 0; i < COMPOSER_SELECTORS.length; i += 1) {
      var selector = COMPOSER_SELECTORS[i];
      var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
      for (var j = 0; j < nodes.length; j += 1) {
        var node = nodes[j];
        if (isVisible(node)) return node;
      }
    }
    return null;
  }

  function getPageState() {
    var composer = findComposer();
    var text = (document.body && document.body.innerText || '').replace(/\s+/g, ' ').trim();
    var userMenu = document.querySelector('[data-testid="profile-button"], [aria-label*="Profile"], [aria-label*="Account"]');
    var hasLoginGate = /log in to chatgpt|sign up to chatgpt|welcome to chatgpt|登录/i.test(text);
    var isLoggedIn = !!userMenu || !hasLoginGate;
    return {
      url: String(window.location && window.location.href || ''),
      hasComposer: !!composer,
      hasLoginGate: hasLoginGate,
      isLoggedIn: isLoggedIn
    };
  }

  function getVisibleMessages() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-message-author-role], article[data-testid*="conversation-turn"]'));
    nodes = nodes.filter(function (node) { return isVisible(node); });

    var rows = [];
    var seen = {};

    function roleOf(node) {
      var attr = String(node.getAttribute('data-message-author-role') || node.getAttribute('data-author') || '');
      if (/assistant/i.test(attr)) return 'Assistant';
      if (/user/i.test(attr)) return 'User';
      var testid = String(node.getAttribute('data-testid') || '');
      if (/assistant/i.test(testid)) return 'Assistant';
      if (/user/i.test(testid)) return 'User';
      return '';
    }

    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var role = roleOf(node);
      if (!role) {
        var roleNode = node.querySelector('[data-message-author-role], [data-author]');
        if (roleNode) role = roleOf(roleNode);
      }
      if (!role) continue;

      var contentNode = node.querySelector('[data-message-author-role] .markdown') || node.querySelector('.markdown') || node;
      var text = String(contentNode && (contentNode.innerText || contentNode.textContent) || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;

      var key = role + '\n' + text;
      if (seen[key]) continue;
      seen[key] = true;
      rows.push({ Index: rows.length + 1, Role: role, Text: text });
    }

    return rows;
  }

  async function startNewChat() {
    window.location.href = CHATGPT_URL + '/new';
    await sleep(2000);
  }

  async function sendMessage(text) {
    var composer = findComposer();
    if (!composer) return false;

    composer.focus();
    if (typeof composer.value === 'string') {
      composer.value = text;
      composer.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      composer.textContent = '';
      document.execCommand('insertText', false, text);
    }

    await sleep(800);

    var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
    var sendButton = buttons.find(function (btn) {
      var label = String(btn.getAttribute('aria-label') || '').trim();
      return SEND_BUTTON_LABELS.indexOf(label) >= 0 && !btn.disabled;
    });
    if (!sendButton) return false;

    sendButton.click();
    return true;
  }

  function isGenerating() {
    var bodyText = String(document.body && document.body.innerText || '');
    return /Stop generating|Thinking/i.test(bodyText);
  }

  async function waitForAssistantResponse(baselineCount, prompt, timeoutSeconds) {
    var deadline = Date.now() + timeoutSeconds * 1000;
    var stableText = '';
    var stableCount = 0;
    var normalizedPrompt = String(prompt || '').trim();

    while (Date.now() < deadline) {
      await sleep(2500);
      if (isGenerating()) {
        stableCount = 0;
        continue;
      }

      var messages = getVisibleMessages();
      var newMessages = messages.slice(Math.max(0, baselineCount));
      var assistant = null;
      for (var i = newMessages.length - 1; i >= 0; i -= 1) {
        if (newMessages[i].Role === 'Assistant') {
          assistant = newMessages[i];
          break;
        }
      }
      if (!assistant) {
        for (var j = messages.length - 1; j >= 0; j -= 1) {
          if (messages[j].Role === 'Assistant') {
            assistant = messages[j];
            break;
          }
        }
      }

      var candidate = String(assistant && assistant.Text || '').trim();
      if (!candidate || candidate === normalizedPrompt) continue;

      if (candidate === stableText) {
        stableCount += 1;
        if (stableCount >= 2) return candidate;
      } else {
        stableText = candidate;
        stableCount = 0;
      }
    }

    throw new Error('chatgpt ask timeout');
  }

  function getConversationList() {
    var links = Array.prototype.slice.call(document.querySelectorAll('a[href*="/c/"]')).filter(isVisible);
    var rows = [];
    var seen = {};

    for (var i = 0; i < links.length; i += 1) {
      var link = links[i];
      var href = String(link.getAttribute('href') || '');
      var match = href.match(/\/c\/([^/?#]+)/);
      if (!match) continue;
      var id = match[1];
      if (seen[id]) continue;
      seen[id] = true;
      var title = String(link.innerText || link.textContent || '').replace(/\s+/g, ' ').trim() || '(untitled)';
      rows.push({
        Index: rows.length + 1,
        Id: id,
        Title: title,
        Url: href.indexOf('http') === 0 ? href : (CHATGPT_URL + href)
      });
    }

    return rows;
  }

  function getVisibleImageUrls() {
    var images = Array.prototype.slice.call(document.querySelectorAll('img')).filter(isVisible);
    var urls = [];
    var seen = {};

    for (var i = 0; i < images.length; i += 1) {
      var src = String(images[i].src || '');
      if (!src) continue;
      if (!/openai|chatgpt|oaidalleapiprodscus|blob:/i.test(src)) continue;
      if (seen[src]) continue;
      seen[src] = true;
      urls.push(src);
    }

    return urls;
  }

  window.__mediauseChatgptHelpers = {
    CHATGPT_URL: CHATGPT_URL,
    asErr: asErr,
    asOk: asOk,
    normalizeBoolean: normalizeBoolean,
    parseConversationId: parseConversationId,
    sleep: sleep,
    ensureOnChatGPT: ensureOnChatGPT,
    findComposer: findComposer,
    getPageState: getPageState,
    getVisibleMessages: getVisibleMessages,
    startNewChat: startNewChat,
    sendMessage: sendMessage,
    waitForAssistantResponse: waitForAssistantResponse,
    getConversationList: getConversationList,
    getVisibleImageUrls: getVisibleImageUrls
  };
})();
