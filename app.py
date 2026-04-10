
from __future__ import annotations
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import os, io, re, random, difflib, base64, requests, sqlite3

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None
try:
    from docx import Document
except Exception:
    Document = None

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "voloshin-auth-sync-fixed")
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024

DB_PATH = "voloshin.db"
UPLOAD_DIR = "uploads"
SERVER_GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
SERVER_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
GROQ_SMART_MODEL = os.getenv("GROQ_SMART_MODEL", "groq/compound-mini").strip()
GROQ_FAST_MODEL = os.getenv("GROQ_FAST_MODEL", "llama-3.1-8b-instant").strip()

TRANSLATIONS = {
    "ru": {
        "subtitle": "Стеклянный интерфейс + голосовой ввод + быстрый чат",
        "private_chat": "Приватный AI-чат",
        "connect_ai": "Подключить AI",
        "new_chat": "Новый чат",
        "profile": "Профиль",
        "train": "Обучить",
        "images": "Картинки",
        "chat_history": "История чатов",
        "local_mode": "Локальный режим",
        "no_key": "Без подключённого ключа",
        "banner_title": "AI пока не подключён",
        "banner_sub": "Локальная логика уже работает. С Groq ответы будут ещё живее и умнее.",
        "photo": "Фотография",
        "file": "Файл",
        "create_image": "Создать изображение",
        "placeholder": "Напиши сообщение...",
        "settings": "Настройки",
        "language": "Язык интерфейса",
        "russian": "Русский",
        "english": "English",
        "save": "Сохранить",
        "close": "Закрыть",
        "auth_title": "Аккаунт",
        "email": "Почта",
        "password": "Пароль",
        "login": "Войти",
        "register": "Зарегистрироваться",
        "logout": "Выйти",
        "logged_as": "Вы вошли как",
        "profile_title": "Профиль и режимы",
        "name": "Как тебя называть",
        "about": "Что AI должен помнить о тебе",
        "style": "Стиль общения",
        "mode": "Режим",
        "normal": "Нормальный",
        "rude": "Пожёстче",
        "polite": "Вежливый",
        "teacher": "Рассуждающий",
        "coder": "Кодер",
        "brief": "Коротко",
        "save_profile": "Сохранить профиль",
        "train_title": "Обучить AI",
        "question": "Вопрос или триггер",
        "answer": "Что отвечать",
        "save_train": "Сохранить в обучение",
        "image_title": "Создать изображение",
        "image_prompt": "Описание изображения",
        "hf_token": "Hugging Face token",
        "get_hf": "Получить Hugging Face token",
        "model": "Модель",
        "create_image_btn": "Создать изображение",
        "copy": "Копировать",
        "copied": "Скопировано",
        "thinking": "Думаю",
        "register_ok": "Аккаунт создан. Теперь можно войти.",
        "login_ok": "Вход выполнен.",
        "logout_ok": "Вы вышли из аккаунта.",
        "auth_required": "Сначала войди в аккаунт."
    },
    "en": {
        "subtitle": "Glass interface + account + sync",
        "private_chat": "Private AI chat",
        "connect_ai": "Connect AI",
        "new_chat": "New chat",
        "profile": "Profile",
        "train": "Train",
        "images": "Images",
        "chat_history": "Chat history",
        "local_mode": "Local mode",
        "no_key": "No key connected",
        "banner_title": "AI is not connected yet",
        "banner_sub": "Local logic already works. With Groq, answers will be smarter.",
        "photo": "Photo",
        "file": "File",
        "create_image": "Create image",
        "placeholder": "Type a message...",
        "settings": "Settings",
        "language": "Interface language",
        "russian": "Russian",
        "english": "English",
        "save": "Save",
        "close": "Close",
        "auth_title": "Account",
        "email": "Email",
        "password": "Password",
        "login": "Log in",
        "register": "Register",
        "logout": "Log out",
        "logged_as": "Logged in as",
        "profile_title": "Profile and modes",
        "name": "How to call you",
        "about": "What to remember",
        "style": "Tone",
        "mode": "Mode",
        "normal": "Normal",
        "rude": "Sharper",
        "polite": "Polite",
        "teacher": "Teacher",
        "coder": "Coder",
        "brief": "Brief",
        "save_profile": "Save profile",
        "train_title": "Train AI",
        "question": "Question",
        "answer": "Answer",
        "save_train": "Save training",
        "image_title": "Create image",
        "image_prompt": "Image prompt",
        "hf_token": "Hugging Face token",
        "get_hf": "Get Hugging Face token",
        "model": "Model",
        "create_image_btn": "Create image",
        "copy": "Copy",
        "copied": "Copied",
        "thinking": "Thinking",
        "register_ok": "Account created. You can log in now.",
        "login_ok": "Logged in.",
        "logout_ok": "Logged out.",
        "auth_required": "Please log in first."
    }
}

ALLOWED_EXTS = {".txt", ".md", ".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp", ".gif"}

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT '',
      about TEXT DEFAULT '',
      tone TEXT DEFAULT 'normal',
      mode TEXT DEFAULT 'normal',
      language TEXT DEFAULT 'ru',
      voice_gender TEXT DEFAULT 'male'
    );
    CREATE TABLE IF NOT EXISTS chats(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT DEFAULT 'Новый чат'
    );
    CREATE TABLE IF NOT EXISTS messages(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learned_qa(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      q TEXT NOT NULL,
      a TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feedback(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      message TEXT,
      value TEXT
    );
    """)
    conn.commit()
    try:
        conn.execute("ALTER TABLE users ADD COLUMN photo_url TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE users ADD COLUMN voice_gender TEXT DEFAULT 'male'")
        conn.commit()
    except Exception:
        pass
    conn.close()

def uid():
    return session.get("user_id")

def current_user():
    if not uid():
        return None
    conn = db()
    row = conn.execute("SELECT * FROM users WHERE id=?", (uid(),)).fetchone()
    conn.close()
    return row

def tr(key: str):
    lang = current_user()["language"] if current_user() else "ru"
    return TRANSLATIONS.get(lang, TRANSLATIONS["ru"]).get(key, key)

def ensure_default_chat(user_id: int):
    conn = db()
    row = conn.execute("SELECT id FROM chats WHERE user_id=? ORDER BY id LIMIT 1", (user_id,)).fetchone()
    if not row:
        cur = conn.cursor()
        cur.execute("INSERT INTO chats(user_id, title) VALUES(?,?)", (user_id, "Новый чат"))
        chat_id = cur.lastrowid
        conn.execute("INSERT INTO messages(chat_id, role, text) VALUES(?,?,?)", (chat_id, "assistant", "Привет. Я Voloshin AI. Чем займёмся?"))
        conn.commit()
        row = {"id": chat_id}
    conn.close()
    return row["id"]

def active_chat_id():
    if not uid():
        return None
    key = f"active_chat_{uid()}"
    default_id = ensure_default_chat(uid())
    cid = session.get(key, default_id)
    conn = db()
    ok = conn.execute("SELECT id FROM chats WHERE id=? AND user_id=?", (cid, uid())).fetchone()
    conn.close()
    if not ok:
        cid = default_id
        session[key] = cid
    return cid

def set_active_chat(cid: int):
    if uid():
        session[f"active_chat_{uid()}"] = cid

def get_profile():
    user = current_user()
    if not user:
        return {"name":"","about":"","tone":"normal","mode":"normal","language":"ru","email":""}
    photo = ""
    try:
        photo = user["photo_url"] or ""
    except Exception:
        pass
    return {"name":user["name"] or "", "about":user["about"] or "", "tone":user["tone"] or "normal", "mode":user["mode"] or "normal", "language":user["language"] or "ru", "email":user["email"] or "", "photo_url": photo, "voice_gender": (user["voice_gender"] or "male")}

def chat_list():
    if not uid():
        return []
    conn = db()
    rows = conn.execute("SELECT id, title FROM chats WHERE user_id=? ORDER BY id DESC", (uid(),)).fetchall()
    conn.close()
    return rows

def chat_messages(chat_id: int):
    conn = db()
    rows = conn.execute("SELECT role, text FROM messages WHERE chat_id=? ORDER BY id", (chat_id,)).fetchall()
    conn.close()
    return rows

def add_message(chat_id: int, role: str, text: str):
    conn = db()
    conn.execute("INSERT INTO messages(chat_id, role, text) VALUES(?,?,?)", (chat_id, role, text))
    if role == "user":
        title = conn.execute("SELECT title FROM chats WHERE id=?", (chat_id,)).fetchone()["title"]
        if title == "Новый чат":
            conn.execute("UPDATE chats SET title=? WHERE id=?", ((text[:28] if text else "Новый чат"), chat_id))
    conn.commit()
    conn.close()

def normalize(text: str) -> str:
    text = text.lower().replace("ё", "е")
    for b in ["ебать","блять","бля","нахуй","сука","пиздец","хуй","хуя","хуйн","ебан","заеб"]:
        text = text.replace(b, " ")
    for k, v in {"ког":"как","чо":"что","че":"что","превет":"привет","приве":"привет"}.items():
        text = text.replace(k, v)
    text = re.sub(r"[^a-zA-Zа-яА-Я0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def similar(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()

BUILTIN_QA = [
    {"q":"привет","a":"Привет. Чем займёмся?"},
    {"q":"как дела","a":"Нормально, в рабочем режиме. Чем помочь?"},
    {"q":"какого цвета небо","a":"Небо обычно кажется голубым из-за рассеивания солнечного света в атмосфере."},
    {"q":"из чего состоит машина","a":"Машина обычно состоит из двигателя, кузова, трансмиссии, подвески, тормозов, рулевого управления, электроники, салона и колёс."},
    {"q":"кто ты","a":"Я Voloshin AI — помощник для вопросов, идей, объяснений и работы с текстами."},
    {"q":"что ты умеешь","a":"Я могу отвечать на вопросы, объяснять темы, помогать с текстами, идеями, кодом и обученными ответами."},
    {"q":"что ты помнишь","a":"Я могу помнить то, что указано в профиле пользователя, и учитывать это в ответах."},
    {"q":"кто тебя создал","a":"Меня создал разработчик Волошин Н.А."},
]

def retrieve_local_answer(question: str):
    conn = db()
    learned = conn.execute("SELECT q, a FROM learned_qa WHERE user_id=? ORDER BY id DESC LIMIT 500", (uid(),)).fetchall() if uid() else []
    conn.close()
    items = BUILTIN_QA + [{"q": r["q"], "a": r["a"]} for r in learned]

    nq = normalize(question)
    q_tokens = set(nq.split())
    best, score = None, 0.0

    for item in items:
        iq = normalize(item["q"])
        i_tokens = set(iq.split())
        seq = difflib.SequenceMatcher(None, nq, iq).ratio()
        overlap = (len(q_tokens & i_tokens) / max(1, len(q_tokens | i_tokens))) if (q_tokens or i_tokens) else 0.0
        contains = 1.0 if (nq and iq and (nq in iq or iq in nq)) else 0.0
        s = max(seq, (seq * 0.58 + overlap * 0.28 + contains * 0.14))
        if s > score:
            best, score = item, s

    return (best["a"], score) if best else (None, 0.0)


def profile_memory_answers(profile: dict, question: str):
    q = normalize(question)
    name = (profile.get("name") or "").strip()
    about = (profile.get("about") or "").strip()

    if ("кто тебя создал" in q or "кто твой создатель" in q or "кто тебя сделал" in q or "кто разработчик" in q):
        return "Меня создал разработчик Волошин Н.А."

    if ("как меня зовут" in q or "кто я" in q or "мое имя" in q or "моё имя" in q) and name:
        return f"Тебя зовут {name}."

    if ("сколько мне лет" in q or "мой возраст" in q or "сколько лет мне" in q) and about:
        m = re.search(r"(\d{1,2})\s*лет", about.lower())
        if m:
            return f"Судя по твоим заметкам, тебе {m.group(1)} лет."

    if ("что ты помнишь" in q or "что ai должен помнить" in q or "что ты знаешь обо мне" in q):
        parts = []
        if name:
            parts.append(f"тебя зовут {name}")
        if about:
            parts.append(about)
        if parts:
            return "Я помню, что " + ". ".join(parts).strip() + "."

    if about:
        liked = re.search(r"(люблю|нравится)\s+([а-яa-z0-9\- ]{3,40})", about.lower())
        if liked and ("что я люблю" in q or "что мне нравится" in q):
            return "Судя по заметкам, тебе нравится " + liked.group(2).strip() + "."

    return None


def style_reply_text(text: str, profile: dict):
    tone = profile.get("tone", "normal")
    mode = profile.get("mode", "normal")
    result = (text or "").strip()

    if not result:
        return "Сформулируй вопрос чуть точнее, и я нормально разложу."

    rude_prefixes = [
        "Не, ну смотри.",
        "Короче, смотри.",
        "Ладно, по фактам.",
        "Окей, давай по делу."
    ]
    rude_prefixes_hard = [
        "Не, ну смотри, блядь.",
        "Короче, сейчас по фактам, блядь.",
        "Ладно, давай без хуйни, по делу."
    ]
    polite_prefixes = [
        "Конечно.",
        "Давай разберём спокойно.",
        "Хорошо.",
        "Разумеется."
    ]

    low = result.lower()

    if tone == "polite":
        if not any(low.startswith(p.lower()) for p in polite_prefixes):
            result = random.choice(polite_prefixes) + " " + result
        if not result.endswith(("!", ".", "?", "…")):
            result += "."
    elif tone == "rude":
        if mode == "brief":
            if not any(low.startswith(p.lower()) for p in ["не, ну", "короче", "ладно", "окей"]):
                result = random.choice(rude_prefixes) + " " + result
        else:
            if "бляд" not in low and "нахуй" not in low and "пизд" not in low:
                result = random.choice(rude_prefixes_hard) + " " + result

    if mode == "brief":
        first = re.split(r"(?<=[.!?])\s+", result)[0].strip()
        result = first if first else result
        if len(result) > 190:
            result = result[:187].rstrip() + "..."
        if not result.endswith((".", "!", "?")):
            result += "."
    elif mode == "teacher":
        if "например" not in result.lower() and "по шагам" not in result.lower():
            result += " Если хочешь, могу разложить ещё по шагам и на простом примере."
    elif mode == "coder":
        if not any(x in result.lower() for x in ["код", "пример", "алгоритм", "структур"]):
            result += " Если нужно, могу сразу показать пример кода, алгоритм или структуру решения."

    result = result.replace("Смотри. Смотри.", "Смотри.")
    result = result.replace("Не, ну смотри. Не, ну смотри.", "Не, ну смотри.")
    return result


def model_history(chat_id: int, limit: int = 14):
    rows = chat_messages(chat_id)[-limit:]
    return [{"role":"assistant" if r["role"]=="assistant" else "user", "content":r["text"]} for r in rows]

def choose_groq_model(user_text: str, profile: dict, history: list) -> str:
    text = (user_text or "").lower().strip()
    mode = (profile.get("mode") or "normal").strip()

    hard_markers = [
        "почему", "объясни", "разбери", "сравни", "проанализируй",
        "подробно", "по шагам", "рассуж", "код", "python", "javascript",
        "ошибка", "алгоритм", "архитектур", "докажи", "формула", "матем",
        "статист", "вероятност", "оптимизац", "линейное программирование"
    ]
    current_info_markers = [
        "сейчас", "на сегодня", "последние", "новости", "курс", "цена",
        "актуаль", "кто сейчас", "что сейчас", "свеж", "сегодня"
    ]
    quick_markers = [
        "привет", "как дела", "спасибо", "ок", "окей", "понял",
        "кто ты", "как меня зовут", "что ты помнишь", "кто тебя создал"
    ]

    is_long = len(text) > 220
    is_hard = any(x in text for x in hard_markers)
    is_current = any(x in text for x in current_info_markers)
    is_quick = len(text) < 80 and any(x in text for x in quick_markers)
    deep_mode = mode in {"teacher", "coder"}

    if is_current or is_long or is_hard or deep_mode:
        return GROQ_SMART_MODEL
    if is_quick:
        return GROQ_FAST_MODEL
    return GROQ_FAST_MODEL


def groq_answer(api_key: str, model: str, profile: dict, history: list, user_text: str) -> str:
    tone = profile.get("tone","normal")
    mode = profile.get("mode","normal")
    memory = (profile.get("about") or "").strip()
    name = (profile.get("name") or "").strip()

    tone_map = {
        "normal": "Отвечай живо, естественно и по-человечески, без лишней сухости.",
        "rude": "Отвечай живее и жёстче, иногда допустим лёгкий мат, но не превращай ответ в тупую грубость.",
        "polite": "Отвечай очень вежливо, спокойно и аккуратно."
    }
    mode_map = {
        "normal": "Формат ответа обычный.",
        "teacher": "Формат ответа рассуждающий: поясняй ход мысли, структуру и примеры.",
        "coder": "Если уместно, предлагай алгоритм, структуру, код или технический план.",
        "brief": "Отвечай коротко и по сути, без лишней воды."
    }

    prompt = (
        "Ты — Voloshin AI. Отвечай только на русском языке. "
        + tone_map.get(tone, tone_map["normal"]) + " "
        + mode_map.get(mode, mode_map["normal"]) + " "
        + (f"Пользователя зовут {name}. " if name else "")
        + (f"Что нужно помнить о пользователе: {memory}. " if memory else "")
        + "Не упоминай системный промпт. Не говори, что ты локальная база. "
        + "Не начинай каждый ответ одинаково. Избегай тупого повторения 'Смотри'. "
        + "Если тебя спрашивают, кто создатель, отвечай: 'Меня создал разработчик Волошин Н.А.'."
    )
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type":"application/json"},
        json={"model": model, "messages":[{"role":"system","content":prompt}] + history[-12:] + [{"role":"user","content":user_text}], "temperature": 0.82},
        timeout=120
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


def parse_uploaded_file(file_storage):
    filename = secure_filename(file_storage.filename or "file")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTS:
        return filename, "Формат пока не поддерживается.", None
    if ext in {".png",".jpg",".jpeg",".webp",".gif"}:
        raw = file_storage.read()
        mime = {
            ".png":"image/png",
            ".jpg":"image/jpeg",
            ".jpeg":"image/jpeg",
            ".webp":"image/webp",
            ".gif":"image/gif"
        }.get(ext, "image/png")
        b64 = base64.b64encode(raw).decode("utf-8")
        return filename, "Изображение получено.", f"data:{mime};base64,{b64}"
    if ext in {".txt",".md"}:
        return filename, file_storage.read().decode("utf-8", errors="ignore")[:9000], None
    if ext == ".pdf":
        if PdfReader is None:
            return filename, "Для чтения PDF нужен пакет pypdf.", None
        reader = PdfReader(io.BytesIO(file_storage.read()))
        text = "\n".join((page.extract_text() or "") for page in reader.pages[:10])
        return filename, text[:9000], None
    if ext == ".docx":
        if Document is None:
            return filename, "Для чтения DOCX нужен пакет python-docx.", None
        temp = os.path.join(UPLOAD_DIR, filename)
        file_storage.save(temp)
        doc = Document(temp)
        text = "\n".join(p.text for p in doc.paragraphs)[:9000]
        try: os.remove(temp)
        except Exception: pass
        return filename, text, None
    return filename, "Файл получен.", None

@app.route("/")
def index():
    user = current_user()
    chats = chat_list() if user else []
    cid = active_chat_id() if user else None
    messages = chat_messages(cid) if cid else []
    profile = get_profile()
    return render_template(
        "index.html",
        chats=chats,
        current_chat_id=cid,
        messages=messages,
        server_key_enabled=bool(SERVER_GROQ_API_KEY),
        server_model=SERVER_GROQ_MODEL,
        profile=profile,
        translations=TRANSLATIONS[profile["language"]],
        logged_in=bool(user),
        user_email=(user["email"] if user else "")
    )

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email","")).strip().lower()
    password = str(data.get("password","")).strip()
    if not email or not password:
        return jsonify({"ok": False, "error": "Заполни почту и пароль."}), 400
    conn = db()
    try:
        conn.execute("INSERT INTO users(email,password_hash) VALUES(?,?)", (email, generate_password_hash(password)))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"ok": False, "error": "Такая почта уже зарегистрирована."}), 400
    conn.close()
    return jsonify({"ok": True, "message": tr("register_ok")})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email","")).strip().lower()
    password = str(data.get("password","")).strip()
    conn = db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"ok": False, "error": "Неверная почта или пароль."}), 400
    session["user_id"] = user["id"]
    ensure_default_chat(user["id"])
    return jsonify({"ok": True, "message": tr("login_ok")})

@app.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"ok": True, "message": tr("logout_ok")})

@app.route("/save-settings", methods=["POST"])
def save_settings():
    if not uid():
        return jsonify({"ok": False, "error": tr("auth_required")}), 401
    language = str((request.get_json(silent=True) or {}).get("language","ru")).strip() or "ru"
    conn = db()
    conn.execute("UPDATE users SET language=? WHERE id=?", (language, uid()))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/chat", methods=["POST"])
def chat():
    if not uid():
        return jsonify({"response": tr("auth_required")}), 401
    cid = active_chat_id()
    profile = get_profile()
    data = request.get_json(silent=True) or {}
    message = str(data.get("message","")).strip()
    browser_key = str(data.get("apiKey","")).strip()
    browser_model = str(data.get("model","")).strip()
    if not message:
        return jsonify({"response":"Напиши сообщение."}), 400
    prev_user = [m["text"] for m in chat_messages(cid) if m["role"] == "user"]
    repeated = bool(prev_user and similar(message, prev_user[-1]) > 0.84)
    add_message(cid, "user", message)

    api_key = SERVER_GROQ_API_KEY or browser_key
    model = browser_model or SERVER_GROQ_MODEL or "llama-3.3-70b-versatile"

    try:
        memory_hit = profile_memory_answers(profile, message)
        if memory_hit:
            reply = memory_hit
            mode = "memory"
        elif api_key:
            selected_model = choose_groq_model(message, profile, model_history(cid))
            reply = groq_answer(api_key, selected_model, profile, model_history(cid), message)
            mode = "online-smart" if selected_model == GROQ_SMART_MODEL else "online-fast"
        else:
            local_answer, score = retrieve_local_answer(message)
            if local_answer and score >= 0.62:
                if repeated:
                    reply = "Я уже отвечал на это, но могу сказать по-другому. " + local_answer
                else:
                    reply = local_answer
            else:
                mode_hint = profile.get("mode", "normal")
                fallback_pool = {
                    "teacher": [
                        "Вопрос нормальный. Могу разобрать это по шагам, с логикой и примером.",
                        "Давай разложу тему спокойно и последовательно, если уточнишь, что именно важно."
                    ],
                    "coder": [
                        "Могу ответить по сути или сразу дать пример кода — скажи, что удобнее.",
                        "Если это задача, могу сразу предложить структуру решения или код."
                    ],
                    "brief": [
                        "Уточни вопрос чуть точнее, и я отвечу коротко и по сути.",
                        "Сформулируй точнее, и я дам короткий ответ без воды."
                    ],
                    "normal": [
                        "Интересный вопрос. Давай сузим тему, и я разложу её по полочкам.",
                        "Могу объяснить это проще или глубже — скажи, какой формат тебе удобнее.",
                        "Нормальный вопрос. Уточни, что именно тебе важно: суть, пример или разбор по шагам?"
                    ]
                }
                reply = random.choice(fallback_pool.get(mode_hint, fallback_pool["normal"]))
            mode = "local"
        reply = style_reply_text(reply, profile)
    except Exception as e:
        reply = f"Ошибка: {str(e)}"
        mode = "error"

    add_message(cid, "assistant", reply)
    return jsonify({"response": reply, "mode": mode})

@app.route("/upload-file", methods=["POST"])
def upload_file():
    if not uid():
        return jsonify({"ok": False, "error": tr("auth_required")}), 401
    file_storage = request.files.get("file")
    if not file_storage:
        return jsonify({"ok": False, "error": "Файл не найден"}), 400
    cid = active_chat_id()
    filename, extracted, image_url = parse_uploaded_file(file_storage)
    if image_url:
        add_message(cid, "user", f"[Изображение: {filename}]")
        add_message(cid, "assistant", f"Изображение «{filename}» получил. Могу сохранить его в чат и помочь с описанием, но для полноценного распознавания текста и деталей нужна отдельная vision-модель.")
        return jsonify({"ok": True, "filename": filename, "image_url": image_url, "text": ""})
    add_message(cid, "user", f"[Файл: {filename}]")
    add_message(cid, "assistant", f"Файл «{filename}» получил. Можешь спросить, что с ним сделать.")
    return jsonify({"ok": True, "filename": filename, "text": extracted[:4000], "image_url": None})


@app.route("/update-account", methods=["POST"])
def update_account():
    if not uid():
        return jsonify({"ok": False, "error": tr("auth_required")}), 401
    data = request.get_json(silent=True) or {}
    new_email = str(data.get("email","")).strip().lower()
    current_password = str(data.get("current_password","")).strip()
    new_password = str(data.get("password","")).strip()
    photo_url = str(data.get("photo_url","")).strip()

    conn = db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (uid(),)).fetchone()
    if not user:
        conn.close()
        return jsonify({"ok": False, "error": "Пользователь не найден."}), 404

    if new_email:
        existing = conn.execute("SELECT id FROM users WHERE email=? AND id<>?", (new_email, uid())).fetchone()
        if existing:
            conn.close()
            return jsonify({"ok": False, "error": "Такая почта уже занята."}), 400
        conn.execute("UPDATE users SET email=? WHERE id=?", (new_email, uid()))
    if new_password:
        if not current_password:
            conn.close()
            return jsonify({"ok": False, "error": "Чтобы поменять пароль, сначала введи текущий пароль."}), 400
        if not check_password_hash(user["password_hash"], current_password):
            conn.close()
            return jsonify({"ok": False, "error": "Текущий пароль введён неверно."}), 400
        conn.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(new_password), uid()))
    if photo_url:
        try:
            conn.execute("UPDATE users SET photo_url=? WHERE id=?", (photo_url, uid()))
        except Exception:
            pass
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/request-password-reset", methods=["POST"])
def request_password_reset():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email","")).strip().lower()
    if not email:
        return jsonify({"ok": False, "error": "Укажи почту."}), 400
    return jsonify({"ok": True, "message": "В этой версии только подготовлен интерфейс восстановления. Реальную отправку кода на почту можно подключить следующим шагом."})

@app.route("/save-profile", methods=["POST"])
def save_profile():
    if not uid():
        return jsonify({"ok": False}), 401
    data = request.get_json(silent=True) or {}
    conn = db()
    conn.execute("UPDATE users SET name=?, about=?, tone=?, mode=?, photo_url=COALESCE(?, photo_url), voice_gender=? WHERE id=?",
                 (str(data.get("name","")).strip(), str(data.get("about","")).strip(),
                  str(data.get("tone","normal")).strip() or "normal",
                  str(data.get("mode","normal")).strip() or "normal", str(data.get("photo_url","")).strip() or None, str(data.get("voice_gender","male")).strip() or "male", uid()))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/train-qa", methods=["POST"])
def train_qa():
    if not uid():
        return jsonify({"ok": False}), 401
    data = request.get_json(silent=True) or {}
    q = str(data.get("q","")).strip()
    a = str(data.get("a","")).strip()
    if not q or not a:
        return jsonify({"ok": False}), 400
    conn = db()
    conn.execute("INSERT INTO learned_qa(user_id,q,a) VALUES(?,?,?)", (uid(), q, a))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/feedback", methods=["POST"])
def feedback():
    data = request.get_json(silent=True) or {}
    conn = db()
    conn.execute("INSERT INTO feedback(user_id, message, value) VALUES(?,?,?)", (uid(), str(data.get("message","")), str(data.get("value",""))))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/generate-image", methods=["POST"])
def generate_image():
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt","")).strip()
    token = str(data.get("token","")).strip()
    model_id = str(data.get("model","stabilityai/stable-diffusion-xl-base-1.0")).strip() or "stabilityai/stable-diffusion-xl-base-1.0"
    if not prompt:
        return jsonify({"ok": False, "error": "Нужен промпт."}), 400
    if not token:
        return jsonify({"ok": False, "error": "Нужен Hugging Face token."}), 400
    try:
        response = requests.post(
            f"https://router.huggingface.co/hf-inference/models/{model_id}",
            headers={"Authorization": f"Bearer {token}", "Accept":"image/png", "Content-Type":"application/json"},
            json={"inputs": prompt},
            timeout=240
        )
        if response.status_code >= 400:
            return jsonify({"ok": False, "error": response.text[:1000]}), 500
        content_type = response.headers.get("content-type","")
        if "image" not in content_type:
            return jsonify({"ok": False, "error": response.text[:1000] or "Сервис не вернул изображение."}), 500
        b64 = base64.b64encode(response.content).decode("utf-8")
        mime = content_type.split(";")[0] or "image/png"
        return jsonify({"ok": True, "image_url": f"data:{mime};base64,{b64}"})
    except Exception as e:
        return jsonify({"ok": False, "error": f"Ошибка генерации изображения: {str(e)}"}), 500

@app.route("/new-chat", methods=["POST"])
def new_chat():
    if not uid():
        return jsonify({"ok": False}), 401
    conn = db()
    cur = conn.cursor()
    cur.execute("INSERT INTO chats(user_id,title) VALUES(?,?)", (uid(), "Новый чат"))
    cid = cur.lastrowid
    conn.execute("INSERT INTO messages(chat_id, role, text) VALUES(?,?,?)", (cid, "assistant", "Новый чат создан. Можешь писать."))
    conn.commit()
    conn.close()
    set_active_chat(cid)
    return jsonify({"ok": True, "chat_id": cid})

@app.route("/delete-chat", methods=["POST"])
def delete_chat():
    if not uid():
        return jsonify({"ok": False}), 401
    cid = int((request.get_json(silent=True) or {}).get("chat_id", 0))
    conn = db()
    count = conn.execute("SELECT COUNT(*) c FROM chats WHERE user_id=?", (uid(),)).fetchone()["c"]
    row = conn.execute("SELECT id FROM chats WHERE id=? AND user_id=?", (cid, uid())).fetchone()
    if not row:
        conn.close()
        return jsonify({"ok": False}), 404
    if count <= 1:
        conn.execute("DELETE FROM messages WHERE chat_id=?", (cid,))
        conn.execute("UPDATE chats SET title='Новый чат' WHERE id=?", (cid,))
        conn.execute("INSERT INTO messages(chat_id, role, text) VALUES(?,?,?)", (cid, "assistant", "Чат очищен. Это был последний чат, поэтому он не удалён полностью."))
        conn.commit()
        set_active_chat(cid)
    else:
        conn.execute("DELETE FROM messages WHERE chat_id=?", (cid,))
        conn.execute("DELETE FROM chats WHERE id=?", (cid,))
        conn.commit()
        new_active = conn.execute("SELECT id FROM chats WHERE user_id=? ORDER BY id DESC LIMIT 1", (uid(),)).fetchone()["id"]
        set_active_chat(new_active)
    conn.close()
    return jsonify({"ok": True})

@app.route("/switch-chat", methods=["POST"])
def switch_chat():
    if not uid():
        return jsonify({"ok": False}), 401
    cid = int((request.get_json(silent=True) or {}).get("chat_id", 0))
    conn = db()
    row = conn.execute("SELECT id FROM chats WHERE id=? AND user_id=?", (cid, uid())).fetchone()
    conn.close()
    if not row:
        return jsonify({"ok": False}), 404
    set_active_chat(cid)
    msgs = chat_messages(cid)
    return jsonify({"ok": True, "messages": [{"role":m["role"], "text":m["text"]} for m in msgs]})

@app.route("/chats", methods=["GET"])
def chats():
    if not uid():
        return jsonify({"current_chat_id": None, "items": []})
    return jsonify({"current_chat_id": active_chat_id(), "items": [{"id":r["id"], "title":r["title"]} for r in chat_list()]})

init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
