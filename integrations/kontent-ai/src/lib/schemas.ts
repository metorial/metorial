import { z } from 'zod';

export let environmentIdInput = z
  .string()
  .optional()
  .describe(
    'Environment ID from Kontent.ai project settings. Use get_environment to verify its name and access. May be omitted when a legacy connection has a default environment ID.'
  );
