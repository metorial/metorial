import { SlateConfig } from 'slates';
import { z } from 'zod';
export let config = SlateConfig.create(
  z.object({
    pageId: z
      .string()
      .optional()
      .describe(
        'Optional default Page ID. Use list_pages to discover accessible pages; each page-scoped tool accepts an override.'
      )
  })
).getDefaultConfig(() => ({}));
