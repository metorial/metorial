import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z.string().describe('Google Cloud project ID'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
