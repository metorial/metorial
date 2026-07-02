import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listResourcesTool = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description: `List resources across ChatBotKit: bots, conversations, datasets, skillsets, contacts, memories, integrations, files, spaces, secrets, tasks, or blueprints. Supports cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum([
          'bots',
          'conversations',
          'datasets',
          'skillsets',
          'contacts',
          'memories',
          'integrations',
          'files',
          'spaces',
          'secrets',
          'tasks',
          'blueprints'
        ])
        .describe('Type of resource to list'),
      cursor: z.string().optional().describe('Pagination cursor for next page'),
      take: z.number().optional().describe('Number of items to return'),
      order: z.enum(['desc', 'asc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('List of resources'),
      cursor: z.string().optional().describe('Cursor for next page (if more results exist)'),
      count: z.number().describe('Number of items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let { resourceType, cursor, take, order } = ctx.input;
    let params = { cursor, take, order };

    let result: { items: any[]; cursor?: string };

    switch (resourceType) {
      case 'bots':
        result = await client.listBots(params);
        break;
      case 'conversations':
        result = await client.listConversations(params);
        break;
      case 'datasets':
        result = await client.listDatasets(params);
        break;
      case 'skillsets':
        result = await client.listSkillsets(params);
        break;
      case 'contacts':
        result = await client.listContacts(params);
        break;
      case 'memories':
        result = await client.listMemories(params);
        break;
      case 'integrations':
        result = await client.listIntegrations(params);
        break;
      case 'files':
        result = await client.listFiles(params);
        break;
      case 'spaces':
        result = await client.listSpaces(params);
        break;
      case 'secrets':
        result = await client.listSecrets(params);
        break;
      case 'tasks':
        result = await client.listTasks(params);
        break;
      case 'blueprints':
        result = await client.listBlueprints(params);
        break;
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }

    return {
      output: {
        items: result.items,
        cursor: result.cursor,
        count: result.items.length
      },
      message: `Listed **${result.items.length}** ${resourceType}.${result.cursor ? ' More results available with cursor.' : ''}`
    };
  })
  .build();
