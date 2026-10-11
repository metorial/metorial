import { SlateConfig } from 'slates';
import { z } from 'zod';
import { DEFAULT_WHATSAPP_API_VERSION } from './lib/graph';

export let config = SlateConfig.create(
  z.object({
    phoneNumberId: z
      .string()
      .describe('The Phone Number ID from Meta App Dashboard under WhatsApp > API Setup'),
    wabaId: z.string().describe('The WhatsApp Business Account ID from Meta App Dashboard'),
    apiVersion: z
      .string()
      .default(DEFAULT_WHATSAPP_API_VERSION)
      .describe(`Graph API version to use (e.g. ${DEFAULT_WHATSAPP_API_VERSION})`)
  })
);
