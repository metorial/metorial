import { z } from 'zod';

export let publicationIdSchema = z
  .string()
  .describe('Publication ID. Call list_publications to discover authorized publication IDs.');
