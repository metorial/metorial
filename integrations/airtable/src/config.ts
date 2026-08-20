import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional default Airtable base ID (e.g. appXXXXXXXXXXXXXX). Tools ask for baseId when needed; this is only used for webhook trigger auto-registration.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
