import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reparseDocuments = SlateTool.create(spec, {
  name: 'Re-Parse Documents',
  key: 'reparse_documents',
  description: `Schedule previously imported documents to be parsed again. Useful after updating parsing rules or extraction templates to re-process existing documents with the new configuration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      parserId: z.string().describe('ID of the Document Parser'),
      documentIds: z.array(z.string()).min(1).describe('Array of document IDs to re-parse')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the re-parse was successfully scheduled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.reparseDocuments(ctx.input.parserId, ctx.input.documentIds);

    return {
      output: { success: true },
      message: `Scheduled **${ctx.input.documentIds.length}** document(s) for re-parsing in parser \`${ctx.input.parserId}\`.`
    };
  })
  .build();
