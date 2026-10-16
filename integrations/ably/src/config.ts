import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    appId: z
      .string()
      .optional()
      .describe(
        'Optional legacy default App ID for Control API operations. Prefer tool input; call manage_apps with action list to discover IDs. Found in the Ably dashboard under Application Settings, or as the first part of your API key (e.g. "28AB6c" from key "28AB6c.DEFi0Q:...")'
      ),
    accountId: z
      .string()
      .optional()
      .describe(
        'Optional legacy default Account ID for account-level Control API operations. Prefer tool input; call who_am_i to discover the account ID. Found in the Ably dashboard under Account Settings.'
      )
  })
);
