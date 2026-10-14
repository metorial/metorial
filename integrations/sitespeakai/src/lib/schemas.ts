import { z } from 'zod';

export let chatbotIdSchema = z
  .string()
  .describe('Chatbot ID. Call list_chatbots to discover available chatbot IDs.');
