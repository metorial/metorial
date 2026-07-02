import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    applicationId: z
      .string()
      .describe(
        'The Sendbird Application ID. Found in Dashboard > Settings > Application > General. This is case-sensitive and used to construct the API base URL.'
      )
  })
);
