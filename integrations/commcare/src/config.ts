import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe(
          'The CommCare project space (domain) name, found in your CommCare HQ URL: https://www.commcarehq.org/a/[domain]/'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
