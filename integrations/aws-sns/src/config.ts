import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .string()
        .default('us-east-1')
        .describe(
          'AWS region where your SNS resources are located (e.g., us-east-1, eu-west-1)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
