import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let buildCompleteEventsTrigger = SlateTrigger.create(spec, {
  name: 'Build & Pipeline Events',
  key: 'build_pipeline_events',
  description:
    'Fires when builds complete or pipeline run states change. Covers both classic builds and YAML pipelines.'
})
  .input(
    z.object({
      eventType: z.string().describe('Azure DevOps event type'),
      resourceId: z.string().describe('Unique event resource identifier'),
      resource: z.any().describe('Event resource payload')
    })
  )
  .output(
    z.object({
      buildId: z.number().optional(),
      buildNumber: z.string().optional(),
      status: z.string().optional(),
      result: z.string().optional(),
      definitionName: z.string().optional(),
      definitionId: z.number().optional(),
      projectName: z.string().optional(),
      sourceBranch: z.string().optional(),
      sourceVersion: z.string().optional(),
      requestedBy: z.string().optional(),
      startTime: z.string().optional(),
      finishTime: z.string().optional(),
      reason: z.string().optional(),
      url: z.string().optional(),
      pipelineId: z.number().optional(),
      pipelineName: z.string().optional(),
      runState: z.string().optional(),
      runResult: z.string().optional(),
      stageName: z.string().optional(),
      stageState: z.string().optional(),
      stageResult: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AzureDevOpsClient({
        token: ctx.auth.token,
        organization: ctx.config.organization
      });

      let eventTypes = [
        'build.complete',
        'ms.vss-pipelines.run-state-changed-event',
        'ms.vss-pipelines.stage-state-changed-event'
      ];

      let subscriptionIds: string[] = [];

      for (let eventType of eventTypes) {
        let publisherInputs: Record<string, string> = {};
        if (ctx.config.project) {
          publisherInputs.projectId = ctx.config.project;
        }

        // build.complete uses 'tfs' publisher, pipeline events use 'pipelines'
        let publisherId = eventType === 'build.complete' ? 'tfs' : 'pipelines';

        let sub = await client.createServiceHookSubscription({
          publisherId,
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
      let resource = data.resource || {};

      return {
        inputs: [
          {
            eventType: data.eventType || '',
            resourceId: data.id || resource.id?.toString() || `build-${Date.now()}`,
            resource
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.resource || {};
      let eventType = ctx.input.eventType;

      let type = 'build.completed';
      if (eventType.includes('stage-state-changed')) type = 'pipeline.stage_state_changed';
      else if (eventType.includes('run-state-changed')) type = 'pipeline.run_state_changed';

      let definition = resource.definition || {};
      let project = resource.project || definition.project || {};
      let pipeline = resource.pipeline || {};

      return {
        type,
        id: ctx.input.resourceId,
        output: {
          buildId: resource.id || resource.buildId,
          buildNumber: resource.buildNumber,
          status: resource.status,
          result: resource.result,
          definitionName: definition.name,
          definitionId: definition.id,
          projectName: project.name,
          sourceBranch: resource.sourceBranch,
          sourceVersion: resource.sourceVersion,
          requestedBy: resource.requestedBy?.displayName || resource.requestedFor?.displayName,
          startTime: resource.startTime,
          finishTime: resource.finishTime,
          reason: resource.reason,
          url: resource._links?.web?.href || resource.url,
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          runState: resource.state,
          runResult: resource.result,
          stageName: resource.stageName || resource.name,
          stageState:
            resource.stageState || (eventType.includes('stage') ? resource.state : undefined),
          stageResult:
            resource.stageResult || (eventType.includes('stage') ? resource.result : undefined)
        }
      };
    }
  })
  .build();
