import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Google Contacts
    // Authentication is handled through OAuth 2.0 or API keys
  })
);
