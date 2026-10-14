import { z } from 'zod';

export let teamIdSchema = z
  .string()
  .describe('Space ID. Call list_teams to discover authorized space IDs.');
