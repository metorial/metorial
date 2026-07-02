import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listActions = SlateTool.create(spec, {
  name: 'List Actions',
  key: 'list_actions',
  description: `Retrieve available actions (triggers, searches, and write actions) for a specific Zapier app. Each action represents an operation that can be used as a step in a Zap.
Filter by action type to find triggers (READ), searches (SEARCH), or write actions (WRITE).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('App UUID from the /v2/apps endpoint'),
      actionType: z
        .enum(['READ', 'READ_BULK', 'SEARCH', 'SEARCH_AND_WRITE', 'SEARCH_OR_WRITE', 'WRITE'])
        .optional()
        .describe(
          'Filter by action type. READ = triggers, WRITE = actions, SEARCH = searches.'
        )
    })
  )
  .output(
    z.object({
      actions: z.array(
        z.object({
          actionId: z.string().describe('Unstable action identifier (use for API calls)'),
          key: z.string().describe('Stable developer-provided action key'),
          appId: z.string().describe('Associated app ID'),
          actionType: z.string().describe('Action type: READ, READ_BULK, WRITE, SEARCH, etc.'),
          isInstant: z.boolean().describe('Whether this is an instant trigger'),
          title: z.string().describe('Action title'),
          description: z.string().describe('Detailed action description')
        })
      ),
      totalCount: z.number().describe('Total number of matching actions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getActions({
      app: ctx.input.appId,
      actionType: ctx.input.actionType
    });

    let actions = response.data.map(action => ({
      actionId: action.id,
      key: action.key,
      appId: action.app,
      actionType: action.actionType,
      isInstant: action.isInstant,
      title: action.title,
      description: action.description
    }));

    return {
      output: {
        actions,
        totalCount: response.meta.count
      },
      message: `Found **${response.meta.count}** action(s) for app \`${ctx.input.appId}\`${ctx.input.actionType ? ` of type ${ctx.input.actionType}` : ''}. Returned ${actions.length} result(s).`
    };
  })
  .build();
