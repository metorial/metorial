import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    appId: z
      .string()
      .optional()
      .describe(
        'Ably App ID. Required for Control API operations. Found in the Ably dashboard under Application Settings, or as the first part of your API key (e.g. "28AB6c" from key "28AB6c.DEFi0Q:...")'
      ),
    accountId: z
      .string()
      .optional()
      .describe(
        'Ably Account ID. Required for account-level Control API operations like listing apps. Found in the Ably dashboard under Account Settings.'
      )
  })
);
