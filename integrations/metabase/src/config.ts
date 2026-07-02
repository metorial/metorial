import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe('The URL of your Metabase instance (e.g., https://your-metabase.example.com)')
  })
);
