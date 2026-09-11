import { z } from 'zod';

export let workspaceIdSchema = z
  .string()
  .min(1)
  .describe('ClickUp Workspace ID. Call get_workspaces to discover authorized Workspace IDs.');
