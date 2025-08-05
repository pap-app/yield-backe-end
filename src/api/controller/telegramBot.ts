/*import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

const token = process.env.TELEGRAM_BOT_TOKEN!;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start (.+)/, async (msg, match) => {
  const token = match?.[1];
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  try {
    // Call your back-end to verify and store
    await axios.post(
      'https://99d5b3a74479.ngrok-free.app/api/v1/telegram/verify',
      {
        token,
        telegramChatId: chatId,
        telegramUsername: username,
      },
    );

    bot.sendMessage(chatId, `🎉 Telegram connected successfully!`);
  } catch (err) {
    bot.sendMessage(chatId, `❌ Failed to link Telegram. Try again.`);
  }
});
*/

import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

const token = process.env.TELEGRAM_BOT_TOKEN!;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start(?:\s(.+))?/, async (msg, match) => {
  const token = match?.[1]; // optional token
  const chatId = msg.chat.id;
  const username = msg.from?.username;

  // Send welcome message always
  await bot.sendMessage(
    chatId,
    `👋 Welcome to **DeFi Vault Copilot**!

I'm your 24/7 yield assistant 🚀  
I'll help you track and automate your on-chain earnings in real-time.

To link your account, just tap the button in the app or send me your connection token.`,
  );

  // If token is present, attempt to link
  if (token) {
    try {
      await axios.post(
        'https://99d5b3a74479.ngrok-free.app/api/v1/telegram/verify',
        {
          token,
          telegramChatId: chatId,
          telegramUsername: username,
        },
      );
      bot.sendMessage(
        chatId,
        `✅ Telegram linked successfully! You're now set to receive notifications.`,
      );
    } catch (err) {
      bot.sendMessage(
        chatId,
        `❌ Failed to link Telegram. Please try again from the app.`,
      );
    }
  } else {
    bot.sendMessage(
      chatId,
      `ℹ️ If you haven't already, open the app and tap "Connect Telegram" to get started.`,
    );
  }
});
