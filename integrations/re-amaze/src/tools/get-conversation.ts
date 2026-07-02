import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve a single conversation by its slug identifier, including its full message history, tags, assignee, and customer information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationSlug: z.string().describe('The unique slug identifier of the conversation')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Unique conversation slug'),
      subject: z.string().nullable().describe('Conversation subject'),
      status: z
        .number()
        .describe('Status code: 0=Open, 1=Responded, 2=Done, 3=Spam, 4=Archived, 5=On Hold'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      tagList: z.array(z.string()).describe('Tags applied to the conversation'),
      messageBody: z.string().nullable().optional().describe('Initial message body'),
      lastCustomerMessage: z
        .any()
        .optional()
        .describe('Latest customer message with timestamp'),
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
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.getConversation(ctx.input.conversationSlug);
    let c = result.conversation || result;

    return {
      output: {
        slug: c.slug,
        subject: c.subject,
        status: c.status,
        createdAt: c.created_at,
        tagList: c.tag_list || [],
        messageBody: c.message,
        lastCustomerMessage: c.last_customer_message,
        author: c.author ? { name: c.author.name, email: c.author.email } : undefined,
        assignee: c.assignee,
        channelName: c.category?.name,
        channelSlug: c.category?.slug
      },
      message: `Retrieved conversation **${c.subject || c.slug}** (status: ${c.status}).`
    };
  })
  .build();
