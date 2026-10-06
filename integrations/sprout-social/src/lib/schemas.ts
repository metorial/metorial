import { z } from 'zod';

export const customerIdSchema = z
  .string()
  .optional()
  .describe(
    'Customer ID. Call list_customers to discover authorized customers. Overrides the saved legacy default.'
  );
