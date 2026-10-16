import { z } from 'zod';

export let storeIdSchema = z
  .string()
  .describe('Store ID. Call manage_stores with action list to discover authorized store IDs.');
