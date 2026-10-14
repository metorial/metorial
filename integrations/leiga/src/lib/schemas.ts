import { z } from 'zod';

export let projectIdSchema = z
  .number()
  .describe('Project ID. Call list_projects to discover accessible project IDs.');
