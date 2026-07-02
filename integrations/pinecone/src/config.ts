import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Pinecone
    // Authentication (API key) is handled in auth.ts
    // Index host URLs are per-index and provided as tool inputs
  })
);
