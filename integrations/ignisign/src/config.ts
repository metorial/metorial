import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    appId: z
      .string()
      .optional()
      .describe(
        'Legacy application ID. Current API keys identify the application automatically.'
      ),
    appEnv: z
      .enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION'])
      .default('DEVELOPMENT')
      .describe('Ignisign application environment')
  })
);
