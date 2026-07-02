import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseId: z
      .string()
      .optional()
      .describe(
        'Optional default Airtable base ID (e.g. appXXXXXXXXXXXXXX). Tools ask for baseId when needed; this is only used for webhook trigger auto-registration.'
      )
  })
);
