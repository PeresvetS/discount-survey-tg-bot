import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { checkDiscount } from '../services/portalApi';
import { UserSession, MessageHandler, ErrorHandler } from '../types';

export class TelegramBotApp {
  private bot: TelegramBot;
  private sessions: Map<number, UserSession>;

  constructor() {
    if (!config.botToken) {
      throw new Error('BOT_TOKEN is not defined');
    }

    this.sessions = new Map();
    this.bot = new TelegramBot(config.botToken, { 
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10
        }
      },
      onlyFirstMatch: false
    });
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.onText(/\/start/, this.handleStart.bind(this) as MessageHandler);
    this.bot.on('message', this.handleMessage.bind(this) as MessageHandler);
    this.bot.on('polling_error', ((error: Error) => {
      console.error('Polling error:', error);
    }) as ErrorHandler);
  }

  private async handleStart(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    this.sessions.set(chatId, {
      currentStep: 1,
      userData: {}
    });

    await this.bot.sendMessage(chatId, 'Здравствуйте! Давайте начнем опрос.');
    await this.bot.sendMessage(chatId, '1/5 Пожалуйста, введите ваше ФИО:');
  }

  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const session = this.sessions.get(chatId);

    if (!session?.currentStep) {
      await this.bot.sendMessage(chatId, 'Пожалуйста, начните с команды /start');
      return;
    }

    switch (session.currentStep) {
      case 1:
        session.userData.fullName = msg.text;
        await this.bot.sendMessage(chatId, '2/5 Укажите вашу специализацию:');
        break;
      case 2:
        session.userData.specialization = msg.text;
        await this.bot.sendMessage(chatId, '3/5 Откуда вы узнали про Портал мастеров?');
        break;
      case 3:
        session.userData.source = msg.text;
        await this.bot.sendMessage(chatId, '4/5 Откуда вы?');
        break;
      case 4:
        session.userData.location = msg.text;
        await this.bot.sendMessage(chatId, '5/5 Какой email используется на Портале мастеров?');
        break;
      case 5:
        session.userData.email = msg.text;
        await this.processAndSendResults(chatId, session);
        break;
    }

    if (session.currentStep < 5) {
      session.currentStep++;
    }
    this.sessions.set(chatId, session);
  }

  private async processAndSendResults(chatId: number, session: UserSession): Promise<void> {
    const discountResponse = await checkDiscount(session.userData.email || '');
    await this.bot.sendMessage(chatId, discountResponse);

    const message = `
Новая заявка:
1. ФИО: ${session.userData.fullName}
2. Специализация: ${session.userData.specialization}
3. Источник: ${session.userData.source}
4. Локация: ${session.userData.location}
5. Email: ${session.userData.email}
6. Статус проверки скидки: ${discountResponse === 'Ошибка при проверке скидки' ? '❌ Неуспешно' : '✅ Успешно'}
    `;

    await this.bot.sendMessage(chatId, message);
    await this.bot.sendMessage(chatId, 'Спасибо за ваши ответы! Мы обработаем вашу заявку.');
    
    this.sessions.set(chatId, {
      currentStep: 0,
      userData: {}
    });
  }

  public async checkBotStatus(): Promise<void> {
    try {
      const botInfo = await this.bot.getMe();
      console.log('\n=== Бот запущен ===');
      console.log(`Имя бота: ${botInfo.username}`);
      console.log(`ID бота: ${botInfo.id}`);
      console.log(`Целевая группа: ${config.targetGroupId}`);

      if (config.targetGroupId) {
        try {
          // Сначала проверяем базовый доступ к группе
          console.log('\n=== Проверка доступа к группе ===');
  
          const targetGroupId = config.targetGroupId.trim();
          console.log(`Целевая группа: ${targetGroupId}`);
          const chatInfo = await this.bot.getChat(targetGroupId);
          console.log('\n=== Информация о группе ===');
          console.log(`Название: ${chatInfo.title}`);
          console.log(`Тип: ${chatInfo.type}`);
          console.log(`ID: ${chatInfo.id}`);

          // Затем проверяем членство бота
          const chatMember = await this.bot.getChatMember(config.targetGroupId, botInfo.id);
          console.log('\n=== Права бота ===');
          console.log(`Статус: ${chatMember.status}`);

          // Проверяем возможность отправки сообщений
          await this.bot.sendChatAction(config.targetGroupId, 'typing');
          console.log('✅ Бот имеет доступ к отправке сообщений');
        } catch (error) {
          console.error('\n❌ Ошибка при проверке группы:', (error as Error).message);
          console.log('Проверьте:');
          console.log('1. Бот добавлен в группу');
          console.log('2. Бот имеет права администратора');
          console.log('3. ID группы указан верно');
        }
      } else {
        console.log('\n⚠️ ID группы не указан в конфигурации');
      }
    } catch (error) {
      console.error('Ошибка при получении информации о боте:', (error as Error).message);
    }
  }

  public async launch(): Promise<void> {
    try {
      console.log('Launching bot...');
      const me = await this.bot.getMe();
      console.log(`Bot @${me.username} is running`);
    } catch (error) {
      console.error('Failed to launch bot:', (error as Error).message);
      throw error;
    }
  }

  public stop(): void {
    console.log('Stopping bot...');
    this.bot.stopPolling();
  }
}