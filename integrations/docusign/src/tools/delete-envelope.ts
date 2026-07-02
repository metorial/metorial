import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEnvelope = SlateTool.create(spec, {
  name: 'Delete Envelope',
  key: 'delete_envelope',
  description: `Moves a DocuSign envelope to Deleted Items by moving it from its current folder to the recyclebin folder. Useful for discarding drafts and cleaning up test envelopes.`,
  constraints: [
    'sourceFolderId must match the envelope current folder, such as "draft", "sentitems", "inbox", or another folder ID.',
    'Moving an in-process sent or delivered envelope to recyclebin voids it in DocuSign.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to move to Deleted Items'),
      sourceFolderId: z
        .string()
        .default('draft')
        .describe(
          'Current source folder ID or folder type. Common values include "draft", "sentitems", and "inbox".'
        )
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the deleted envelope'),
      sourceFolderId: z.string().describe('Folder the envelope was moved from'),
      destinationFolderId: z.string().describe('Destination folder ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    await client.deleteEnvelope(ctx.input.envelopeId, ctx.input.sourceFolderId);

    return {
      output: {
        envelopeId: ctx.input.envelopeId,
        sourceFolderId: ctx.input.sourceFolderId,
        destinationFolderId: 'recyclebin'
      },
      message: `Envelope **${ctx.input.envelopeId}** was moved from **${ctx.input.sourceFolderId}** to Deleted Items.`
    };
  })
  .build();
