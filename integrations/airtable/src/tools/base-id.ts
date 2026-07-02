import { z } from 'zod';

export let baseIdInput = z
  .string()
  .describe(
    'Airtable base ID to operate on, typically starting with app. Use list_bases to discover accessible base IDs.'
  );
