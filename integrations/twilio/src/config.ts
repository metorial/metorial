import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountSid: {
      schema: z
        .string()
        .describe('Your Twilio Account SID (starts with AC). Found in the Twilio Console.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
