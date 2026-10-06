import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    graphName: z
      .string()
      .describe(
        'Hosted graph name as shown in its Roam URL. Use the graph bound to the backend token; encrypted and local-only graphs are unsupported.'
      )
  })
);
