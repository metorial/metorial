import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe(
          'NetSuite Account ID (e.g., "1234567" or "1234567_SB1" for sandbox). Found in your NetSuite URL: https://<ACCOUNT_ID>.app.netsuite.com'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
