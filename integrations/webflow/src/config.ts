import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteId: z.string().optional().describe('Default Webflow site ID to use for API requests')
  })
);
