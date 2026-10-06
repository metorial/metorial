import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.looseObject({
    apiVersion: z
      .string()
      .optional()
      .describe(
        'API version date in YYYY-MM-DD format (e.g. 2022-01-24). If omitted, the account default is used.'
      )
  })
);
