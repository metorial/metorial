import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your noCRM.io account subdomain (e.g. "mycompany" from mycompany.nocrm.io)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
