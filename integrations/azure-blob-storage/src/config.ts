import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    storageAccountName: z
      .string()
      .describe('The name of the Azure Storage account (e.g. "mystorageaccount")')
  })
);
