import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiEndpoint: z
      .string()
      .describe(
        'Your Wati API endpoint URL (e.g. https://live-server-XXXXX.wati.io). Found in Wati Dashboard under API Docs.'
      )
  })
);
