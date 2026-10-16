import { z } from 'zod';

export const projectIdSchema = z
  .number()
  .describe('Project ID. Call list_projects to discover authorized projects.');
export const rawSchema = z.unknown().optional().describe('Complete provider response.');
