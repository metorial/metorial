import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiEndpoint: z
      .string()
      .describe(
        'Your Wati API endpoint URL (e.g. https://live-mt-server.wati.io). Use the V3 API host without a workspace path. Found in Wati Dashboard under API Docs.'
      )
  })
);
