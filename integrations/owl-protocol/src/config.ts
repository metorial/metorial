import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    chainId: z
      .number()
      .optional()
      .describe(
        'Default blockchain chain ID to use for operations (e.g. 150150 for Owl testnet). Can be overridden per-request.'
      )
  })
);
