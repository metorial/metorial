import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    appId: {
      schema: z
        .string()
        .describe('Ignisign Application ID (e.g., appId_XXXX-XXXX-XXXX-XXXX-XXXX)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    appEnv: {
      schema: z
        .enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION'])
        .default('DEVELOPMENT')
        .describe('Ignisign application environment'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
