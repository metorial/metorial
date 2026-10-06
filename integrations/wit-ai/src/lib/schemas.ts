import { z } from 'zod';

export const appIdSchema = z
  .string()
  .min(1)
  .describe('App ID. Call list_apps to discover accessible app IDs.');
