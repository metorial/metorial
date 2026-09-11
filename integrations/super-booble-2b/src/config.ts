import { SlateConfig } from 'slates';
import { z } from 'zod';

export let superGoogle2BConfigSchema = z.object({
  domain: z
    .string()
    .optional()
    .describe('Optional primary Google Workspace domain used by Admin tools.'),
  customerId: z
    .string()
    .optional()
    .describe(
      'Optional Google Workspace customer ID used by Admin tools. Defaults to "my_customer".'
    )
});

export type SuperGoogle2BConfig = z.infer<typeof superGoogle2BConfigSchema>;

export let config = SlateConfig.create(superGoogle2BConfigSchema);
