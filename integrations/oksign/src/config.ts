import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for OKSign
    // All sensitive values (account number, tokens) are part of authentication
  })
);
