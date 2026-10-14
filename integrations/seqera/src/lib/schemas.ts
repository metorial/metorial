import { z } from 'zod';

export let workspaceIdSchema = z
  .string()
  .optional()
  .describe(
    'Workspace ID. Call list_organizations, then list_workspaces to discover authorized workspace IDs. Omit to use the connection default or personal context.'
  );
