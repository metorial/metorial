import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reparseDocument = SlateTool.create(spec, {
  name: 'Re-parse Document',
  key: 'reparse_document',
  description: `Trigger re-parsing of a specific document. Useful when templates have been updated or a previous parse failed.`
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to re-parse')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the re-parse was triggered successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.parseDocument(ctx.input.documentId);

    return {
      output: { success: true },
      message: `Triggered re-parse for document **${ctx.input.documentId}**.`
    };
  })
  .build();
