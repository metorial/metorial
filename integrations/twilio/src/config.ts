import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountSid: z
      .string()
      .describe('Your Twilio Account SID (starts with AC). Found in the Twilio Console.')
  })
);
