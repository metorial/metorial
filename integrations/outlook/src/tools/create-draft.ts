import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  emailAddress: z.object({
    name: z.string().optional().describe('Display name of the recipient'),
    address: z.string().describe('Email address of the recipient')
  })
});

export let createDraft = SlateTool.create(spec, {
  name: 'Create Draft',
  key: 'create_draft',
  description: `Create a draft email message in the Drafts folder. The draft can later be sent using the **Manage Email** tool or edited further. Useful for composing messages that need review before sending.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().optional().describe('Subject line of the draft'),
      bodyContent: z.string().optional().describe('Body content of the draft'),
      bodyContentType: z
        .enum(['text', 'html'])
        .default('html')
        .describe('Content type of the body'),
      toRecipients: z.array(recipientSchema).optional().describe('Primary recipients'),
      ccRecipients: z.array(recipientSchema).optional().describe('CC recipients'),
      bccRecipients: z.array(recipientSchema).optional().describe('BCC recipients'),
      importance: z.enum(['low', 'normal', 'high']).optional().describe('Importance level')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the created draft'),
      webLink: z.string().optional().describe('Web link to open the draft in Outlook')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let draft = await client.createDraft({
      subject: ctx.input.subject,
      body: ctx.input.bodyContent
        ? {
            contentType: ctx.input.bodyContentType,
            content: ctx.input.bodyContent
          }
        : undefined,
      toRecipients: ctx.input.toRecipients,
      ccRecipients: ctx.input.ccRecipients,
      bccRecipients: ctx.input.bccRecipients,
      importance: ctx.input.importance
    });

    return {
      output: {
        messageId: draft.id,
        webLink: draft.webLink
      },
      message: `Draft **"${ctx.input.subject || '(no subject)'}"** created.`
    };
  })
  .build();
