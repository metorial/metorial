import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    graphName: {
      schema: z.string().describe('The name of the Roam Research graph to access'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
