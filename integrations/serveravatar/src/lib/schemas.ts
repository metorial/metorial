import { z } from 'zod';

export let organizationIdSchema = z
  .string()
  .optional()
  .describe(
    'Organization ID. Call list_organizations to discover authorized organization IDs. Defaults to the configured organization when omitted.'
  );

export let organizationScopeGuidance =
  'Call list_organizations to discover authorized organization IDs, then pass the chosen organizationId or use the configured default.';
