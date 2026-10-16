import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, requireValue, responseList } from '../lib/response';
import { spec } from '../spec';

export let manageConversation = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Perform actions on a Gist conversation: assign/unassign, close, snooze/unsnooze, prioritize, or tag/untag. Use this to manage conversation state and routing.`,
  instructions: [
    'Only one action can be performed per invocation. Choose the appropriate action field.'
  ]
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation'),
      action: z
        .enum([
          'assign',
          'unassign',
          'close',
          'snooze',
          'unsnooze',
          'prioritize',
          'tag',
          'untag'
        ])
        .describe('Action to perform'),
      teammateId: z
        .string()
        .optional()
        .describe(
          'Acting teammate ID, required for assign/unassign. Call list_teams to discover teammates.'
        ),
      assigneeId: z
        .string()
        .optional()
        .describe('Teammate ID to assign to (for "assign" action)'),
      teamId: z.string().optional().describe('Team ID to assign to (for "assign" action)'),
      snoozedUntil: z
        .string()
        .optional()
        .describe('UNIX timestamp to snooze until (for "snooze" action)'),
      priority: z
        .enum(['low', 'medium', 'high', 'urgent', 'priority', 'not_priority'])
        .optional()
        .describe(
          'Use priority or not_priority. Legacy low/medium/high/urgent values remain accepted by the schema but are unsupported by Gist.'
        ),
      tagId: z
        .string()
        .optional()
        .describe('Tag ID for untag. Call manage_tags with action list to discover tags.'),
      tagName: z.string().optional().describe('Tag name (for tag or untag action)')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      conversationId: z.string().describe('Conversation ID'),
      actionPerformed: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });
    let { conversationId, action } = ctx.input;

    switch (action) {
      case 'assign': {
        let assignData = {
          teammate_id: requireValue(ctx.input.teammateId, 'teammateId'),
          assignee_id: requireValue(
            ctx.input.teamId ?? ctx.input.assigneeId,
            'teamId or assigneeId'
          ),
          assignee_type: ctx.input.teamId ? 'team' : 'teammate'
        };
        await client.assignConversation(conversationId, assignData);
        break;
      }
      case 'unassign':
        await client.unassignConversation(
          conversationId,
          requireValue(ctx.input.teammateId, 'teammateId')
        );
        break;
      case 'close':
        await client.closeConversation(conversationId);
        break;
      case 'snooze':
        requireValue(ctx.input.snoozedUntil, 'snoozedUntil');
        await client.snoozeConversation(conversationId, {
          snoozed_until: ctx.input.snoozedUntil
        });
        break;
      case 'unsnooze':
        await client.unsnoozeConversation(conversationId);
        break;
      case 'prioritize':
        if (!ctx.input.priority || !['priority', 'not_priority'].includes(ctx.input.priority))
          throw createApiServiceError(
            'Gist supports only priority or not_priority; select one of these values.'
          );
        await client.prioritizeConversation(conversationId, { priority: ctx.input.priority });
        break;
      case 'tag':
        if (!ctx.input.tagName)
          throw createApiServiceError('tagName is required for tag action');
        await client.tagConversation(conversationId, ctx.input.tagName);
        break;
      case 'untag':
        {
          let tagId = ctx.input.tagId;
          if (!tagId) {
            let name = requireValue(ctx.input.tagName, 'tagId or tagName');
            for (let page = 1; page <= 100; page++) {
              let data = await client.listTags({ page, per_page: 60 });
              let tag = responseList(data.tags).find(
                value =>
                  typeof value.name === 'string' &&
                  value.name.toLowerCase() === name.toLowerCase()
              );
              if (tag) {
                tagId = requiredId(tag.id);
                break;
              }
              if (!data.pages?.next) break;
            }
          }
          if (!tagId)
            throw createApiServiceError(
              'Tag was not found in the first 100 pages. Provide tagId from manage_tags with action list.'
            );
          await client.untagConversation(conversationId, tagId);
        }
        break;
    }

    return {
      output: { rawResponse: client.responses, conversationId, actionPerformed: action },
      message: `Action **${action}** performed on conversation **${conversationId}**.`
    };
  })
  .build();
