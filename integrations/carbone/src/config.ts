import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    carboneVersion: z
      .number()
      .int()
      .default(5)
      .describe('Carbone API version to use (e.g. 5). Sent as the carbone-version header.'),
    baseUrl: z
      .string()
      .default('https://api.carbone.io')
      .describe('Base URL for the Carbone API. Override for on-premise deployments.')
  })
);
