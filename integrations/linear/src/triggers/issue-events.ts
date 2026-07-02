import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

export let issueEventsTrigger = SlateTrigger.create(spec, {
  name: 'Issue Events',
  key: 'issue_events',
  description:
    'Triggers when issues are created, updated, or removed in Linear. Includes state changes, assignment changes, priority changes, and more.'
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'remove']).describe('The action that occurred'),
      webhookId: z.string().describe('Delivery ID from the webhook'),
      issueId: z.string().describe('Issue ID'),
      issueData: z.any().describe('Full issue data from webhook payload'),
      updatedFrom: z.any().optional().describe('Previous values for updated fields')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('Issue ID'),
      identifier: z.string().nullable().describe('Human-readable identifier like ENG-123'),
      title: z.string().nullable().describe('Issue title'),
      description: z.string().nullable().describe('Issue description'),
      priority: z
        .number()
        .nullable()
        .describe('Priority (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)'),
      priorityLabel: z.string().nullable().describe('Priority label'),
      url: z.string().nullable().describe('Issue URL'),
      stateId: z.string().nullable().describe('Current workflow state ID'),
      stateName: z.string().nullable().describe('Current workflow state name'),
      assigneeId: z.string().nullable().describe('Assignee user ID'),
      teamId: z.string().nullable().describe('Team ID'),
      teamKey: z.string().nullable().describe('Team key'),
      projectId: z.string().nullable().describe('Project ID'),
      cycleId: z.string().nullable().describe('Cycle ID'),
      labelIds: z.array(z.string()).nullable().describe('Label IDs'),
      dueDate: z.string().nullable().describe('Due date'),
      estimate: z.number().nullable().describe('Estimate points'),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable(),
      previousValues: z.any().nullable().describe('Previous field values (on update)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resourceTypes: ['Issue'],
        allPublicTeams: true
      });

      if (!result.success) {
        throw linearServiceError('Failed to register webhook');
      }

      return {
        registrationDetails: {
          webhookId: result.webhook.id,
          secret: result.webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let deliveryId = ctx.request.headers.get('Linear-Delivery') || body.webhookId || '';
      let eventType = ctx.request.headers.get('Linear-Event') || '';

      if (body.type === 'AppOAuthRevoked' || eventType !== 'Issue') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            action: body.action,
            webhookId: deliveryId,
            issueId: body.data?.id || '',
            issueData: body.data,
            updatedFrom: body.updatedFrom
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.issueData || {};

      return {
        type: `issue.${ctx.input.action}`,
        id: ctx.input.webhookId,
        output: {
          issueId: data.id || ctx.input.issueId,
          identifier: data.identifier || null,
          title: data.title || null,
          description: data.description || null,
          priority: data.priority ?? null,
          priorityLabel: data.priorityLabel || null,
          url: data.url || null,
          stateId: data.stateId || data.state?.id || null,
          stateName: data.state?.name || null,
          assigneeId: data.assigneeId || data.assignee?.id || null,
          teamId: data.teamId || data.team?.id || null,
          teamKey: data.team?.key || null,
          projectId: data.projectId || data.project?.id || null,
          cycleId: data.cycleId || data.cycle?.id || null,
          labelIds: data.labelIds || null,
          dueDate: data.dueDate || null,
          estimate: data.estimate ?? null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          previousValues: ctx.input.updatedFrom || null
        }
      };
    }
  })
  .build();
