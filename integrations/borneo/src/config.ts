import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe(
          'Borneo API base URL (deployment-specific, e.g. from AWS API Gateway CloudFormation stack output)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
