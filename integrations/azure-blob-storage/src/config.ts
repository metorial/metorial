import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    storageAccountName: {
      schema: z
        .string()
        .describe('The name of the Azure Storage account (e.g. "mystorageaccount")'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
