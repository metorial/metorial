import { configV2 } from 'slates';
import { z } from 'zod';

export let configSchema = z.object({
  companyId: z
    .string()
    .optional()
    .describe(
      'Default Tripletex target company id for API calls. Use 0 or omit for the employee token owner company; accountant proxy users can provide a client company id.'
    )
});

export type TripletexConfig = z.infer<typeof configSchema>;

export let config = configV2({
  fields: {
    companyId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default Tripletex target company id for API calls. Use 0 or omit for the employee token owner company; accountant proxy users can provide a client company id.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
