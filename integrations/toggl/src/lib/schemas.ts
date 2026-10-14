import { z } from 'zod';

export let workspaceIdInput = z
  .string()
  .optional()
  .describe(
    'Workspace ID. Call get_workspace without an ID to discover available workspaces. Defaults to your account workspace when omitted.'
  );
