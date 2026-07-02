import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Influencer Lists',
  key: 'manage_lists',
  description: `Organize influencers into lists for campaign planning. Supports retrieving all lists, viewing list contents, adding influencers to lists, and removing influencers from lists.`,
  instructions: [
    'Use action "get_all" to retrieve all your lists.',
    'Use action "get_reports" to get influencer reports within a specific list.',
    'Use action "add" to add an influencer to a list.',
    'Use action "remove" to remove an influencer from a list. Cannot remove from list ID 0 (default "Recent Searches").'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get_all', 'get_reports', 'add', 'remove'])
        .describe('Operation to perform'),
      listId: z
        .number()
        .optional()
        .describe('List ID (required for get_reports, add, and remove)'),
      channelId: z.string().optional().describe('Channel/user ID of the influencer to add'),
      socialNetwork: z
        .enum(['instagram', 'youtube', 'tiktok', 'twitter', 'twitch', 'snapchat'])
        .optional()
        .describe('Social network of the influencer (required for add)'),
      reportId: z
        .number()
        .optional()
        .describe('Report ID to remove (required for remove action)'),
      limit: z.number().optional().describe('Number of results per page (for get_reports)'),
      offset: z.number().optional().describe('Pagination offset (for get_reports)')
    })
  )
  .output(
    z.object({
      lists: z.array(z.any()).optional().describe('Array of lists (for get_all)'),
      reports: z
        .array(z.any())
        .optional()
        .describe('Array of influencer reports in the list (for get_reports)'),
      success: z.boolean().optional().describe('Whether the add/remove operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let { action, listId, channelId, socialNetwork, reportId, limit, offset } = ctx.input;

    switch (action) {
      case 'get_all': {
        let response = await client.getLists();
        let lists = response?.result ?? [];
        return {
          output: { lists: Array.isArray(lists) ? lists : [lists] },
          message: `Retrieved **${Array.isArray(lists) ? lists.length : 1}** list(s).`
        };
      }

      case 'get_reports': {
        if (listId === undefined) throw new Error('listId is required for get_reports action');
        let response = await client.getListReports(listId, limit, offset);
        let reports = response?.result ?? [];
        return {
          output: { reports: Array.isArray(reports) ? reports : [] },
          message: `Retrieved reports from list **${listId}**.`
        };
      }

      case 'add': {
        if (listId === undefined) throw new Error('listId is required for add action');
        if (!channelId) throw new Error('channelId is required for add action');
        if (!socialNetwork) throw new Error('socialNetwork is required for add action');
        await client.addToList(listId, channelId, socialNetwork);
        return {
          output: { success: true },
          message: `Added **${channelId}** (${socialNetwork}) to list **${listId}**.`
        };
      }

      case 'remove': {
        if (listId === undefined) throw new Error('listId is required for remove action');
        if (reportId === undefined) throw new Error('reportId is required for remove action');
        await client.removeFromList(reportId, listId);
        return {
          output: { success: true },
          message: `Removed report **${reportId}** from list **${listId}**.`
        };
      }
    }
  })
  .build();
