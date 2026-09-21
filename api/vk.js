const API_VERSION = process.env.VK_API_VERSION || "5.199";

const cfg = {
  token: process.env.VK_TOKEN,
  confirmation: process.env.VK_CONFIRMATION_CODE,
  secret: process.env.VK_SECRET || "",
  project: process.env.PROJECT_NAME || "BLESK RUSSIA",
  serverIp: process.env.SERVER_IP || "не указан",
  serverStatus: process.env.SERVER_STATUS || "Онлайн",
  adminPeerId: process.env.VK_ADMIN_PEER_ID || "",
  rulesUrl: process.env.RULES_URL || "",
  applicationUrl: process.env.APPLICATION_URL || "",
};

function keyboard() {
  return JSON.stringify({
    one_time: false,
    inline: false,
    buttons: [
      [
        { action: { type: "text", label: "🎮 Сервер", payload: "{\"cmd\":\"server\"}" }, color: "primary" },
        { action: { type: "text", label: "📜 Правила", payload: "{\"cmd\":\"rules\"}" }, color: "secondary" }
      ],
      [
        { action: { type: "text", label: "👮 Администрация", payload: "{\"cmd\":\"admins\"}" }, color: "secondary" },
        { action: { type: "text", label: "📝 Жалоба", payload: "{\"cmd\":\"report\"}" }, color: "negative" }
      ],
      [
        { action: { type: "text", label: "📋 Заявка", payload: "{\"cmd\":\"application\"}" }, color: "positive" },
        { action: { type: "text", label: "ℹ️ Помощь", payload: "{\"cmd\":\"help\"}" }, color: "secondary" }
      ]
    ]
  });
}

async function vk(method, params) {
  if (!cfg.token) throw new Error("VK_TOKEN is not configured");

  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    access_token: cfg.token,
    v: API_VERSION,
  });

  const response = await fetch(`https://api.vk.com/method/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`VK API ${data.error.error_code}: ${data.error.error_msg}`);
  }
  return data.response;
}

async function send(peerId, message, withKeyboard = true) {
  const params = {
    peer_id: peerId,
    random_id: Math.floor(Math.random() * 2147483647),
    message,
  };

  if (withKeyboard) params.keyboard = keyboard();
  return vk("messages.send", params);
}

function normalize(text = "") {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function helpText() {
  return [
    `🤖 ${cfg.project} — бот КРМП-проекта`,
    "",
    "Команды:",
    "• /start или меню — главное меню",
    "• /server — статус сервера",
    "• /rules — правила",
    "• /admins — информация об администрации",
    "• /report Ник | Причина — отправить жалобу",
    "• /application Ник | Возраст | Должность — подать заявку",
  ].join("\n");
}

async function forwardToAdmin(title, fromId, text) {
  if (!cfg.adminPeerId) return false;

  let name = `ID ${fromId}`;

  try {
    const users = await vk("users.get", { user_ids: fromId });
    if (users?.[0]) {
      name = `${users[0].first_name} ${users[0].last_name} (id${fromId})`;
    }
  } catch (_) {}

  await send(
    cfg.adminPeerId,
    `${title}\n\nОт: ${name}\n${text}`,
    false
  );

  return true;
}

async function handleMessage(obj) {
  const msg = obj?.message;
  if (!msg) return;

  const peerId = msg.peer_id;
  const fromId = msg.from_id;
  const raw = (msg.text || "").trim();
  const text = normalize(raw);

  let payloadCmd = "";
  try {
    if (msg.payload) payloadCmd = JSON.parse(msg.payload)?.cmd || "";
  } catch (_) {}

  if (["/start", "start", "начать", "меню", "menu"].includes(text)) {
    return send(peerId, `Добро пожаловать в ${cfg.project}!\n\nВыберите раздел в меню ниже.`);
  }

  if (payloadCmd === "server" || ["/server", "сервер", "🎮 сервер", "онлайн"].includes(text)) {
    return send(peerId, `🎮 ${cfg.project}\nСтатус: ${cfg.serverStatus}\nIP: ${cfg.serverIp}`);
  }

  if (payloadCmd === "rules" || ["/rules", "правила", "📜 правила"].includes(text)) {
    const extra = cfg.rulesUrl ? `\n\nПолные правила: ${cfg.rulesUrl}` : "";
    return send(
      peerId,
      "📜 Основное:\n• Не используйте читы и стороннее ПО.\n• Не оскорбляйте игроков и администрацию.\n• Соблюдайте RP-процесс и правила проекта." + extra
    );
  }

  if (payloadCmd === "admins" || ["/admins", "администрация", "👮 администрация"].includes(text)) {
    return send(
      peerId,
      "👮 Администрация\nДля связи с администрацией используйте раздел «Жалоба» или сообщения сообщества."
    );
  }

  if (payloadCmd === "report" || ["/report", "жалоба", "📝 жалоба"].includes(text)) {
    return send(
      peerId,
      "📝 Чтобы отправить жалобу, напишите:\n/report Никнейм | Причина\n\nПример:\n/report Ivan_Ivanov | DM без причины"
    );
  }

  if (text.startsWith("/report ")) {
    const body = raw.slice(raw.indexOf(" ") + 1).trim();

    if (!body.includes("|")) {
      return send(peerId, "Формат: /report Никнейм | Причина");
    }

    const forwarded = await forwardToAdmin("📝 НОВАЯ ЖАЛОБА", fromId, body);

    return send(
      peerId,
      forwarded
        ? "✅ Жалоба отправлена администрации."
        : "✅ Жалоба принята. Для пересылки администрации нужно настроить VK_ADMIN_PEER_ID."
    );
  }

  if (payloadCmd === "application" || ["/application", "заявка", "📋 заявка"].includes(text)) {
    if (cfg.applicationUrl) {
      return send(peerId, `📋 Заявки на должность:\n${cfg.applicationUrl}`);
    }

    return send(
      peerId,
      "📋 Чтобы подать заявку, напишите:\n/application Никнейм | Возраст | Должность\n\nПример:\n/application Ivan_Ivanov | 16 | Администратор"
    );
  }

  if (text.startsWith("/application ")) {
    const body = raw.slice(raw.indexOf(" ") + 1).trim();
    const parts = body.split("|").map((s) => s.trim()).filter(Boolean);

    if (parts.length < 3) {
      return send(peerId, "Формат: /application Никнейм | Возраст | Должность");
    }

    const forwarded = await forwardToAdmin("📋 НОВАЯ ЗАЯВКА", fromId, body);

    return send(
      peerId,
      forwarded
        ? "✅ Заявка отправлена руководству."
        : "✅ Заявка принята. Для пересылки руководству нужно настроить VK_ADMIN_PEER_ID."
    );
  }

  if (payloadCmd === "help" || ["/help", "help", "помощь", "ℹ️ помощь"].includes(text)) {
    return send(peerId, helpText());
  }

  return send(peerId, `Команда не распознана.\n\n${helpText()}`);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("BLESK RUSSIA VK bot is running");
  }

  const body = req.body || {};

  if (cfg.secret && body.secret !== cfg.secret) {
    return res.status(403).send("forbidden");
  }

  if (body.type === "confirmation") {
    return res.status(200).send(cfg.confirmation || "");
  }

  try {
    if (body.type === "message_new") {
      await handleMessage(body.object);
    }
  } catch (error) {
    console.error(error);
  }

  return res.status(200).send("ok");
};
