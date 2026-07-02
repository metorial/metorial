import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendDocument = SlateTool.create(spec, {
  name: 'Send Document',
  key: 'send_document',
  description: `Sends a Docnify document to its assigned recipients for signing. The document must already have recipients added before it can be sent. Once sent, recipients will be notified and can sign the document.`,
  instructions: [
    'Ensure the document has at least one recipient before sending.',
    'Use the "Add Recipient To Document" tool first if no recipients have been assigned.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to send for signing')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the sent document'),
      documentName: z.string().describe('Name of the sent document'),
      status: z.string().describe('Updated status of the document after sending')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let document = await client.sendDocument(ctx.input.documentId);

    return {
      output: {
        documentId: document.id,
        documentName: document.name,
        status: document.status
      },
      message: `Sent document **${document.name}** (ID: ${document.id}) for signing. Status: ${document.status}.`
    };
  })
  .build();
