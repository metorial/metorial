import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { conversationStatusDescription, mapAssignee, mapPerson } from '../lib/conversations';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve a conversation summary by slug, reference ID, or origin ID, including the initial message, latest customer and staff messages, tags, assignee, and customer information. Use list_messages to retrieve the message history.`,
  instructions: ['Origin ID lookups require a category (channel slug).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationSlug: z
        .string()
        .describe('Conversation slug, or the identifier selected by idType'),
      idType: z
        .enum(['ref', 'origin'])
        .optional()
        .describe('Look up by reference ID or origin ID instead of slug'),
      category: z
        .string()
        .optional()
        .describe('Channel slug; required for an origin ID lookup'),
      channel: z.string().optional().describe('Optional channel type for an origin ID lookup')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Unique conversation slug'),
      subject: z.string().nullable().describe('Conversation subject'),
      status: z.number().describe(conversationStatusDescription),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      tagList: z.array(z.string()).describe('Tags applied to the conversation'),
      messageBody: z.string().nullable().optional().describe('Initial message body'),
      lastCustomerMessage: z
        .any()
        .optional()
        .describe('Latest customer message with timestamp'),
      lastStaffMessage: z
        .object({
          body: z.string().nullable().optional(),
          createdAt: z.string().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Latest staff message with timestamp'),
      author: z
        .object({
          name: z.string().nullable().optional(),
          email: z.string().nullable().optional()
        })
        .optional()
        .describe('Customer who started the conversation'),
      assignee: z.string().nullable().optional().describe('Assigned staff member'),
      channelName: z.string().nullable().optional().describe('Channel name'),
      channelSlug: z.string().nullable().optional().describe('Channel slug')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.idType === 'origin' && !ctx.input.category) {
      throw createApiServiceError(
        'Provide category (the channel slug) when looking up a conversation by origin ID.'
      );
    }

    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.getConversation(ctx.input.conversationSlug, {
      idType: ctx.input.idType,
      category: ctx.input.category,
      channel: ctx.input.channel
    });
    let c = result.conversation || result;

    return {
      output: {
        slug: c.slug,
        subject: c.subject,
        status: c.status,
        createdAt: c.created_at,
        tagList: c.tag_list || [],
        messageBody:
          typeof c.message === 'string' || c.message === null ? c.message : c.message?.body,
        lastCustomerMessage: c.last_customer_message,
        lastStaffMessage: c.last_staff_message
          ? { body: c.last_staff_message.body, createdAt: c.last_staff_message.created_at }
          : c.last_staff_message,
        author: mapPerson(c.author),
        assignee: mapAssignee(c.assignee),
        channelName: c.category?.name,
        channelSlug: c.category?.slug
      },
      message: `Retrieved conversation **${c.subject || c.slug}** (status: ${c.status}).`
    };
  })
  .build();
