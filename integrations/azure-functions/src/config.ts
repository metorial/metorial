import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subscriptionId: {
      schema: z
        .string()
        .describe(
          'Azure subscription ID (GUID format, e.g. 00000000-0000-0000-0000-000000000000)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    resourceGroupName: {
      schema: z.string().describe('Name of the resource group containing your function apps'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
