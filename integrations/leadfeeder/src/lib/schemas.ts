import { z } from 'zod';

export let accountIdSchema = z
  .string()
  .optional()
  .describe(
    'Leadfeeder account ID. Call get_accounts to discover accessible IDs. Defaults to the configured or first available account.'
  );

export let accountSchema = z.object({
  accountId: z.string(),
  name: z.string(),
  subscription: z.string(),
  timezone: z.string(),
  websiteTrackingStatus: z.string()
});

export let employeeRangeBoundsSchema = z
  .object({ min: z.number().nullable(), max: z.number().nullable() })
  .nullable()
  .optional()
  .describe('Employee range with unknown or open-ended bounds preserved as null.');
