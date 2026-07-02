import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed - chatbot IDs are passed per-tool as input parameters
    // API token is handled via auth
  })
);
