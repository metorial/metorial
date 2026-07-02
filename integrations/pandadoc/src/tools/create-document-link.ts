import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let createDocumentLink = SlateTool.create(spec, {
  name: 'Create Document Link',
  key: 'create_document_link',
  description: `Create a shareable or embeddable session link for a PandaDoc document, targeted at a specific recipient. The link can be used for embedded signing or direct sharing.`,
  instructions: [
    "The recipient email must match one of the document's existing recipients.",
    'The link expires after the specified lifetime (default: 3600 seconds / 1 hour).'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to create a link for'),
      recipientEmail: z.string().describe('Email of the recipient to create the link for'),
      lifetime: z.number().optional().describe('Link lifetime in seconds (default: 3600)')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session ID for the link'),
      sessionUrl: z.string().describe('Full URL of the document session link'),
      expiresAt: z.string().optional().describe('When the link expires')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.createDocumentLink(ctx.input.documentId, {
      recipient: ctx.input.recipientEmail,
      lifetime: ctx.input.lifetime
    });

    return {
      output: {
        sessionId: result.id,
        sessionUrl: result.url || `https://app.pandadoc.com/s/${result.id}`,
        expiresAt: result.expires_at
      },
      message: `Created document link for **${ctx.input.recipientEmail}**: ${result.url || `https://app.pandadoc.com/s/${result.id}`}`
    };
  })
  .build();
