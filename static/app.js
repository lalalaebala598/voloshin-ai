
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const t = window.TRANSLATIONS || {};
  const appShell = document.querySelector(".app-shell");
  const sidebar = document.getElementById("sidebar");
  const mobileSidebarCloseBtn = document.getElementById("mobileSidebarCloseBtn");
  const messages = document.getElementById("messages");
  const input = document.getElementById("input");
  const chatList = document.getElementById("chatList");

  const attachBtn = document.getElementById("attachBtn");
  const voiceInputBtn = document.getElementById("voiceInputBtn");
  const attachMenu = document.getElementById("attachMenu");
  const photoInput = document.getElementById("photoInput");
  const cameraInput = document.getElementById("cameraInput");
  const fileInput = document.getElementById("fileInput");

  const settingsModal = document.getElementById("settingsModal");
  const authModal = document.getElementById("authModal");
  const registerModal = document.getElementById("registerModal");
  const aiModal = document.getElementById("aiModal");
  const profileModal = document.getElementById("profileModal");
  const accountModal = document.getElementById("accountModal");
  const confirmLogoutModal = document.getElementById("confirmLogoutModal");
  const trainModal = document.getElementById("trainModal");
  const imageModal = document.getElementById("imageModal");
  const welcomeGate = document.getElementById("welcomeGate");

  const profileName = document.getElementById("profileName");
  const profileAbout = document.getElementById("profileAbout");
  const settingsVoiceGenderSelect = document.getElementById("settingsVoiceGenderSelect");
  const voiceGenderSelect = document.getElementById("voiceGenderSelect");
  const composerModeHint = document.getElementById("composerModeHint");
  const profilePhotoName = document.getElementById("profilePhotoName");
  const toneSelect = document.getElementById("toneSelect");
  const modeSelect = document.getElementById("modeSelect");
  const languageSelect = document.getElementById("languageSelect");
  const themeSelect = document.getElementById("themeSelect");
  const accountEmail = document.getElementById("accountEmail");
  const currentAccountPassword = document.getElementById("currentAccountPassword");
  const accountPassword = document.getElementById("accountPassword");
  const profilePhotoFile = document.getElementById("profilePhotoFile");
  const profilePhotoUrl = document.getElementById("profilePhotoUrl");

  const modelInput = document.getElementById("modelInput");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const imageTokenInput = document.getElementById("imageToken");
  const imagePromptInput = document.getElementById("imagePrompt");
  const imageModelInput = document.getElementById("imageModel");

  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const toggleAuthPassword = document.getElementById("toggleAuthPassword");
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = document.getElementById("registerPassword");
  const toggleRegisterPassword = document.getElementById("toggleRegisterPassword");
  const toggleAccountPassword = document.getElementById("toggleAccountPassword");
  const toggleCurrentAccountPassword = document.getElementById("toggleCurrentAccountPassword");
  const authLoggedIn = document.getElementById("authLoggedIn");
  const authLoggedOut = document.getElementById("authLoggedOut");
  const authStatusText = document.getElementById("authStatusText");
  const authModalTitle = document.getElementById("authModalTitle");
  const loggedEmail = document.getElementById("loggedEmail");
  const guestBtn = document.getElementById("guestBtn");  const appToast = document.getElementById("appToast");

  const statusDot = document.getElementById("statusDot");
  const topStatusDot = document.getElementById("topStatusDot");
  const mobileTopStatusDot = document.getElementById("mobileTopStatusDot");
  const statusText = document.getElementById("statusText");
  const statusMeta = document.getElementById("statusMeta");
  const modeLabel = document.getElementById("modeLabel");
  const infoBanner = document.getElementById("infoBanner");

  let typingIndicator = null;
  let observer = null;

  function $(id){ return document.getElementById(id); }

  function isLoggedIn() {
    return body.dataset.loggedIn === "true";
  }
  function isGuestMode() {
    return sessionStorage.getItem("voloshin_guest_mode") === "true";
  }
  function setGuestMode(v) {
    if (v) sessionStorage.setItem("voloshin_guest_mode", "true");
    else sessionStorage.removeItem("voloshin_guest_mode");
  }

  function getPreferredTheme() {
    const saved = localStorage.getItem("voloshin_theme");
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
    return "dark";
  }

  function resolveTheme(theme) {
    if (theme === "system") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return theme === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    const resolved = resolveTheme(theme);
    body.classList.toggle("theme-light", resolved === "light");
    body.dataset.theme = theme;
  }

  function translatePage() {
    document.documentElement.lang = body.dataset.language || "ru";
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (t[key]) el.textContent = t[key];
    });
    if (input) input.placeholder = t.placeholder || input.placeholder;
  }

  function showToast(text) {
    if (!appToast) return;
    appToast.textContent = text;
    appToast.classList.remove("hidden");
    requestAnimationFrame(() => appToast.classList.add("show"));
    clearTimeout(window.__voloshinToastTimer);
    window.__voloshinToastTimer = setTimeout(() => {
      appToast.classList.remove("show");
      setTimeout(() => appToast.classList.add("hidden"), 220);
    }, 2200);
  }


  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let activeUtterance = null;
  let activeSpeakBtn = null;

  function stopVoiceRecognition() {
    try { recognition && recognition.stop(); } catch (_) {}
    isListening = false;
    voiceInputBtn?.classList.remove("listening");
    if (voiceInputBtn) voiceInputBtn.title = "Голосовой ввод";
    if (input) input.dataset.voiceBase = "";
  }

  function ensureVoiceRecognition() {
    if (!SpeechRecognitionAPI) return null;
    if (recognition) return recognition;

    recognition = new SpeechRecognitionAPI();
    recognition.lang = (body.dataset.language || "ru") === "ru" ? "ru-RU" : "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening = true;
      voiceInputBtn?.classList.add("listening");
      if (voiceInputBtn) voiceInputBtn.title = "Слушаю...";
      showToast("Слушаю...");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }
      const base = input?.dataset.voiceBase || "";
      const extra = (finalText || interimText).trim();
      if (input) input.value = [base, extra].filter(Boolean).join(base && extra ? " " : "");
    };

    recognition.onend = () => {
      isListening = false;
      if (input) input.dataset.voiceBase = "";
      voiceInputBtn?.classList.remove("listening");
      if (voiceInputBtn) voiceInputBtn.title = "Голосовой ввод";
    };

    recognition.onerror = (event) => {
      isListening = false;
      if (input) input.dataset.voiceBase = "";
      voiceInputBtn?.classList.remove("listening");
      if (voiceInputBtn) voiceInputBtn.title = "Голосовой ввод";
      const code = event?.error || "unknown";
      if (code === "not-allowed") showToast("Дай доступ к микрофону.");
      else if (code === "no-speech") showToast("Не услышал речь.");
      else showToast("Ошибка голосового ввода.");
    };

    return recognition;
  }

  function toggleVoiceRecognition() {
    if (!voiceInputBtn) return;
    const rec = ensureVoiceRecognition();
    if (!rec) {
      showToast("В этом браузере голосовой ввод не поддерживается.");
      return;
    }
    if (isListening) {
      stopVoiceRecognition();
      return;
    }
    if (input) input.dataset.voiceBase = (input.value || "").trim();
    try {
      rec.lang = (body.dataset.language || "ru") === "ru" ? "ru-RU" : "en-US";
      rec.start();
    } catch (_) {
      showToast("Не удалось запустить микрофон.");
    }
  }

  function getPreferredVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!voices || !voices.length) return null;
    const prefer = settingsVoiceGenderSelect?.value || body.dataset.voiceGender || "male";
    if (prefer === "female") {
      return voices.find(v => /ru/i.test(v.lang) && /(female|anna|alena|alya|elena|milena|victoria|zira|google)/i.test(v.name))
        || voices.find(v => /ru/i.test(v.lang))
        || voices.find(v => /en/i.test(v.lang) && /(female|samantha|victoria|zira|aria)/i.test(v.name))
        || voices[0]
        || null;
    }
    return voices.find(v => /ru/i.test(v.lang) && /(male|aleksei|yuri|pavel|nikolai|dmitri|maxim|alexander|google)/i.test(v.name))
      || voices.find(v => /ru/i.test(v.lang))
      || voices.find(v => /en/i.test(v.lang) && /(male|daniel|alex|tom|fred)/i.test(v.name))
      || voices[0]
      || null;
  }

  function stopSpeaking() {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {}
    activeUtterance = null;
    if (activeSpeakBtn) activeSpeakBtn.classList.remove("speaking");
    activeSpeakBtn = null;
  }

  function speakText(text, btn = null) {
    if (!("speechSynthesis" in window)) {
      showToast("Озвучка в этом браузере не поддерживается.");
      return;
    }
    const clean = String(text || "").replace(/<[^>]+>/g, "").trim();
    if (!clean) return;
    if (activeSpeakBtn === btn && activeUtterance) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(clean);
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || ((body.dataset.language || "ru") === "ru" ? "ru-RU" : "en-US");
    utterance.rate = 0.98;
    utterance.pitch = 0.86;
    utterance.volume = 1;
    utterance.onend = () => stopSpeaking();
    utterance.onerror = () => {
      stopSpeaking();
      showToast("Не удалось озвучить ответ.");
    };
    activeUtterance = utterance;
    activeSpeakBtn = btn;
    if (btn) btn.classList.add("speaking");
    window.speechSynthesis.speak(utterance);
  }



  function applyMobileViewportFix() {
    if (!window.visualViewport) return;
    const update = () => {
      document.documentElement.style.setProperty("--keyboard-offset", `0px`);
      if (document.activeElement === input) {
        setTimeout(() => scrollToBottom(true), 20);
      }
    };
    update();
    window.visualViewport.addEventListener("resize", update);
    window.visualViewport.addEventListener("scroll", update);
  }


  function toneLabel(value) {
    return {
      normal: "нормальный",
      rude: "пожёстче",
      polite: "вежливый"
    }[value] || "нормальный";
  }

  function modeLabelText(value) {
    return {
      normal: "обычный",
      teacher: "рассуждающий",
      coder: "кодер",
      brief: "коротко"
    }[value] || "обычный";
  }

  function updateModeUi() {
    if (composerModeHint) {
      const mode = modeSelect?.value || body.dataset.profileMode || "normal";
      const tone = toneSelect?.value || body.dataset.profileTone || "normal";
      const modeHint = {
        normal: "Обычный формат ответа",
        teacher: "Сейчас ответы будут более рассуждающими",
        coder: "Сейчас ответы будут с упором на код и структуру",
        brief: "Сейчас ответы будут короче и по сути"
      }[mode] || "Обычный формат ответа";
      const toneHint = tone === "normal" ? "" : ` · стиль: ${toneLabel(tone)}`;
      composerModeHint.textContent = modeHint + toneHint;
    }
    if (input) {
      const mode = modeSelect?.value || body.dataset.profileMode || "normal";
      input.placeholder = {
        normal: "Напиши сообщение...",
        teacher: "Напиши сообщение... Сейчас ответ будет более рассуждающим",
        coder: "Напиши сообщение... Можно с кодом или задачей",
        brief: "Напиши сообщение... Ответ будет короче"
      }[mode] || "Напиши сообщение...";
    }
  }


  function getConfig() {
    return {
      apiKey: localStorage.getItem("voloshin_groq_api_key") || "",
      model: localStorage.getItem("voloshin_groq_model") || "llama-3.3-70b-versatile"
    };
  }

  function applyStatus(mode = null) {
    const cfg = getConfig();
    const serverKeyEnabled = body.dataset.serverKeyEnabled === "true";
    const connected = !!(serverKeyEnabled || cfg.apiKey);
    statusDot?.classList.toggle("connected", connected);
    topStatusDot?.classList.toggle("connected", connected);
    mobileTopStatusDot?.classList.toggle("connected", connected);
    if (connected) {
      statusText.textContent = "Серверное ядро";
      statusMeta.textContent = "";
    } else {
      statusText.textContent = "Локальный режим";
      statusMeta.textContent = "";
    }
    modeLabel.textContent = connected ? "AI online" : "AI local";
    infoBanner.style.display = connected ? "none" : "flex";
  }

  function nearBottom() {
    return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 120;
  }
  function scrollToBottom(force = false) {
    requestAnimationFrame(() => {
      if (force || nearBottom()) messages.scrollTop = messages.scrollHeight;
    });
  }
  function initAutoScroll() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => scrollToBottom());
    observer.observe(messages, {childList: true, subtree: true});
  }

  function renderChevron(collapsed) {
    const icon = $("brandCollapseIcon");
    if (!icon) return;
    icon.innerHTML = collapsed
      ? `<svg viewBox="0 0 24 24" style="transform:rotate(180deg)"><path d="M15 5L8 12L15 19" /></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M15 5L8 12L15 19" /></svg>`;
  }
  function setCollapseArrow() {
    const collapsed = window.innerWidth <= 980 ? !sidebar.classList.contains("open") : appShell.classList.contains("sidebar-collapsed");
    renderChevron(collapsed);
  }
  function closeSidebarMobile() {
    if (window.innerWidth <= 980) sidebar.classList.remove("open");
    setCollapseArrow();
  }

  function toggleSidebar() {
    if (window.innerWidth <= 980) sidebar.classList.toggle("open");
    else appShell.classList.toggle("sidebar-collapsed");
    setCollapseArrow();
  }

  function animateText(el, text, speed = 8) {
    el.textContent = "";
    let i = 0;
    function tick() {
      if (i < text.length) {
        el.textContent += text[i++];
        if (i % 4 === 0) scrollToBottom();
        setTimeout(tick, speed);
      } else scrollToBottom(true);
    }
    tick();
  }

  function messageToolsHTML(text) {
    const safe = text.replace(/"/g, '&quot;');
    return `<div class="message-tools">
      <button class="tool-btn copy-btn" data-copy="${safe}">${t.copy || "Копировать"}</button>
      <button class="tool-btn speak-btn" data-speak="${safe}" title="Озвучить">🔊</button>
      <button class="tool-btn like-btn" data-feedback="like" data-text="${safe}">👍</button>
      <button class="tool-btn dislike-btn" data-feedback="dislike" data-text="${safe}">👎</button>
    </div>`;
  }

  function addMessage(role, text, animated = false) {
    const wrap = document.createElement("div");
    wrap.className = `message-wrap ${role === "user" ? "msg-user" : "msg-assistant"}`;
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    if (animated) animateText(bubble, text);
    else bubble.textContent = text;
    if (role === "assistant") {
      const tools = document.createElement("div");
      tools.innerHTML = messageToolsHTML(text);
      messages.appendChild(tools.firstElementChild);
    }
    scrollToBottom();
  }

  function addImageMessage(src, caption) {
    const wrap = document.createElement("div");
    wrap.className = "image-wrap";
    wrap.innerHTML = `<div class="image-bubble"><img src="${src}" alt="Generated image"><div class="image-caption">${caption}</div></div>`;
    messages.appendChild(wrap);
    scrollToBottom(true);
  }

  function showTyping(longMode = false) {
    hideTyping();
    const wrap = document.createElement("div");
    wrap.className = "message-wrap msg-assistant";
    wrap.id = "typing-indicator";
    const bubble = document.createElement("div");
    bubble.className = "message-bubble typing-bubble";
    bubble.innerHTML = longMode
      ? `<span class="typing-inline"><span>${t.thinking || "Думаю"}</span><span class="dot-wave"></span><span class="dot-wave"></span><span class="dot-wave"></span></span>`
      : '<span class="dot-wave"></span><span class="dot-wave"></span><span class="dot-wave"></span>';
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    typingIndicator = wrap;
    scrollToBottom(true);
  }
  function hideTyping() {
    if (typingIndicator?.parentNode) typingIndicator.parentNode.removeChild(typingIndicator);
    typingIndicator = null;
  }

  function syncDropdown(wrap) {
    const select = wrap.querySelector("select");
    const valueEl = wrap.querySelector(".custom-display-value");
    const currentOpt = [...select.options].find(o => o.value === select.value) || select.options[0];
    if (valueEl && currentOpt) valueEl.textContent = currentOpt.textContent;
    wrap.querySelectorAll(".model-option").forEach(btn => btn.classList.toggle("active", btn.dataset.value === select.value));
  }

  function initDropdowns() {
    document.querySelectorAll(".custom-dropdown-wrap").forEach(wrap => {
      const select = wrap.querySelector("select");
      const displayBtn = wrap.querySelector(".custom-display-btn");
      const dropdown = wrap.querySelector(".model-dropdown");
      if (!displayBtn || !dropdown || !select) return;
      displayBtn.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll(".custom-dropdown-wrap").forEach(other => {
          if (other !== wrap) {
            other.classList.remove("open");
            other.querySelector(".model-dropdown")?.classList.add("hidden");
          }
        });
        wrap.classList.toggle("open");
        dropdown.classList.toggle("hidden");
      };
      wrap.querySelectorAll(".model-option").forEach(btn => {
        btn.onclick = () => {
          select.value = btn.dataset.value;
          syncDropdown(wrap);
          wrap.classList.remove("open");
          dropdown.classList.add("hidden");
        };
      });
      syncDropdown(wrap);
    });
    document.addEventListener("click", (e) => {
      document.querySelectorAll(".custom-dropdown-wrap").forEach(wrap => {
        if (!wrap.contains(e.target)) {
          wrap.classList.remove("open");
          wrap.querySelector(".model-dropdown")?.classList.add("hidden");
        }
      });
    });
  }

  function openLoginModal() {
    syncAuthModal();
    authModal.classList.remove("hidden");
    authEmail?.focus();
  }

  function openRegisterModal() {
    registerModal?.classList.remove("hidden");
    registerEmail?.focus();
  }

  function syncAuthModal() {
    const logged = isLoggedIn();
    authLoggedIn.classList.toggle("hidden", !logged);
    authLoggedOut.classList.toggle("hidden", logged);
    if (logged) {
      if (authModalTitle) authModalTitle.textContent = "Аккаунт";
      authStatusText.textContent = `Вы вошли как ${body.dataset.userEmail || ""}`;
      loggedEmail.textContent = body.dataset.userEmail || "";
    } else {
      if (authModalTitle) authModalTitle.textContent = "Вход в аккаунт";
      authStatusText.textContent = "Введи почту и пароль, чтобы войти.";
    }
  }

  function syncAvatar() {
    const img = $("profileAvatarImg");
    const fallback = $("profileAvatarFallback");
    const src = body.dataset.profilePhoto || "";
    if (src) {
      img.src = src;
      img.classList.remove("hidden");
      fallback.classList.add("hidden");
    } else {
      img.classList.add("hidden");
      fallback.classList.remove("hidden");
    }
  }

  function syncWelcomeGate() {
    welcomeGate.classList.toggle("show", !isLoggedIn() && !isGuestMode());
  }

  function closeModalOnBackdrop(modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }

  function loadGuestMessages() {
    messages.innerHTML = "";
    const saved = JSON.parse(sessionStorage.getItem("voloshin_guest_messages") || "[]");
    if (saved.length === 0) {
      addMessage("assistant", "Привет. Это гостевой режим. Можешь писать без регистрации, но история сохранится только в этой вкладке.", true);
      saveGuestMessages();
      return;
    }
    for (const m of saved) addMessage(m.role, m.text, false);
  }

  function saveGuestMessages() {
    if (!isGuestMode()) return;
    const arr = [];
    messages.querySelectorAll(".message-wrap").forEach(w => {
      const role = w.classList.contains("msg-user") ? "user" : "assistant";
      const text = w.querySelector(".message-bubble")?.textContent || "";
      if (text) arr.push({role, text});
    });
    sessionStorage.setItem("voloshin_guest_messages", JSON.stringify(arr));
  }

  function guestAnswer(message) {
    const q = message.toLowerCase();
    if (q.includes("привет")) return "Привет. Это гостевой режим. Можем поболтать, а если захочешь синхронизацию между устройствами — войдёшь в аккаунт.";
    if (q.includes("как дела")) return "Нормально. Я в гостевом режиме, но отвечать всё равно могу. Что разберём?";
    if (q.includes("небо")) return "Небо обычно кажется голубым из-за рассеивания солнечного света в атмосфере.";
    if (q.includes("машин")) return "Машина обычно состоит из двигателя, кузова, трансмиссии, подвески, тормозов, рулевого управления, электроники и колёс.";
    return "Я сейчас в гостевом режиме. Могу отвечать на простые вопросы и поддерживать диалог, а для синхронизации между устройствами лучше войти в аккаунт.";
  }

  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    if (isGuestMode()) {
      addMessage("user", message, false);
      input.value = "";
      showTyping(message.length > 140);
      setTimeout(() => {
        hideTyping();
        addMessage("assistant", guestAnswer(message), true);
        saveGuestMessages();
      }, 300);
      return;
    }

    const cfg = getConfig();
    addMessage("user", message, false);
    input.value = "";
    showTyping(message.length > 140);
    try {
      const res = await fetch("/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({message, apiKey: cfg.apiKey, model: cfg.model})
      });
      const data = await res.json();
      hideTyping();
      addMessage("assistant", data.response || "Нет ответа.", true);
      applyStatus(data.mode || null);
      await refreshChats();
    } catch (_) {
      hideTyping();
      addMessage("assistant", "Ошибка сервера.", true);
    }
  }

  function handleKey(event){ if (event.key === "Enter") sendMessage(); }

  async function createNewChat() {
    if (isGuestMode()) {
      messages.innerHTML = "";
      sessionStorage.removeItem("voloshin_guest_messages");
      addMessage("assistant", "Новый гостевой чат создан. Можешь писать.", true);
      saveGuestMessages();
      refreshChats();
      return;
    }
    messages.innerHTML = "";
    addMessage("assistant", "Создаю новый чат...", true);
    const res = await fetch("/new-chat", {method:"POST"});
    const data = await res.json();
    if (!data.ok) return;
    messages.innerHTML = "";
    addMessage("assistant", "Новый чат создан. Можешь писать.", true);
    await refreshChats();
  }

  async function deleteChat(chatId, row = null) {
    if (isGuestMode()) {
      messages.innerHTML = "";
      sessionStorage.removeItem("voloshin_guest_messages");
      addMessage("assistant", "Гостевой чат очищен.", true);
      saveGuestMessages();
      refreshChats();
      return;
    }
    if (row) {
      row.classList.add("chat-delete");
      await new Promise(r => setTimeout(r, 160));
    }
    const res = await fetch("/delete-chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({chat_id: chatId})
    });
    const data = await res.json();
    if (!data.ok) return;
    await refreshCurrentChat();
    await refreshChats();
  }

  async function switchChat(chatId) {
    if (isGuestMode()) return;
    const res = await fetch("/switch-chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({chat_id: chatId})
    });
    const data = await res.json();
    if (!data.ok) return;
    messages.innerHTML = "";
    for (const msg of data.messages) addMessage(msg.role, msg.text, false);
    await refreshChats();
    if (window.innerWidth <= 980) sidebar.classList.remove("open");
    setCollapseArrow();
  }

  async function refreshChats() {
    if (isGuestMode()) {
      chatList.innerHTML = `<div class="chat-row active"><button class="chat-item"><span class="chat-dot"></span><span class="chat-title">Гостевой чат</span></button><button class="delete-chat-btn" title="Очистить">×</button></div>`;
      chatList.querySelector(".delete-chat-btn").onclick = () => deleteChat("guest", chatList.firstElementChild);
      return;
    }
    const res = await fetch("/chats");
    const data = await res.json();
    chatList.innerHTML = "";
    for (const item of data.items) {
      const row = document.createElement("div");
      row.className = "chat-row chat-enter" + (String(item.id) === String(data.current_chat_id) ? " active" : "");
      row.innerHTML = `
        <button class="chat-item"><span class="chat-dot"></span><span class="chat-title"></span></button>
        <button class="delete-chat-btn" title="Удалить чат">×</button>
      `;
      row.querySelector(".chat-title").textContent = item.title;
      row.querySelector(".chat-item").onclick = () => switchChat(item.id);
      row.querySelector(".delete-chat-btn").onclick = () => deleteChat(item.id, row);
      chatList.appendChild(row);
    }
  }

  async function refreshCurrentChat() {
    if (isGuestMode()) {
      loadGuestMessages();
      refreshChats();
      return;
    }
    const res = await fetch("/chats");
    const data = await res.json();
    if (data.current_chat_id) await switchChat(data.current_chat_id);
  }

  async function uploadFile(file) {
    if (!file) return;
    if (isGuestMode()) {
      addMessage("user", `[Файл: ${file.name}]`, false);
      addMessage("assistant", "В гостевом режиме файл принят только визуально. Для полноценной обработки файла лучше войти в аккаунт.", true);
      attachMenu.classList.add("hidden");
      saveGuestMessages();
      return;
    }
    const form = new FormData();
    form.append("file", file);
    showToast(`Загружаю: ${file.name}`);
    const res = await fetch("/upload-file", {method:"POST", body: form});
    const data = await res.json();
    if (data.image_url) {
      addMessage("user", `[Изображение: ${data.filename || file.name}]`, false);
      addImageMessage(data.image_url, data.filename || "Изображение");
      addMessage("assistant", "Изображение добавлено. Можешь попросить описание или разбор, если модель это поддерживает.", true);
    } else {
      await refreshCurrentChat();
    }
    attachMenu.classList.add("hidden");
    showToast(data.image_url ? "Изображение добавлено." : "Файл добавлен.");
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function loadProfileIntoModal() { closeSidebarMobile();
    if (!isLoggedIn()) {
      openLoginModal();
      return;
    }
    profileName.value = body.dataset.profileName || "";
    profileAbout.value = body.dataset.profileAbout || "";
    toneSelect.value = body.dataset.profileTone || "normal";
    modeSelect.value = body.dataset.profileMode || "normal";
    languageSelect.value = body.dataset.language || "ru";
    themeSelect.value = getPreferredTheme();
    accountEmail.value = body.dataset.userEmail || "";
    currentAccountPassword.value = "";
    accountPassword.value = "";
    profilePhotoUrl.value = body.dataset.profilePhoto || "";
    document.querySelectorAll(".custom-dropdown-wrap").forEach(syncDropdown);
    const openModal = () => profileModal.classList.remove("hidden");
    if (window.innerWidth <= 980) setTimeout(openModal, 120);
    else openModal();
  }

  async function saveProfile() {
    const payload = {
      name: profileName.value.trim(),
      about: profileAbout.value.trim(),
      tone: toneSelect.value,
      mode: modeSelect.value,
      photo_url: profilePhotoUrl.value.trim()
    };
    await fetch("/save-profile", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    body.dataset.profileName = payload.name;
    body.dataset.profileAbout = payload.about;
    body.dataset.profileTone = payload.tone;
    body.dataset.profileMode = payload.mode;
    body.dataset.profilePhoto = payload.photo_url;
    syncAvatar();
  if (settingsVoiceGenderSelect) settingsVoiceGenderSelect.value = body.dataset.voiceGender || "male";
    updateModeUi();
    showToast("Профиль обновлён.");
    profileModal.classList.add("hidden");
  }


  async function savePhotoOnly() {
    if (!profilePhotoFile || !profilePhotoFile.files || !profilePhotoFile.files[0]) {
      showToast("Сначала выбери фото.");
      return;
    }
    profilePhotoUrl.value = await fileToDataURL(profilePhotoFile.files[0]);
    const payload = {
      email: "",
      current_password: "",
      password: "",
      photo_url: profilePhotoUrl.value.trim()
    };
    const res = await fetch("/update-account", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      showToast(data.error || "Ошибка сохранения фото");
      return;
    }
    body.dataset.profilePhoto = payload.photo_url;
    syncAvatar();
    showToast("Фото профиля сохранено.");
  }

  async function saveAccount() {
    if (profilePhotoFile.files && profilePhotoFile.files[0]) {
      profilePhotoUrl.value = await fileToDataURL(profilePhotoFile.files[0]);
    }
    const payload = {
      email: accountEmail.value.trim(),
      current_password: currentAccountPassword.value.trim(),
      password: accountPassword.value.trim(),
      photo_url: profilePhotoUrl.value.trim()
    };
    const res = await fetch("/update-account", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      showToast(data.error || "Ошибка");
      return;
    }
    if (payload.email) body.dataset.userEmail = payload.email;
    if (payload.photo_url) body.dataset.profilePhoto = payload.photo_url;
    syncAvatar();
    currentAccountPassword.value = "";
    accountPassword.value = "";
    showToast("Аккаунт и безопасность обновлены.");
  }

  async function saveSettings() {
    localStorage.setItem("voloshin_theme", themeSelect.value);
    applyTheme(themeSelect.value);
    const payload = {
      language: languageSelect.value,
      voice_gender: settingsVoiceGenderSelect ? settingsVoiceGenderSelect.value : (body.dataset.voiceGender || "male")
    };
    const res = await fetch("/save-settings", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      showToast(data.error || "Ошибка");
      return;
    }
    body.dataset.language = payload.language;
    body.dataset.voiceGender = payload.voice_gender;
    updateModeUi();
    showToast("Настройки сохранены.");
    settingsModal.classList.add("hidden");
    document.querySelectorAll(".custom-dropdown-wrap").forEach(syncDropdown);
  }

  async function saveTrain() {
    if (isGuestMode()) {
      trainModal.classList.add("hidden");
      addMessage("assistant", "В гостевом режиме обучение не сохраняется. Для этого лучше войти в аккаунт.", true);
      saveGuestMessages();
      return;
    }
    const q = $("trainQ").value.trim();
    const a = $("trainA").value.trim();
    if (!q || !a) return;
    await fetch("/train-qa", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({q, a})
    });
    $("trainQ").value = "";
    $("trainA").value = "";
    trainModal.classList.add("hidden");
    addMessage("assistant", "Запомнил новую пару вопрос-ответ.", true);
  }

  function openImageModal() {
    imageTokenInput.value = localStorage.getItem("voloshin_hf_token") || "";
    imagePromptInput.value = input.value.trim() || "";
    imageModelInput.value = localStorage.getItem("voloshin_hf_model") || "stabilityai/stable-diffusion-xl-base-1.0";
    imageModal.classList.remove("hidden");
    document.querySelectorAll(".custom-dropdown-wrap").forEach(syncDropdown);
    attachMenu.classList.add("hidden");
  }

  async function generateImage() {
    if (isGuestMode()) {
      imageModal.classList.add("hidden");
      addMessage("assistant", "Генерация картинок в гостевом режиме отключена. Войди в аккаунт и вставь токен Hugging Face.", true);
      saveGuestMessages();
      return;
    }
    const prompt = imagePromptInput.value.trim();
    const token = imageTokenInput.value.trim();
    const model = imageModelInput.value;
    if (!prompt) return;
    if (!token) { showToast("Нужен Hugging Face token."); return; }
    localStorage.setItem("voloshin_hf_token", token);
    localStorage.setItem("voloshin_hf_model", model);
    imageModal.classList.add("hidden");
    addMessage("user", `${t.create_image || "Создать изображение"}: ${prompt}`, false);
    showTyping(true);
    try {
      const res = await fetch("/generate-image", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({prompt, token, model})
      });
      const data = await res.json();
      hideTyping();
      if (!data.ok) {
        addMessage("assistant", data.error || "Не удалось создать изображение.", true);
        return;
      }
      addImageMessage(data.image_url, prompt);
    } catch (_) {
      hideTyping();
      addMessage("assistant", "Ошибка генерации изображения.", true);
    }
  }

  async function registerUser() {
    const res = await fetch("/register", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({email: registerEmail.value.trim(), password: registerPassword.value.trim()})
    });
    const data = await res.json();
    if (!data.ok) { showToast(data.error || "Ошибка"); return; }
    showToast(data.message || "Аккаунт создан.");
    registerModal.classList.add("hidden");
    authModal.classList.remove("hidden");
    authEmail.value = registerEmail.value.trim();
    authPassword.value = registerPassword.value.trim();
    registerPassword.value = "";
  }

  async function loginUser() {
    const res = await fetch("/login", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({email: authEmail.value.trim(), password: authPassword.value.trim()})
    });
    const data = await res.json();
    if (!data.ok) { showToast(data.error || "Ошибка входа"); return; }
    setGuestMode(false);
    sessionStorage.removeItem("voloshin_guest_messages");
    location.reload();
  }

  function startGuestMode() {
    setGuestMode(true);
    welcomeGate.classList.remove("show");
    loadGuestMessages();
    refreshChats();
  }

  async function logoutUser() {
    await fetch("/logout", {method:"POST"});
    setGuestMode(false);
    sessionStorage.removeItem("voloshin_guest_messages");
    location.reload();
  }

  function initEvents() {
    $("brandCollapseBtn").onclick = toggleSidebar;
    mobileSidebarCloseBtn && (mobileSidebarCloseBtn.onclick = closeSidebarMobile);
    voiceInputBtn && (voiceInputBtn.onclick = toggleVoiceRecognition);
    $("openSettingsBtn").onclick = () => { closeSidebarMobile();
      languageSelect.value = body.dataset.language || "ru";
      themeSelect.value = getPreferredTheme();
      if (settingsVoiceGenderSelect) settingsVoiceGenderSelect.value = body.dataset.voiceGender || "male";
      settingsModal.classList.remove("hidden");
      document.querySelectorAll(".custom-dropdown-wrap").forEach(syncDropdown);
    };
    $("openSettingsAIBtn").onclick = () => { closeSidebarMobile();
      const cfg = getConfig();
      modelInput.value = cfg.model;
      apiKeyInput.value = cfg.apiKey;
      aiModal.classList.remove("hidden");
      document.querySelectorAll(".custom-dropdown-wrap").forEach(syncDropdown);
    };
    $("newChatBtn").onclick = () => { closeSidebarMobile(); createNewChat(); };
    $("openProfileBtn").onclick = loadProfileIntoModal;
    $("openAccountModalBtn") && ($("openAccountModalBtn").onclick = () => { profileModal.classList.add("hidden"); accountModal.classList.remove("hidden"); });
    $("openTrainBtn").onclick = () => { closeSidebarMobile(); trainModal.classList.remove("hidden"); };
    $("openImageBtn").onclick = () => { closeSidebarMobile(); openImageModal(); };

    $("closeSettingsBtn").onclick = () => settingsModal.classList.add("hidden");
    $("closeSettingsBtn2").onclick = () => settingsModal.classList.add("hidden");
    $("closeAuthBtn").onclick = () => authModal.classList.add("hidden");
    $("closeRegisterModalBtn").onclick = () => registerModal.classList.add("hidden");
    $("closeAIBtn").onclick = () => aiModal.classList.add("hidden");
    $("closeProfileBtn").onclick = () => profileModal.classList.add("hidden");
    $("closeProfileBtn2").onclick = () => profileModal.classList.add("hidden");
    $("closeAccountModalBtn") && ($("closeAccountModalBtn").onclick = () => accountModal.classList.add("hidden"));
    $("closeAccountModalBtn2") && ($("closeAccountModalBtn2").onclick = () => accountModal.classList.add("hidden"));
    $("closeConfirmLogoutBtn") && ($("closeConfirmLogoutBtn").onclick = () => confirmLogoutModal.classList.add("hidden"));
    $("cancelLogoutBtn") && ($("cancelLogoutBtn").onclick = () => confirmLogoutModal.classList.add("hidden"));
    $("confirmLogoutBtn") && ($("confirmLogoutBtn").onclick = () => { confirmLogoutModal.classList.add("hidden"); logoutUser(); });
    $("closeTrainBtn").onclick = () => trainModal.classList.add("hidden");
    $("closeTrainBtn2").onclick = () => trainModal.classList.add("hidden");
    $("closeImageBtn").onclick = () => imageModal.classList.add("hidden");
    $("closeImageBtn2").onclick = () => imageModal.classList.add("hidden");

    $("saveProfileBtn").onclick = saveProfile;
    $("saveAccountBtn").onclick = saveAccount;
    $("savePhotoBtn").onclick = savePhotoOnly;
    $("logoutFromProfileBtn").onclick = () => { confirmLogoutModal.classList.remove("hidden"); };
    $("saveTrainBtn").onclick = saveTrain;
    $("saveSettingsBtn").onclick = saveSettings;
    $("generateImageBtn").onclick = generateImage;
    $("saveAIBtn").onclick = () => window.saveGroqConfig();
    $("clearAIBtn").onclick = () => window.clearGroqConfig();
    $("loginBtn").onclick = loginUser;
    $("registerOnlyBtn").onclick = registerUser;

    toggleAuthPassword && (toggleAuthPassword.onchange = () => { authPassword.type = toggleAuthPassword.checked ? "text" : "password"; });
    toggleRegisterPassword && (toggleRegisterPassword.onchange = () => { registerPassword.type = toggleRegisterPassword.checked ? "text" : "password"; });
    toggleAccountPassword && (toggleAccountPassword.onchange = () => {
      accountPassword.type = toggleAccountPassword.checked ? "text" : "password";
    });
    $("logoutBtn") && ($("logoutBtn").onclick = logoutUser);
    guestBtn.onclick = startGuestMode;
    toneSelect && (toneSelect.onchange = () => updateModeUi());
    modeSelect && (modeSelect.onchange = () => updateModeUi());
    settingsVoiceGenderSelect && (settingsVoiceGenderSelect.onchange = () => {});
    voiceGenderSelect && (voiceGenderSelect.onchange = () => updateModeUi());
    $("welcomeLoginBtn").onclick = () => { welcomeGate.classList.remove("show"); openLoginModal(); };
    $("welcomeRegisterBtn").onclick = () => { welcomeGate.classList.remove("show"); openRegisterModal(); };
    $("welcomeGuestBtn").onclick = () => { welcomeGate.classList.remove("show"); startGuestMode(); };
    $("openRegisterModalBtn").onclick = () => { authModal.classList.add("hidden"); openRegisterModal(); };
    $("switchToLoginBtn").onclick = () => { registerModal.classList.add("hidden"); openLoginModal(); };

    [settingsModal, authModal, registerModal, aiModal, profileModal, accountModal, confirmLogoutModal, trainModal, imageModal].forEach(m => m && closeModalOnBackdrop(m));

    attachBtn.onclick = (e) => {
      e.stopPropagation();
      attachMenu.classList.toggle("hidden");
    };
    document.addEventListener("click", (e) => {
      if (!attachBtn.contains(e.target) && !attachMenu.contains(e.target)) attachMenu.classList.add("hidden");
    });

    document.addEventListener("pointerdown", (e) => {
      if (window.innerWidth > 980) return;
      if (!sidebar.classList.contains("open")) return;
      const brandBtn = $("brandCollapseBtn");
      const insideSidebar = sidebar.contains(e.target);
      const onToggle = brandBtn && brandBtn.contains(e.target);
      if (!insideSidebar && !onToggle) closeSidebarMobile();
    });

    photoInput.onchange = () => uploadFile(photoInput.files[0]);
    profilePhotoFile && (profilePhotoFile.onchange = () => { if (profilePhotoName) profilePhotoName.textContent = profilePhotoFile.files?.[0]?.name || "Файл не выбран"; });
    cameraInput && (cameraInput.onchange = () => uploadFile(cameraInput.files[0]));
    fileInput.onchange = () => uploadFile(fileInput.files[0]);

    messages.addEventListener("click", async (e) => {
      const copyBtn = e.target.closest(".copy-btn");
      const speakBtn = e.target.closest(".speak-btn");
      const feedbackBtn = e.target.closest(".like-btn, .dislike-btn");
      if (copyBtn) {
        const text = copyBtn.dataset.copy || "";
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = t.copied || "Скопировано";
          setTimeout(() => copyBtn.textContent = t.copy || "Копировать", 1200);
        } catch (_) {}
      }
      if (speakBtn) {
        const text = speakBtn.dataset.speak || "";
        speakText(text, speakBtn);
      }
      if (feedbackBtn && !isGuestMode()) {
        const value = feedbackBtn.dataset.feedback;
        const text = feedbackBtn.dataset.text || "";
        document.querySelectorAll(`.tool-btn[data-text="${CSS.escape(text)}"]`).forEach(btn => btn.classList.remove("active"));
        feedbackBtn.classList.add("active");
        fetch("/feedback", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({message: text, value})
        }).catch(() => {});
      }
    });
  }

  window.saveGroqConfig = function() {
    localStorage.setItem("voloshin_groq_api_key", apiKeyInput.value.trim());
    localStorage.setItem("voloshin_groq_model", modelInput.value.trim() || "llama-3.3-70b-versatile");
    aiModal.classList.add("hidden");
    applyStatus();
  };
  window.clearGroqConfig = function() {
    localStorage.removeItem("voloshin_groq_api_key");
    localStorage.removeItem("voloshin_groq_model");
    aiModal.classList.add("hidden");
    applyStatus();
  };
  window.handleKey = handleKey;
  window.sendMessage = sendMessage;
  window.switchChat = switchChat;
  window.deleteChat = deleteChat;

  window.addEventListener("pointerdown", () => {
    try { window.speechSynthesis && window.speechSynthesis.getVoices(); } catch (_) {}
  }, { once: true });

  translatePage();
  applyTheme(getPreferredTheme());

  const themeMedia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  if (themeMedia) {
    const handleThemeMediaChange = () => {
      const preferred = getPreferredTheme();
      if (preferred === "system") applyTheme("system");
    };
    if (themeMedia.addEventListener) themeMedia.addEventListener("change", handleThemeMediaChange);
    else if (themeMedia.addListener) themeMedia.addListener(handleThemeMediaChange);
  }
  initEvents();
  applyMobileViewportFix();
  initDropdowns();
  initAutoScroll();
  applyStatus();
  syncAuthModal();
  syncAvatar();
  if (isGuestMode()) {
    loadGuestMessages();
    refreshChats();
  }
  syncWelcomeGate();
  scrollToBottom(true);
  setCollapseArrow();
  window.addEventListener("resize", setCollapseArrow);
});
