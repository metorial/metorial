import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addRecipient = SlateTool.create(spec, {
  name: 'Add Recipient To Document',
  key: 'add_recipient_to_document',
  description: `Adds a recipient to an existing Docnify document. Recipients are individuals who need to sign or interact with the document. Each recipient is identified by their email and name.`,
  instructions: [
    'Provide the document ID and the recipient details (email and name).',
    'The document must exist before adding recipients to it.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to add the recipient to'),
      recipientEmail: z.string().describe('Email address of the recipient'),
      recipientName: z.string().describe('Full name of the recipient')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('ID of the newly added recipient'),
      recipientEmail: z.string().describe('Email address of the recipient'),
      recipientName: z.string().describe('Name of the recipient'),
      documentId: z.string().describe('ID of the document the recipient was added to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let recipient = await client.addRecipient(ctx.input.documentId, {
      email: ctx.input.recipientEmail,
      name: ctx.input.recipientName
    });

    return {
      output: {
        recipientId: recipient.recipientId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        documentId: ctx.input.documentId
      },
      message: `Added recipient **${recipient.name}** (${recipient.email}) to document ${ctx.input.documentId}.`
    };
  })
  .build();
