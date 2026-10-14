import { z } from 'zod';

export let teamIdSchema = z
  .string()
  .optional()
  .describe(
    'Optional team ID for organization-scoped tokens. Call list_teams to discover teams or get_auth_info to inspect the token scope. Team-scoped tokens can omit this.'
  );
