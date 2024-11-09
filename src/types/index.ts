import TelegramBot from 'node-telegram-bot-api';

export interface UserResponse {
  fullName: string;
  specialization: string;
  source: string;
  location: string;
  email: string;
}

export interface UserSession {
  currentStep: number;
  userData: Partial<UserResponse>;
}

export type MessageHandler = (msg: TelegramBot.Message) => Promise<void>;
export type ErrorHandler = (error: Error) => void;

// Additional type safety for chat member status
export type ChatMemberStatus = 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';

// Additional type safety for chat types
export type ChatType = 'private' | 'group' | 'supergroup' | 'channel';