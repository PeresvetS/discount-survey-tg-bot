import express from 'express';
import { config } from './config';
import { TelegramBotApp } from './bot';

const app = express();
let bot: TelegramBotApp;

async function startBot() {
    console.log('Initializing bot...');
    bot = new TelegramBotApp();
    
    try {
        await bot.launch();
        await bot.checkBotStatus();
        console.log('Bot successfully started');
        return true;
    } catch (error) {
        console.error('Failed to start bot:', error);
        return false;
    }
}

async function startServer() {
    app.get('/health', (_, res) => {
        res.status(200).json({ status: 'OK' });
    });

    app.get('/check-group', async (_, res) => {
        if (bot) {
            await bot.checkBotStatus();
            res.json({ status: 'check completed' });
        } else {
            res.status(500).json({ status: 'bot not initialized' });
        }
    });

    return new Promise((resolve) => {
        app.listen(config.port, () => {
            console.log(`Server is running on port ${config.port}`);
            resolve(true);
        });
    });
}

async function main() {
    try {
        console.log('Starting application...');
        console.log('Environment:', {
            botToken: config.botToken ? 'Set' : 'Not set',
            targetGroupId: config.targetGroupId ? 'Set' : 'Not set',
            port: config.port
        });

        const botStarted = await startBot();
        if (!botStarted) {
            throw new Error('Failed to start bot');
        }

        await startServer();
        console.log('Application successfully started');
    } catch (error) {
        console.error('Application failed to start:', error);
        process.exit(1);
    }
}

main();

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    if (bot) {
        bot.stop();
    }
    process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));