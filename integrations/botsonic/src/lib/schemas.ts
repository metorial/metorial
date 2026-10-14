import { z } from 'zod';

export let botIdSchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    'Bot ID from list_bots. Required for account API key connections; omitted for a bot API token connection.'
  );
export let workspaceIdSchema = z
  .string()
  .optional()
  .describe(
    'Workspace ID from list_bots, used when resolving a bot API token with an account connection.'
  );
export let pageSchema = z
  .number()
  .min(1)
  .refine(Number.isInteger, {
    message: 'Page must be a whole number'
  })
  .optional()
  .describe('Page number (starts at 1)');
export let sizeSchema = z
  .number()
  .min(1)
  .max(100)
  .refine(Number.isInteger, {
    message: 'Page size must be a whole number'
  })
  .optional()
  .describe('Number of results per page (1-100, default 50)');
export let orderSchema = z
  .number()
  .refine(Number.isInteger, {
    message: 'Display order must be a whole number'
  })
  .optional()
  .describe('Display order (lower numbers appear first)');
