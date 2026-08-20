import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    spaceId: {
      schema: z.string().describe('The numeric ID of your Storyblok space'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
