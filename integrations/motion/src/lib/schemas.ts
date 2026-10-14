import { z } from 'zod';

export let workspaceIdSchema = z
  .string()
  .describe('Workspace ID. Call list_workspaces to discover authorized workspace IDs.');
