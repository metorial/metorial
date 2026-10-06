import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    serverUrl: z
      .string()
      .url()
      .default('https://api.dp1.us.honeyhive.ai')
      .describe(
        'HoneyHive data-plane URL. Use the managed-cloud default or your dedicated/self-hosted data-plane URL. Stored legacy managed-cloud URLs are migrated automatically.'
      ),
    project: z
      .string()
      .optional()
      .describe(
        'Legacy project selector retained for compatibility. The connection API key determines the project; this value does not change its scope.'
      )
  })
);
