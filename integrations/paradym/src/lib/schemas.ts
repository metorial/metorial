import { z } from 'zod';

export let projectIdSchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    'Project ID. Call list_projects to discover authorized project IDs. Existing connections may use their saved project ID.'
  );

export let credentialFormatSchema = z.enum(['sd-jwt-vc', 'mdoc', 'anoncreds']);

export let validitySchema = z.object({
  future: z.object({
    days: z.number().positive().optional(),
    months: z.number().positive().optional(),
    years: z.number().positive().optional()
  }),
  start: z.enum(['issuance', 'validFrom']).optional()
});
