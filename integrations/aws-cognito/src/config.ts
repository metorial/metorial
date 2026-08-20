import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .string()
        .describe('AWS region where your Cognito resources are located (e.g., us-east-1)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
