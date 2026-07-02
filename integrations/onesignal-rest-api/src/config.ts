import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    appId: z
      .string()
      .describe(
        'Your OneSignal App ID (UUID v4). This is a public identifier used for all API requests.'
      )
  })
);
