import { SlateConfig } from 'slates';
import { z } from 'zod';
import { FINAGO_DEFAULT_BASE_URL } from './lib/client';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .optional()
      .describe(
        `Optional Finago REST API base URL override. Defaults to ${FINAGO_DEFAULT_BASE_URL}.`
      )
  })
);
