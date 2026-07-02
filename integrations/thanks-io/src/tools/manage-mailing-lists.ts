import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let manageMailingLists = SlateTool.create(spec, {
  name: 'Manage Mailing Lists',
  key: 'manage_mailing_lists',
  description: `Create, list, retrieve, or delete mailing lists. Also supports listing recipients within a mailing list with optional date filtering.
Mailing lists organize recipients for targeted mail campaigns and can be associated with sub-accounts.`,
  instructions: [
    'Set action to "list", "create", "get", "delete", or "list_recipients".',
    'For "create", provide a description for the mailing list.',
    'For "get", "delete", or "list_recipients", provide the mailingListId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'delete', 'list_recipients'])
        .describe('Action to perform'),
      mailingListId: z
        .number()
        .optional()
        .describe('Mailing list ID (for get, delete, list_recipients)'),
      description: z
        .string()
        .optional()
        .describe('Mailing list name/description (for create)'),
      subAccountId: z.number().optional().describe('Sub-account ID to associate (for create)'),
      qrcodeUrl: z.string().optional().describe('Default QR code URL (for create)'),
      itemsPerPage: z.number().optional().describe('Items per page (for list)'),
      recipientLimit: z
        .number()
        .optional()
        .describe('Max recipients to return (for list_recipients, max 10000)'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only recipients updated since this date (YYYY-MM-DD HH:MM:SS)')
    })
  )
  .output(
    z.object({
      mailingListId: z.number().optional().describe('Mailing list ID'),
      mailingListDescription: z
        .string()
        .optional()
        .nullable()
        .describe('Mailing list description'),
      mailingLists: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of mailing lists'),
      recipients: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of recipients'),
      totalCount: z.number().optional().describe('Total count of results'),
      deleted: z.boolean().optional().describe('Whether the mailing list was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listMailingLists({
        itemsPerPage: ctx.input.itemsPerPage
      });
      let data = (result.data || []) as Record<string, unknown>[];
      let meta = result.meta as Record<string, unknown> | undefined;
      return {
        output: {
          mailingLists: data,
          totalCount: meta?.total as number | undefined
        },
        message: `Found **${meta?.total || data.length}** mailing list(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.description) throw new Error('description is required for create action');
      let result = await client.createMailingList({
        description: ctx.input.description,
        subAccountId: ctx.input.subAccountId,
        qrcodeUrl: ctx.input.qrcodeUrl
      });
      return {
        output: {
          mailingListId: result.id as number,
          mailingListDescription: result.description as string
        },
        message: `Created mailing list **#${result.id}**: "${result.description}".`
      };
    }

    if (action === 'get') {
      if (!ctx.input.mailingListId)
        throw new Error('mailingListId is required for get action');
      let result = await client.getMailingList(ctx.input.mailingListId);
      return {
        output: {
          mailingListId: result.id as number,
          mailingListDescription: result.description as string | null
        },
        message: `Retrieved mailing list **#${result.id}**: "${result.description}".`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.mailingListId)
        throw new Error('mailingListId is required for delete action');
      await client.deleteMailingList(ctx.input.mailingListId);
      return {
        output: {
          mailingListId: ctx.input.mailingListId,
          deleted: true
        },
        message: `Deleted mailing list **#${ctx.input.mailingListId}**.`
      };
    }

    if (action === 'list_recipients') {
      if (!ctx.input.mailingListId)
        throw new Error('mailingListId is required for list_recipients action');
      let result = await client.listMailingListRecipients(ctx.input.mailingListId, {
        limit: ctx.input.recipientLimit,
        updatedSince: ctx.input.updatedSince
      });
      let data = (result.data || []) as Record<string, unknown>[];
      let meta = result.meta as Record<string, unknown> | undefined;
      return {
        output: {
          mailingListId: ctx.input.mailingListId,
          recipients: data,
          totalCount: meta?.total as number | undefined
        },
        message: `Found **${meta?.total || data.length}** recipient(s) in mailing list **#${ctx.input.mailingListId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
