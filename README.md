# BLESK RUSSIA VK BOT

VK-бот для КРМП-проекта **BLESK RUSSIA**.

## Возможности
- Главное меню с VK-клавиатурой
- Статус и IP игрового сервера
- Правила
- Раздел администрации
- Жалобы игроков
- Заявки на должности
- Пересылка жалоб и заявок руководству

## Настройка
После публикации добавьте в окружение:
- `VK_TOKEN`
- `VK_CONFIRMATION_CODE`
- `VK_SECRET`
- `PROJECT_NAME=BLESK RUSSIA`
- `SERVER_IP`
- `SERVER_STATUS`
- `VK_ADMIN_PEER_ID`
- `RULES_URL` (необязательно)
- `APPLICATION_URL` (необязательно)

Callback URL после публикации:
`https://ВАШ-ДОМЕН/api/vk`

В VK Callback API включите событие `message_new`.
