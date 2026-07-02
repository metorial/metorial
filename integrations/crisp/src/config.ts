import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    websiteId: z.string().describe('The Crisp website ID (workspace identifier) to operate on')
  })
);
