import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { mapList, optionalNumber, record, records, text } from '../lib/data';
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
    destructive: true,
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
      pageSize: z.number().optional().default(100).describe('Items per page for listing'),
      preferences: z
        .object({
          selectType: z.enum(['SingleSelect', 'MultiSelect']),
          options: z.array(z.string()).max(10),
          isRequired: z.boolean().optional()
        })
        .optional()
        .describe(
          'Preference choices for create/update; omitted update preferences are preserved'
        )
    })
  )
  .output(
    z.object({
      mailingLists: z.array(mailingListOutputSchema).describe('Mailing list(s) returned'),
      action: z.string().describe('Action performed'),
      success: z.boolean().describe('Whether the action completed successfully'),
      totalCount: z.number().optional().describe('Total lists reported by the provider'),
      currentPage: z.number().optional().describe('Current page'),
      returnedCount: z.number().optional().describe('Number of lists in this result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name)
          throw createApiServiceError('name is required for creating a mailing list');
        let body: Record<string, unknown> = { Name: text(ctx.input.name, 'list name') };
        if (ctx.input.preferences)
          body.Preferences = {
            SelectType: ctx.input.preferences.selectType,
            Options: ctx.input.preferences.options,
            ...(ctx.input.preferences.isRequired !== undefined
              ? { IsRequired: ctx.input.preferences.isRequired }
              : {})
          };
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
          throw createApiServiceError('mailingListId is required for updating a mailing list');
        let body: Record<string, unknown> = {};
        if (ctx.input.name !== undefined) body.Name = text(ctx.input.name, 'list name');
        if (ctx.input.preferences)
          body.Preferences = {
            SelectType: ctx.input.preferences.selectType,
            Options: ctx.input.preferences.options,
            ...(ctx.input.preferences.isRequired !== undefined
              ? { IsRequired: ctx.input.preferences.isRequired }
              : {})
          };
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
          throw createApiServiceError('mailingListId is required for deleting a mailing list');
        await client.deleteMailingList(ctx.input.mailingListId);
        return {
          output: {
            mailingLists: [],
            action,
            success: true
          },
          message: `Deleted mailing list **${ctx.input.mailingListId}**; retained provider history may remain.`
        };
      }
      case 'get': {
        if (!ctx.input.mailingListId)
          throw createApiServiceError(
            'mailingListId is required for getting mailing list details'
          );
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
        let lists = records(result.MailingLists, 'mailing lists');
        return {
          output: {
            mailingLists: lists.map(mapList),
            returnedCount: lists.length,
            totalCount:
              result.Paging == null
                ? undefined
                : optionalNumber(record(result.Paging).TotalResults),
            currentPage: ctx.input.page,
            action,
            success: true
          },
          message: `Retrieved **${lists.length}** mailing list(s).`
        };
      }
    }
  })
  .build();
