import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let verifyIntegrationKey = SlateTool.create(spec, {
  name: 'Verify Integration Key',
  key: 'verify_integration_key',
  description: `Verify the configured Pendo integration key and return Pendo's key capability details, including write access when provided by the API.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      valid: z.boolean().optional().describe('Whether Pendo accepted the integration key'),
      writeAccess: z.boolean().optional().describe('Whether the key has write access'),
      raw: z.any().describe('Full raw verification response from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let result = await client.verifyIntegrationKey();

    return {
      output: {
        valid: result.valid ?? result.isValid ?? true,
        writeAccess: result.writeAccess ?? result.hasWriteAccess,
        raw: result
      },
      message: 'Verified the configured Pendo integration key.'
    };
  })
  .build();
