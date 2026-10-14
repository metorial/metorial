import { z } from 'zod';

export let organizationIdSchema = z
  .string()
  .optional()
  .describe(
    'Organization ID. Call list_organizations to discover accessible IDs. Required for multi-organization keys; optional for a key scoped to one organization.'
  );
