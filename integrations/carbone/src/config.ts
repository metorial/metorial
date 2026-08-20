import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    carboneVersion: {
      schema: z
        .number()
        .int()
        .default(5)
        .describe('Carbone API version to use (e.g. 5). Sent as the carbone-version header.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    baseUrl: {
      schema: z
        .string()
        .default('https://api.carbone.io')
        .describe('Base URL for the Carbone API. Override for on-premise deployments.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
