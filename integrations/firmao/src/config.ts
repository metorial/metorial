import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .describe(
          'Your Firmao organization identifier, visible in the URL after logging in (e.g., the part after system.firmao.net/)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
