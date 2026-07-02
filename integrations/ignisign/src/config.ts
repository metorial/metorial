import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    appId: z
      .string()
      .describe('Ignisign Application ID (e.g., appId_XXXX-XXXX-XXXX-XXXX-XXXX)'),
    appEnv: z
      .enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION'])
      .default('DEVELOPMENT')
      .describe('Ignisign application environment')
  })
);
