import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reintegrateDocuments = SlateTool.create(spec, {
  name: 'Re-Integrate Documents',
  key: 'reintegrate_documents',
  description: `Schedule documents to be re-sent through configured integrations and webhooks. Useful when integration targets were unavailable or when you need to re-trigger downstream processing.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      parserId: z.string().describe('ID of the Document Parser'),
      documentIds: z.array(z.string()).min(1).describe('Array of document IDs to re-integrate')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the re-integration was successfully scheduled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.reintegrateDocuments(ctx.input.parserId, ctx.input.documentIds);

    return {
      output: { success: true },
      message: `Scheduled **${ctx.input.documentIds.length}** document(s) for re-integration in parser \`${ctx.input.parserId}\`.`
    };
  })
  .build();
