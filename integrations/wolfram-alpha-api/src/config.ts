import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    unitSystem: {
      schema: z
        .enum(['metric', 'imperial'])
        .default('metric')
        .describe('Default unit system for results'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
