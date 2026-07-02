import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountName: z
      .string()
      .describe('Fibery workspace subdomain (e.g., "my-company" for my-company.fibery.io)')
  })
);
