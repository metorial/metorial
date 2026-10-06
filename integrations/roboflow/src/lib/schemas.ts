import { z } from 'zod';

export const projectIdSchema = z
  .string()
  .min(1)
  .describe('Project slug or workspace/project ID. Call list_projects to discover projects.');

export const versionNumberSchema = z
  .number()
  .int()
  .positive()
  .describe(
    'Positive dataset or model version number. Call get_project to discover versions.'
  );
