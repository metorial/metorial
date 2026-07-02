import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    deploymentId: z
      .string()
      .describe(
        'The EOS Deployment ID for your product environment. Found in the Epic Developer Portal under Product Settings.'
      ),
    sandboxId: z
      .string()
      .optional()
      .describe(
        'The EOS Sandbox ID for your product. Required for ecommerce/ownership operations.'
      )
  })
);
