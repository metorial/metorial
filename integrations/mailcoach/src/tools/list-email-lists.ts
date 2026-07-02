import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailListSchema = z.object({
  emailListUuid: z.string().describe('Unique identifier of the email list'),
  name: z.string().describe('Name of the email list'),
  activeSubscribersCount: z.number().describe('Number of active subscribers'),
  defaultFromEmail: z.string().describe('Default sender email address'),
  defaultFromName: z.string().nullable().describe('Default sender name'),
  defaultReplyToEmail: z.string().nullable().describe('Default reply-to email'),
  defaultReplyToName: z.string().nullable().describe('Default reply-to name'),
  allowFormSubscriptions: z.boolean().describe('Whether form subscriptions are allowed'),
  requiresConfirmation: z.boolean().describe('Whether double opt-in confirmation is required'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listEmailLists = SlateTool.create(spec, {
  name: 'List Email Lists',
  key: 'list_email_lists',
  description: `Retrieve email lists (mailing lists) from Mailcoach. Supports searching by name and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter email lists by name'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      emailLists: z.array(emailListSchema).describe('List of email lists'),
      totalCount: z.number().describe('Total number of email lists matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.listEmailLists({
      search: ctx.input.search,
      page: ctx.input.page
    });

    let emailLists = (result.data || []).map((list: any) => ({
      emailListUuid: list.uuid,
      name: list.name,
      activeSubscribersCount: list.active_subscribers_count ?? 0,
      defaultFromEmail: list.default_from_email,
      defaultFromName: list.default_from_name ?? null,
      defaultReplyToEmail: list.default_reply_to_email ?? null,
      defaultReplyToName: list.default_reply_to_name ?? null,
      allowFormSubscriptions: list.allow_form_subscriptions ?? false,
      requiresConfirmation: list.requires_confirmation ?? false,
      createdAt: list.created_at,
      updatedAt: list.updated_at
    }));

    return {
      output: {
        emailLists,
        totalCount: result.meta?.total ?? emailLists.length
      },
      message: `Found **${emailLists.length}** email list(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  });
