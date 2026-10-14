import { z } from 'zod';

export const groupIdSchema = z
  .string()
  .min(1)
  .optional()
  .describe('Group ID. Use manage_groups with action list to discover group IDs.');
export const contactIdSchema = z
  .string()
  .min(1)
  .optional()
  .describe('Contact ID. Use manage_contacts with action list to discover contact IDs.');
export const pageSchema = z
  .number()
  .int()
  .min(1)
  .optional()
  .describe('Page number for list results (default: 1).');
export const limitSchema = z
  .number()
  .int()
  .min(1)
  .optional()
  .describe('Number of list results per page (default: 10).');
export const orderSchema = z.enum(['asc', 'desc']).optional().describe('List sort order.');
