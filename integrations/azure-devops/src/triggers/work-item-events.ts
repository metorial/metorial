import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let workItemEventsTrigger = SlateTrigger.create(spec, {
  name: 'Work Item Events',
  key: 'work_item_events',
  description:
    'Fires when work items are created, updated, deleted, restored, or commented on.'
})
  .input(
    z.object({
      eventType: z.string().describe('Azure DevOps event type'),
      resourceId: z.string().describe('Unique event resource identifier'),
      resource: z.any().describe('Event resource payload'),
      message: z.string().optional().describe('Event message text')
    })
  )
  .output(
    z.object({
      workItemId: z.number(),
      workItemType: z.string().optional(),
      title: z.string().optional(),
      state: z.string().optional(),
      assignedTo: z.string().optional(),
      areaPath: z.string().optional(),
      iterationPath: z.string().optional(),
      projectName: z.string().optional(),
      changedBy: z.string().optional(),
      changedDate: z.string().optional(),
      revision: z.number().optional(),
      changedFields: z
        .record(
          z.string(),
          z.object({
            oldValue: z.any().optional(),
            newValue: z.any().optional()
          })
        )
        .optional(),
      commentText: z.string().optional(),
      url: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AzureDevOpsClient({
        token: ctx.auth.token,
        organization: ctx.config.organization
      });

      let eventTypes = [
        'workitem.created',
        'workitem.updated',
        'workitem.deleted',
        'workitem.restored',
        'workitem.commented'
      ];

      let subscriptionIds: string[] = [];

      for (let eventType of eventTypes) {
        let publisherInputs: Record<string, string> = {};
        if (ctx.config.project) {
          publisherInputs.projectId = ctx.config.project;
        }

        let sub = await client.createServiceHookSubscription({
          publisherId: 'tfs',
          eventType,
          consumerId: 'webHooks',
          consumerActionId: 'httpRequest',
          publisherInputs,
          consumerInputs: {
            url: ctx.input.webhookBaseUrl
          },
          resourceVersion: '1.0'
        });
        subscriptionIds.push(sub.id);
      }

      return {
        registrationDetails: { subscriptionIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AzureDevOpsClient({
        token: ctx.auth.token,
        organization: ctx.config.organization
      });

      let details = ctx.input.registrationDetails as { subscriptionIds: string[] };
      for (let id of details.subscriptionIds) {
        try {
          await client.deleteServiceHookSubscription(id);
        } catch {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.eventType || '';
      let resource = data.resource || {};

      return {
        inputs: [
          {
            eventType,
            resourceId:
              data.id ||
              resource.id?.toString() ||
              `${eventType}-${data.createdDate || Date.now()}`,
            resource,
            message: data.message?.text
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.resource || {};
      let fields = resource.fields || {};
      let revision = resource.revision || resource.rev;

      let changedFields: Record<string, { oldValue?: any; newValue?: any }> | undefined;
      if (resource.fields && ctx.input.eventType === 'workitem.updated') {
        changedFields = {};
        for (let [key, value] of Object.entries(resource.fields as Record<string, any>)) {
          if (
            value &&
            typeof value === 'object' &&
            ('oldValue' in value || 'newValue' in value)
          ) {
            changedFields[key] = {
              oldValue: (value as any).oldValue,
              newValue: (value as any).newValue
            };
          }
        }
      }

      let workItemId = resource.workItemId || resource.id;
      let type: string;
      let eventSuffix = ctx.input.eventType.split('.').pop() || 'updated';
      type = `work_item.${eventSuffix}`;

      return {
        type,
        id: ctx.input.resourceId,
        output: {
          workItemId,
          workItemType: fields['System.WorkItemType'] || resource.workItemType,
          title: fields['System.Title'] || resource.title,
          state: fields['System.State'] || resource.state,
          assignedTo: fields['System.AssignedTo']?.displayName || fields['System.AssignedTo'],
          areaPath: fields['System.AreaPath'],
          iterationPath: fields['System.IterationPath'],
          projectName: resource.project?.name,
          changedBy: resource.revisedBy?.displayName || resource.changedBy?.displayName,
          changedDate: resource.revisedDate || resource.changedDate,
          revision,
          changedFields,
          commentText: resource.commentText || resource.text,
          url: resource._links?.html?.href || resource.url
        }
      };
    }
  })
  .build();
