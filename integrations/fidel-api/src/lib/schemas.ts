import { z } from 'zod';

export let programIdInput = z
  .string()
  .describe('Program ID. Call list_programs to discover authorized programs.');
