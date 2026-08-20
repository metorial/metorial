import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    deploymentId: {
      schema: z
        .string()
        .describe(
          'The EOS Deployment ID for your product environment. Found in the Epic Developer Portal under Product Settings.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    sandboxId: {
      schema: z
        .string()
        .optional()
        .describe(
          'The EOS Sandbox ID for your product. Required for ecommerce/ownership operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
