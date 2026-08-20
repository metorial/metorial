import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    websiteId: {
      schema: z.string().describe('The Crisp website ID (workspace identifier) to operate on'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
