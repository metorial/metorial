import { z } from 'zod';

export let dataRegionSchema = z.enum(['global', 'euc1', 'use2', 'euw2', 'apse2']);

export let workspaceIdSchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    'Workspace ID. Call get_workspaces to discover authorized workspace IDs. May be omitted for an existing connection with a stored workspace ID.'
  );
