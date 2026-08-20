import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Pinecone
    // Authentication (API key) is handled in auth.ts
    // Index host URLs are per-index and provided as tool inputs
  }
});
