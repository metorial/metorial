import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .string()
      .default('2020-01-03')
      .describe('Userflow API version to use (e.g. 2020-01-03)')
  })
);
