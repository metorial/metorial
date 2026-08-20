import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    siteToken: {
      schema: z
        .string()
        .describe(
          'GoSquared project token (e.g. GSN-123456-A). Found under Settings > Current Project > General.'
        ),
      visibility: 'secret',
      lifecycle: 'reregister'
    }
  }
});
