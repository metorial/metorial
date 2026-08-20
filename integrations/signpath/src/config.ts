import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .describe('Your SignPath organization identifier, included in all API URL paths'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    baseUrl: {
      schema: z
        .string()
        .default('https://app.signpath.io')
        .describe('Base URL of the SignPath instance (default: https://app.signpath.io)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
