import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subtaskTrigger = SlateTrigger.create(spec, {
  name: 'Subtask Events',
  key: 'subtask_events',
  description: 'Triggers when a subtask is created or completed in Project Bubble.'
})
  .input(
    z.object({
      eventType: z
        .enum(['new_subtask', 'completed_subtask'])
        .describe('Type of subtask event'),
      resourceUrl: z.string().describe('URL to the subtask resource')
    })
  )
  .output(
    z.object({
      subtaskId: z.string().describe('Subtask ID'),
      subtaskName: z.string().describe('Subtask name'),
      description: z.string().optional().describe('Subtask description'),
      taskId: z.string().optional().describe('Parent task ID'),
      color: z.string().optional().describe('Subtask color'),
      startDate: z.string().optional().describe('Start date'),
      dueDate: z.string().optional().describe('Due date'),
      progress: z.number().optional().describe('Progress percentage'),
      dateCreated: z.string().optional().describe('Date created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let newSubtaskResult = await client.subscribeWebhook(
        `${ctx.input.webhookBaseUrl}/new_subtask`,
        'new_subtask'
      );
      let completedSubtaskResult = await client.subscribeWebhook(
        `${ctx.input.webhookBaseUrl}/completed_subtask`,
        'completed_subtask'
      );

      return {
        registrationDetails: {
          newSubtaskSubscriptionId: String(
            newSubtaskResult?.id ||
              newSubtaskResult?.data?.id ||
              newSubtaskResult?.subscription_id ||
              ''
          ),
          completedSubtaskSubscriptionId: String(
            completedSubtaskResult?.id ||
              completedSubtaskResult?.data?.id ||
              completedSubtaskResult?.subscription_id ||
              ''
          )
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      if (ctx.input.registrationDetails.newSubtaskSubscriptionId) {
        await client.unsubscribeWebhook(
          ctx.input.registrationDetails.newSubtaskSubscriptionId
        );
      }
      if (ctx.input.registrationDetails.completedSubtaskSubscriptionId) {
        await client.unsubscribeWebhook(
          ctx.input.registrationDetails.completedSubtaskSubscriptionId
        );
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let url = new URL(ctx.request.url);
      let pathSegments = url.pathname.split('/');
      let lastSegment = pathSegments[pathSegments.length - 1];

      let eventType: 'new_subtask' | 'completed_subtask' =
        lastSegment === 'completed_subtask' ? 'completed_subtask' : 'new_subtask';

      return {
        inputs: [
          {
            eventType,
            resourceUrl: data.resource_url || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let result = await client.fetchResourceByUrl(ctx.input.resourceUrl);
      let s = result?.data?.[0] || result?.data || result;

      let type =
        ctx.input.eventType === 'completed_subtask' ? 'subtask.completed' : 'subtask.created';

      return {
        type,
        id: `${ctx.input.eventType}-${s.subtask_id || ctx.input.resourceUrl}`,
        output: {
          subtaskId: String(s.subtask_id || ''),
          subtaskName: s.subtask_name || '',
          description: s.description || undefined,
          taskId: s.task_id ? String(s.task_id) : undefined,
          color: s.color || undefined,
          startDate: s.start_date || undefined,
          dueDate: s.due_date || undefined,
          progress: s.progress ?? undefined,
          dateCreated: s.date_created || undefined
        }
      };
    }
  })
  .build();
