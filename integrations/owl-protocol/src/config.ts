import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    chainId: {
      schema: z
        .number()
        .optional()
        .describe(
          'Default blockchain chain ID to use for operations (e.g. 150150 for Owl testnet). Can be overridden per-request.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
