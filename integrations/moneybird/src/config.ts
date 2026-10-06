import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    administrationId: z
      .string()
      .optional()
      .describe(
        'Optional default administration ID. Call list_administrations to choose an authorized administration; each tool can override this default.'
      )
  })
);
