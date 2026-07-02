import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global config needed - authentication handles all credentials
    // Studio ID is part of the New Lead API auth, API key is part of the Public API auth
  })
);
