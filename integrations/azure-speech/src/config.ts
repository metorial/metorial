import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .string()
      .describe(
        'Azure region for the Speech resource (e.g., "eastus", "westus2", "westeurope"). Determines the service endpoint URLs.'
      )
  })
);
