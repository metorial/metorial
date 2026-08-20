import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    applicationId: {
      schema: z
        .string()
        .describe(
          'The Sendbird Application ID. Found in Dashboard > Settings > Application > General. This is case-sensitive and used to construct the API base URL.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
