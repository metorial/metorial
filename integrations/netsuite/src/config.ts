import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe(
        'NetSuite Account ID (e.g., "1234567" or "1234567_SB1" for sandbox). Found in your NetSuite URL: https://<ACCOUNT_ID>.app.netsuite.com'
      )
  })
);
