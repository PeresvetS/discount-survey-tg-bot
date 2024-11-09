import dotenv from 'dotenv';

dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  targetGroupId: process.env.TARGET_GROUP_ID || '',
  port: process.env.PORT || 400
};