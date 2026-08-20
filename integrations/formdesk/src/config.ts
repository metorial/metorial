import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe(
          'The unique account name (folder of forms) found in your Formdesk account settings. This is the domain portion of your Formdesk URL.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
