import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subscriptionId: z
      .string()
      .describe(
        'Azure subscription ID (GUID format, e.g. 00000000-0000-0000-0000-000000000000)'
      ),
    resourceGroupName: z
      .string()
      .describe('Name of the resource group containing your function apps')
  })
);
