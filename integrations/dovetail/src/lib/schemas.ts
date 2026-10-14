import { z } from 'zod';

export let projectIdSchema = z
  .string()
  .describe('Project ID. Call list_projects to discover authorized projects.');
export let folderIdSchema = z
  .string()
  .describe('Folder ID. Call browse_folders to discover authorized folders.');
