import { z } from 'zod';

export let workspaceIdSchema = z
  .string()
  .optional()
  .describe(
    'Workspace ID from list_workspaces. Omit to use the saved or credential-bound workspace.'
  );
