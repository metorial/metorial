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
      success: z.boolean().describe('Whether the re-parse was successfully scheduled'),
      totalReparsed: z.number().describe('Number of documents scheduled for re-parsing'),
      message: z.string().optional().describe('Message returned by Docparser')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.reparseDocuments(ctx.input.parserId, ctx.input.documentIds);

    return {
      output: {
        success: true,
        totalReparsed: result.totalReparsed,
        message: result.message
      },
      message: `Scheduled **${result.totalReparsed}** document(s) for re-parsing in parser \`${ctx.input.parserId}\`.`
    };
  })
  .build();
