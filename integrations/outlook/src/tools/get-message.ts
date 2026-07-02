import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Email',
  key: 'get_message',
  description: `Retrieve the full details of a specific email message by its ID, including the complete body content, all recipients, and attachment metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().describe('The ID of the message to retrieve')
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      subject: z.string().optional(),
      bodyContentType: z.string().optional(),
      bodyContent: z.string().optional(),
      bodyPreview: z.string().optional(),
      fromAddress: z.string().optional(),
      fromName: z.string().optional(),
      toRecipients: z
        .array(
          z.object({
            address: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      ccRecipients: z
        .array(
          z.object({
            address: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      bccRecipients: z
        .array(
          z.object({
            address: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      receivedDateTime: z.string().optional(),
      sentDateTime: z.string().optional(),
      isRead: z.boolean().optional(),
      isDraft: z.boolean().optional(),
      importance: z.string().optional(),
      hasAttachments: z.boolean().optional(),
      conversationId: z.string().optional(),
      parentFolderId: z.string().optional(),
      webLink: z.string().optional(),
      categories: z.array(z.string()).optional(),
      flagStatus: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let msg = await client.getMessage(ctx.input.messageId);

    let mapRecipients = (
      recipients?: { emailAddress: { address: string; name?: string } }[]
    ) =>
      recipients?.map(r => ({ address: r.emailAddress.address, name: r.emailAddress.name }));

    return {
      output: {
        messageId: msg.id,
        subject: msg.subject,
        bodyContentType: msg.body?.contentType,
        bodyContent: msg.body?.content,
        bodyPreview: msg.bodyPreview,
        fromAddress: msg.from?.emailAddress?.address,
        fromName: msg.from?.emailAddress?.name,
        toRecipients: mapRecipients(msg.toRecipients),
        ccRecipients: mapRecipients(msg.ccRecipients),
        bccRecipients: mapRecipients(msg.bccRecipients),
        receivedDateTime: msg.receivedDateTime,
        sentDateTime: msg.sentDateTime,
        isRead: msg.isRead,
        isDraft: msg.isDraft,
        importance: msg.importance,
        hasAttachments: msg.hasAttachments,
        conversationId: msg.conversationId,
        parentFolderId: msg.parentFolderId,
        webLink: msg.webLink,
        categories: msg.categories,
        flagStatus: msg.flag?.flagStatus
      },
      message: `Retrieved email **"${msg.subject || '(no subject)'}"** from ${msg.from?.emailAddress?.address || 'unknown sender'}.`
    };
  })
  .build();
