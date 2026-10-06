import { z } from 'zod';
export const administrationIdSchema = z
  .string()
  .optional()
  .describe(
    'Administration ID. Call list_administrations to discover authorized administrations. Overrides the saved default when provided.'
  );
