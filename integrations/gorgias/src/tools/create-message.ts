import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createMessage = SlateTool.create(spec, {
  name: 'Create Message',
  key: 'create_message',
  description: `Add a new message to an existing ticket. Can create customer replies, agent responses, or internal notes. Supports HTML and plain text content.`,
  instructions: [
    'Set fromAgent to true for agent replies and internal notes.',
    'Set fromAgent to false for customer messages.',
    'Internal notes are agent messages that are not visible to the customer — use the "internal" channel for notes.'
  ]
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to add the message to'),
      channel: z
        .enum(['api', 'email', 'chat', 'phone', 'sms', 'internal'])
        .default('api')
        .describe('Message channel'),
      fromAgent: z.boolean().describe('Whether this message is from an agent'),
      senderEmail: z.string().optional().describe('Email of the message sender'),
      receiverEmail: z
        .string()
        .optional()
        .describe(
          'Customer receiver email for outgoing public messages; omit for incoming messages and internal notes'
        ),
      sourceFromAddress: z
        .string()
        .optional()
        .describe(
          'Email routing sender address; outgoing email must use a connected Gorgias email integration'
        ),
      sourceToAddress: z
        .string()
        .optional()
        .describe(
          'Email routing recipient address; incoming email can target your connected support mailbox'
        ),
      subject: z.string().optional().describe('Message subject line'),
      bodyHtml: z.string().optional().describe('HTML body of the message'),
      bodyText: z.string().optional().describe('Plain text body of the message'),
      attachments: z
        .array(
          z.object({
            url: z.string().describe('URL of the attachment'),
            name: z.string().optional().describe('File name'),
            contentType: z.string().optional().describe('MIME type'),
            size: z.number().optional().describe('File size in bytes')
          })
        )
        .optional()
        .describe('File attachments')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the created message'),
      ticketId: z.number().describe('ID of the ticket'),
      channel: z.string().nullable().describe('Message channel'),
      fromAgent: z.boolean().describe('Whether the message is from an agent'),
      createdDatetime: z.string().nullable().describe('When the message was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.channel === 'internal' && !ctx.input.fromAgent) {
      throw createApiServiceError('Internal notes require fromAgent=true.');
    }
    if (
      ctx.input.receiverEmail &&
      (!ctx.input.fromAgent || ctx.input.channel === 'internal')
    ) {
      throw createApiServiceError(
        'Omit receiverEmail for incoming messages and internal notes.'
      );
    }
    let sender = ctx.input.senderEmail
      ? { email: ctx.input.senderEmail }
      : ctx.input.fromAgent
        ? { id: (await client.getUser(0)).id }
        : undefined;
    if (!sender) {
      throw createApiServiceError('Provide senderEmail for a customer message.');
    }
    let messageData: any = {
      channel: ctx.input.channel === 'internal' ? 'internal-note' : ctx.input.channel,
      via: 'api',
      sender,
      public: ctx.input.channel !== 'internal',
      from_agent: ctx.input.fromAgent,
      body_html: ctx.input.bodyHtml,
      body_text: ctx.input.bodyText,
      stripped_text: ctx.input.bodyText,
      subject: ctx.input.subject
    };

    if (ctx.input.receiverEmail) {
      messageData.receiver = { email: ctx.input.receiverEmail };
    }

    if (ctx.input.channel === 'email') {
      let fromAddress = ctx.input.sourceFromAddress || ctx.input.senderEmail;
      if (!fromAddress || (!ctx.input.receiverEmail && !ctx.input.sourceToAddress)) {
        throw createApiServiceError(
          'Email messages require routing sender and recipient addresses. Use a connected Gorgias email integration as the outgoing sender address.'
        );
      }
      let toAddress = ctx.input.sourceToAddress || ctx.input.receiverEmail;
      messageData.source = {
        from: { address: fromAddress },
        to: toAddress ? [{ address: toAddress }] : []
      };
    }

    if (ctx.input.attachments && ctx.input.attachments.length > 0) {
      messageData.attachments = ctx.input.attachments.map(a => ({
        url: a.url,
        name: a.name,
        content_type: a.contentType,
        size: a.size
      }));
    }

    let message = await client.createMessage(ctx.input.ticketId, messageData);

    return {
      output: {
        messageId: message.id,
        ticketId: ctx.input.ticketId,
        channel: message.channel || null,
        fromAgent: message.from_agent || false,
        createdDatetime: message.created_datetime || null
      },
      message: `Created message **#${message.id}** in ticket **#${ctx.input.ticketId}** (${ctx.input.fromAgent ? 'agent' : 'customer'} message via ${ctx.input.channel}).`
    };
  })
  .build();
