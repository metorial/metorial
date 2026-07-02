import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .describe('Your SignPath organization identifier, included in all API URL paths'),
    baseUrl: z
      .string()
      .default('https://app.signpath.io')
      .describe('Base URL of the SignPath instance (default: https://app.signpath.io)')
  })
);
