import { z } from 'zod';

export let businessIdSchema = z
  .string()
  .optional()
  .describe(
    'Business ID. Call list_businesses to discover authorized businesses. Required unless the connection already stores a business ID.'
  );
