import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domainId: z
      .number()
      .optional()
      .describe(
        'Optional default domain ID. Call list_domains to discover available domain IDs; tools also accept it per request.'
      ),
    domain: z
      .string()
      .optional()
      .describe(
        'Default domain hostname (e.g., "example.short.gy") to use when creating links.'
      )
  })
);
