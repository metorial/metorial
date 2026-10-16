import { z } from 'zod';

export let domainIdSchema = z
  .number()
  .describe('Domain ID. Call list_domains to discover authorized domain IDs.');
