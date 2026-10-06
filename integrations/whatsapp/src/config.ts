import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    phoneNumberId: z
      .string()
      .describe('The Phone Number ID from Meta App Dashboard under WhatsApp > API Setup'),
    wabaId: z.string().describe('The WhatsApp Business Account ID from Meta App Dashboard'),
    apiVersion: z.string().default('v21.0').describe('Graph API version to use (e.g. v21.0)')
  })
);
