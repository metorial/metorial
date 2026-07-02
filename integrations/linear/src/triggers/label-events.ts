import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

export let labelEventsTrigger = SlateTrigger.create(spec, {
  name: 'Label Events',
  key: 'label_events',
  description: 'Triggers when issue labels are created, updated, or removed in Linear.'
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'remove']).describe('The action that occurred'),
      webhookId: z.string().describe('Delivery ID from the webhook'),
      labelId: z.string().describe('Label ID'),
      labelData: z.any().describe('Full label data from webhook payload'),
      updatedFrom: z.any().optional().describe('Previous values for updated fields')
    })
  )
  .output(
    z.object({
      labelId: z.string().describe('Label ID'),
      name: z.string().nullable().describe('Label name'),
      color: z.string().nullable().describe('Label color'),
      description: z.string().nullable().describe('Label description'),
      teamId: z.string().nullable().describe('Team ID'),
      parentId: z.string().nullable().describe('Parent label group ID'),
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
        resourceTypes: ['IssueLabel'],
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

      if (eventType !== 'IssueLabel' && body.type !== 'IssueLabel') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            action: body.action,
            webhookId: deliveryId,
            labelId: body.data?.id || '',
            labelData: body.data,
            updatedFrom: body.updatedFrom
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.labelData || {};

      return {
        type: `label.${ctx.input.action}`,
        id: ctx.input.webhookId,
        output: {
          labelId: data.id || ctx.input.labelId,
          name: data.name || null,
          color: data.color || null,
          description: data.description || null,
          teamId: data.teamId || data.team?.id || null,
          parentId: data.parentId || data.parent?.id || null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          previousValues: ctx.input.updatedFrom || null
        }
      };
    }
  })
  .build();
