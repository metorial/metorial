import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let createEmailMessage = SlateTool.create(spec, {
  name: 'Create Email Message',
  key: 'create_email_message',
  description: `Create an email message (campaign letter) without sending it. The message can later be sent using the **Launch Campaign** tool.
Supports HTML body, text body auto-generation, tagging, and scheduling for autoresponder series.`,
  instructions: [
    'After creating a message, use the Launch Campaign tool with the returned messageId to actually send it.'
  ]
})
  .input(
    z.object({
      senderName: z.string().describe('Display name of the sender'),
      senderEmail: z.string().describe('Email address of the sender (must be verified)'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('HTML body of the email'),
      listId: z.number().describe('ID of the contact list to associate with this message'),
      textBody: z.string().optional().describe('Plain text version of the email body'),
      generateText: z.boolean().optional().describe('Auto-generate plain text body from HTML'),
      tag: z.string().optional().describe('Tag for the message'),
      messageLang: z
        .string()
        .optional()
        .describe('Language for the message (e.g., "en", "ru", "de")'),
      seriesDay: z.number().optional().describe('Day number for autoresponder series (1-365)'),
      seriesTime: z.string().optional().describe('Time for series delivery (HH:MM format)'),
      wrapType: z
        .enum(['skip', 'right', 'left', 'center'])
        .optional()
        .describe('Text wrapping mode'),
      categories: z.string().optional().describe('Comma-separated category IDs')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the created email message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let result = await client.createEmailMessage({
      sender_name: ctx.input.senderName,
      sender_email: ctx.input.senderEmail,
      subject: ctx.input.subject,
      body: ctx.input.body,
      list_id: ctx.input.listId,
      text_body: ctx.input.textBody,
      generate_text: ctx.input.generateText ? 1 : 0,
      tag: ctx.input.tag,
      lang: ctx.input.messageLang,
      series_day: ctx.input.seriesDay,
      series_time: ctx.input.seriesTime,
      wrap_type: ctx.input.wrapType,
      categories: ctx.input.categories
    });

    return {
      output: { messageId: result.message_id },
      message: `Created email message **"${ctx.input.subject}"** with ID \`${result.message_id}\``
    };
  })
  .build();
