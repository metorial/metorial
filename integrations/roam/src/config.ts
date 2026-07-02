import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    graphName: z.string().describe('The name of the Roam Research graph to access')
  })
);
