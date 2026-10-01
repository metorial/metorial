import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  conversationStatusDescription,
  validateHoldUntil,
  validateSuppressSurveys
} from '../lib/conversations';
import { spec } from '../spec';

export let createConversation = SlateTool.create(spec, {
  name: 'Create Conversation',
  key: 'create_conversation',
  description: `Create a new support conversation with a subject, message body, customer info, and channel assignment. Optionally set tags, status, and staff assignment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Conversation subject line'),
      channelSlug: z
        .string()
        .describe(
          'Channel slug that accepts API-created conversations, such as an email support channel'
        ),
      messageBody: z.string().describe('The initial message body (supports markdown)'),
      recipients: z
        .array(z.string())
        .optional()
        .describe('Email addresses or phone numbers for message recipients'),
      customerName: z.string().describe('Customer name'),
      customerEmail: z.string().describe('Customer email address'),
      customerData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom attributes for the customer (one level deep key-value pairs)'),
      tagList: z.array(z.string()).optional().describe('Tags to apply to the conversation'),
      status: z.number().optional().describe(conversationStatusDescription),
      holdUntil: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp with a timezone for when On Hold expires; requires status 5'
        ),
      assigneeEmail: z.string().optional().describe('Email of the staff member to assign'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field key-value pairs for the conversation'),
      suppressNotifications: z
        .boolean()
        .optional()
        .describe('Prevent email/integration notifications'),
      suppressAutoresolve: z
        .boolean()
        .optional()
        .describe('Prevent automatic resolution when a staff user sends the initial message'),
      suppressSurveys: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe(
          'true prevents satisfaction surveys; a YYYY-MM-DD date suppresses surveys before that date'
        ),
      attachmentUrl: z.string().optional().describe('URL of a file to attach'),
      attachmentUrls: z
        .array(z.string())
        .optional()
        .describe('URLs of multiple files to attach')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Unique slug of the created conversation'),
      subject: z.string().nullable().describe('Conversation subject'),
      status: z.number().describe('Status code'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    validateHoldUntil(ctx.input.status, ctx.input.holdUntil, { requireStatus: true });
    validateSuppressSurveys(ctx.input.suppressSurveys);

    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.createConversation({
      subject: ctx.input.subject,
      category: ctx.input.channelSlug,
      message: {
        body: ctx.input.messageBody,
        recipients: ctx.input.recipients,
        suppressNotifications: ctx.input.suppressNotifications,
        suppressAutoresolve: ctx.input.suppressAutoresolve,
        suppressSurveys: ctx.input.suppressSurveys,
        attachment: ctx.input.attachmentUrl,
        attachments: ctx.input.attachmentUrls
      },
      user: {
        name: ctx.input.customerName,
        email: ctx.input.customerEmail,
        data: ctx.input.customerData
      },
      tagList: ctx.input.tagList,
      status: ctx.input.status,
      holdUntil: ctx.input.holdUntil,
      assignee: ctx.input.assigneeEmail,
      data: ctx.input.customFields
    });

    let c = result.conversation || result;

    return {
      output: {
        slug: c.slug,
        subject: c.subject,
        status: c.status,
        createdAt: c.created_at
      },
      message: `Created conversation **${c.subject || c.slug}**.`
    };
  })
  .build();
