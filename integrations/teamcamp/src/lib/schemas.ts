import { z } from 'zod';

export let projectIdSchema = z
  .string()
  .describe('Project ID. Call list_projects to discover available project IDs.');
