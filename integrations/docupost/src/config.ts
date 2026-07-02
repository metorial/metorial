import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for DocuPost
    // Authentication is handled via API token in auth.ts
  })
);
