import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe(
        'Borneo API base URL (deployment-specific, e.g. from AWS API Gateway CloudFormation stack output)'
      )
  })
);
