import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountCode: {
      schema: z
        .string()
        .describe(
          'Your More Trees account code. Found under Settings > Account Settings on the More Trees platform.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
