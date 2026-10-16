import { z } from 'zod';

export let organizationIdSchema = z
  .string()
  .optional()
  .describe(
    'Organization ID. Call get_user with includeOrganizations=true to discover IDs. Uses the optional configured default when omitted.'
  );
