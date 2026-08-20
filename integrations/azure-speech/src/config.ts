import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .string()
        .describe(
          'Azure region for the Speech resource (e.g., "eastus", "westus2", "westeurope"). Determines the service endpoint URLs.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
