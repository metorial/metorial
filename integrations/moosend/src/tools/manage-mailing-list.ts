import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

let mailingListOutputSchema = z.object({
  mailingListId: z.string().describe('Mailing list ID'),
  name: z.string().describe('Mailing list name'),
  createdOn: z.string().optional().describe('Creation timestamp'),
  updatedOn: z.string().optional().describe('Last update timestamp'),
  status: z.number().optional().describe('Mailing list status code'),
  activeMemberCount: z.number().optional().describe('Number of active subscribers'),
  bouncedMemberCount: z.number().optional().describe('Number of bounced subscribers'),
  removedMemberCount: z.number().optional().describe('Number of removed subscribers'),
  unsubscribedMemberCount: z.number().optional().describe('Number of unsubscribed members')
});

export let manageMailingList = SlateTool.create(spec, {
  name: 'Manage Mailing List',
  key: 'manage_mailing_list',
  description: `Create, update, or delete mailing lists. Can also retrieve details for a specific list or all lists with optional subscriber statistics.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'get', 'list'])
        .describe('Action to perform'),
      mailingListId: z
        .string()
        .optional()
        .describe('Mailing list ID (required for update, delete, get)'),
      name: z
        .string()
        .optional()
        .describe('Mailing list name (required for create, optional for update)'),
      confirmationPage: z.string().optional().describe('URL displayed after subscription'),
      redirectAfterUnsubscribePage: z
        .string()
        .optional()
        .describe('URL to redirect after unsubscribe'),
      withStatistics: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include subscriber statistics in results (for get/list)'),
      page: z.number().optional().default(1).describe('Page number for listing'),
      pageSize: z.number().optional().default(100).describe('Items per page for listing')
    })
  )
  .output(
    z.object({
      mailingLists: z.array(mailingListOutputSchema).describe('Mailing list(s) returned'),
      action: z.string().describe('Action performed'),
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for creating a mailing list');
        let body: Record<string, unknown> = { Name: ctx.input.name };
        if (ctx.input.confirmationPage) body.ConfirmationPage = ctx.input.confirmationPage;
        if (ctx.input.redirectAfterUnsubscribePage)
          body.RedirectAfterUnsubscribePage = ctx.input.redirectAfterUnsubscribePage;
        let result = await client.createMailingList(body);
        return {
          output: {
            mailingLists: [mapList(result)],
            action,
            success: true
          },
          message: `Created mailing list **${ctx.input.name}**.`
        };
      }
      case 'update': {
        if (!ctx.input.mailingListId)
          throw new Error('mailingListId is required for updating a mailing list');
        let body: Record<string, unknown> = {};
        if (ctx.input.name) body.Name = ctx.input.name;
        if (ctx.input.confirmationPage) body.ConfirmationPage = ctx.input.confirmationPage;
        if (ctx.input.redirectAfterUnsubscribePage)
          body.RedirectAfterUnsubscribePage = ctx.input.redirectAfterUnsubscribePage;
        let result = await client.updateMailingList(ctx.input.mailingListId, body);
        return {
          output: {
            mailingLists: [mapList(result)],
            action,
            success: true
          },
          message: `Updated mailing list **${ctx.input.mailingListId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.mailingListId)
          throw new Error('mailingListId is required for deleting a mailing list');
        await client.deleteMailingList(ctx.input.mailingListId);
        return {
          output: {
            mailingLists: [],
            action,
            success: true
          },
          message: `Permanently deleted mailing list **${ctx.input.mailingListId}**.`
        };
      }
      case 'get': {
        if (!ctx.input.mailingListId)
          throw new Error('mailingListId is required for getting mailing list details');
        let result = await client.getMailingList(
          ctx.input.mailingListId,
          ctx.input.withStatistics
        );
        return {
          output: {
            mailingLists: [mapList(result)],
            action,
            success: true
          },
          message: `Retrieved mailing list **${result?.Name ?? ctx.input.mailingListId}**.`
        };
      }
      case 'list': {
        let result = await client.getMailingLists(
          ctx.input.page,
          ctx.input.pageSize,
          ctx.input.withStatistics
        );
        let lists = (result?.MailingLists as Record<string, unknown>[]) ?? [];
        return {
          output: {
            mailingLists: lists.map(mapList),
            action,
            success: true
          },
          message: `Retrieved **${lists.length}** mailing list(s).`
        };
      }
    }
  })
  .build();

let mapList = (l: Record<string, unknown>) => ({
  mailingListId: String(l?.ID ?? ''),
  name: String(l?.Name ?? ''),
  createdOn: l?.CreatedOn ? String(l.CreatedOn) : undefined,
  updatedOn: l?.UpdatedOn ? String(l.UpdatedOn) : undefined,
  status: l?.Status as number | undefined,
  activeMemberCount: l?.ActiveMemberCount as number | undefined,
  bouncedMemberCount: l?.BouncedMemberCount as number | undefined,
  removedMemberCount: l?.RemovedMemberCount as number | undefined,
  unsubscribedMemberCount: l?.UnsubscribedMemberCount as number | undefined
});
