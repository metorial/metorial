import { z } from 'zod';

export let workspaceId = z
  .string()
  .optional()
  .describe(
    'Workspace UUID from your DotSimple workspace URL. Overrides the saved default workspace when supplied.'
  );
