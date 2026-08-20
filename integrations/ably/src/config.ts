import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    appId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Ably App ID. Required for Control API operations. Found in the Ably dashboard under Application Settings, or as the first part of your API key (e.g. "28AB6c" from key "28AB6c.DEFi0Q:...")'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    accountId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Ably Account ID. Required for account-level Control API operations like listing apps. Found in the Ably dashboard under Account Settings.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
