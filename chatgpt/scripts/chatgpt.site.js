(function () {
  var helpers = window.__mediauseChatgptHelpers;

  function err(code, message, details) {
    return helpers.asErr(code, message, details);
  }

  function ok(data) {
    return helpers.asOk(data);
  }

  async function ensureLoginAndComposer() {
    await helpers.ensureOnChatGPT();
    var state = helpers.getPageState();
    if (!state.isLoggedIn || state.hasLoginGate) {
      return { ok: false, value: err('chatgpt.auth.required', 'ChatGPT login is required') };
    }
    if (!state.hasComposer) {
      return { ok: false, value: err('chatgpt.composer.missing', 'ChatGPT composer is not available') };
    }
    return { ok: true, value: state };
  }

  window.__mediauseChatgpt = {
    accountHealth: async function () {
      try {
        await helpers.ensureOnChatGPT();
        var state = helpers.getPageState();
        return ok({
          healthy: !!(state.isLoggedIn && !state.hasLoginGate),
          account: {
            id: null,
            nick: null,
            login: !!(state.isLoggedIn && !state.hasLoginGate)
          }
        });
      } catch (error) {
        return err('chatgpt.account.health_failed', 'account health failed', String(error));
      }
    },

    chatStatus: async function () {
      try {
        await helpers.ensureOnChatGPT();
        var state = helpers.getPageState();
        return ok({
          status: state.hasComposer ? 'Connected' : 'Page not ready',
          login: state.isLoggedIn && !state.hasLoginGate,
          url: state.url
        });
      } catch (error) {
        return err('chatgpt.chat.status_failed', 'chat status failed', String(error));
      }
    },

    chatNew: async function () {
      try {
        await helpers.startNewChat();
        var state = helpers.getPageState();
        if (!state.isLoggedIn || state.hasLoginGate) {
          return err('chatgpt.auth.required', 'ChatGPT login is required');
        }
        return ok({ status: 'New chat started', url: state.url });
      } catch (error) {
        return err('chatgpt.chat.new_failed', 'chat new failed', String(error));
      }
    },

    chatSend: async function (payload) {
      try {
        var safe = payload || {};
        var prompt = String(safe.prompt || '').trim();
        if (!prompt) {
          return err('chatgpt.invalid_argument', 'prompt is required');
        }

        if (helpers.normalizeBoolean(safe.new, false)) {
          await helpers.startNewChat();
        } else {
          await helpers.ensureOnChatGPT();
        }

        var ready = await ensureLoginAndComposer();
        if (!ready.ok) return ready.value;

        var sent = await helpers.sendMessage(prompt);
        if (!sent) {
          return err('chatgpt.chat.send_failed', 'Failed to send message to ChatGPT');
        }

        return ok({
          status: 'Success',
          injected_text: prompt,
          url: String(window.location && window.location.href || '')
        });
      } catch (error) {
        return err('chatgpt.chat.send_failed', 'chat send failed', String(error));
      }
    },

    chatAsk: async function (payload) {
      try {
        var safe = payload || {};
        var prompt = String(safe.prompt || '').trim();
        if (!prompt) {
          return err('chatgpt.invalid_argument', 'prompt is required');
        }

        var timeout = Number(safe.timeout || 120);
        if (!Number.isFinite(timeout) || timeout < 1) {
          timeout = 120;
        }

        if (helpers.normalizeBoolean(safe.new, false)) {
          await helpers.startNewChat();
        } else {
          await helpers.ensureOnChatGPT();
        }

        var ready = await ensureLoginAndComposer();
        if (!ready.ok) return ready.value;

        var baseline = helpers.getVisibleMessages().length;
        var sent = await helpers.sendMessage(prompt);
        if (!sent) {
          return err('chatgpt.chat.send_failed', 'Failed to send message to ChatGPT');
        }

        var response = await helpers.waitForAssistantResponse(baseline, prompt, timeout);
        return ok({
          response: response,
          timeout: timeout,
          url: String(window.location && window.location.href || '')
        });
      } catch (error) {
        return err('chatgpt.chat.ask_failed', 'chat ask failed', String(error));
      }
    },

    chatRead: async function () {
      try {
        await helpers.ensureOnChatGPT();
        var state = helpers.getPageState();
        if (!state.isLoggedIn || state.hasLoginGate) {
          return err('chatgpt.auth.required', 'ChatGPT login is required');
        }

        var messages = helpers.getVisibleMessages();
        if (!messages.length) {
          return err('chatgpt.empty_result', 'No visible ChatGPT messages were found in the current conversation');
        }

        return ok({ messages: messages, count: messages.length });
      } catch (error) {
        return err('chatgpt.chat.read_failed', 'chat read failed', String(error));
      }
    },

    chatHistory: async function (payload) {
      try {
        var safe = payload || {};
        var limit = Number(safe.limit || 20);
        if (!Number.isFinite(limit) || limit < 1) {
          limit = 20;
        }

        await helpers.ensureOnChatGPT();
        var state = helpers.getPageState();
        if (!state.isLoggedIn || state.hasLoginGate) {
          return err('chatgpt.auth.required', 'ChatGPT login is required');
        }

        var list = helpers.getConversationList();
        if (!list.length) {
          return err('chatgpt.empty_result', 'No ChatGPT conversation links were visible in the sidebar');
        }

        return ok({ conversations: list.slice(0, limit), count: Math.min(limit, list.length) });
      } catch (error) {
        return err('chatgpt.chat.history_failed', 'chat history failed', String(error));
      }
    },

    chatDetail: async function (payload) {
      try {
        var safe = payload || {};
        var id = helpers.parseConversationId(safe.id);
        if (!id) {
          return err('chatgpt.invalid_argument', 'id is required and must be a conversation id or /c/<id> URL');
        }

        window.location.href = helpers.CHATGPT_URL + '/c/' + id;
        await helpers.sleep(3000);

        var state = helpers.getPageState();
        if (!state.isLoggedIn || state.hasLoginGate) {
          return err('chatgpt.auth.required', 'ChatGPT login is required');
        }

        var messages = helpers.getVisibleMessages();
        if (!messages.length) {
          return err('chatgpt.empty_result', 'No visible ChatGPT messages were found for this conversation');
        }

        return ok({ id: id, messages: messages, count: messages.length });
      } catch (error) {
        return err('chatgpt.chat.detail_failed', 'chat detail failed', String(error));
      }
    },

    imageGenerate: async function (payload) {
      try {
        var safe = payload || {};
        var prompt = String(safe.prompt || '').trim();
        if (!prompt) {
          return err('chatgpt.invalid_argument', 'prompt is required');
        }

        var timeout = Number(safe.timeout || 240);
        if (!Number.isFinite(timeout) || timeout < 1) {
          timeout = 240;
        }

        await helpers.startNewChat();

        var ready = await ensureLoginAndComposer();
        if (!ready.ok) return ready.value;

        var before = helpers.getVisibleImageUrls();
        var sent = await helpers.sendMessage('Generate an image of: ' + prompt);
        if (!sent) {
          return err('chatgpt.image.send_failed', 'Failed to send image generation prompt');
        }

        var deadline = Date.now() + timeout * 1000;
        var urls = [];
        while (Date.now() < deadline) {
          await helpers.sleep(3000);
          var current = helpers.getVisibleImageUrls();
          urls = current.filter(function (url) { return before.indexOf(url) < 0; });
          if (urls.length) break;
        }

        if (!urls.length) {
          return err('chatgpt.image.timeout', 'No generated images were detected before timeout');
        }

        return ok({
          prompt: prompt,
          images: urls,
          count: urls.length,
          conversation_url: String(window.location && window.location.href || '')
        });
      } catch (error) {
        return err('chatgpt.image.generate_failed', 'image generate failed', String(error));
      }
    }
  };
})();
