import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let deployEvent = SlateTrigger.create(spec, {
  name: 'Deploy Event',
  key: 'deploy_event',
  description:
    'Triggers when a deployment is reported to Rollbar. Provides deploy details including environment, revision, status, and deployer information.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier for deduplication'),
      deployId: z.number().optional().describe('Deploy ID'),
      environment: z.string().optional().describe('Target environment'),
      revision: z.string().optional().describe('Code revision or git SHA'),
      status: z.string().optional().describe('Deploy status'),
      localUsername: z.string().optional().describe('Local system username of deployer'),
      rollbarUsername: z.string().optional().describe('Rollbar username of deployer'),
      comment: z.string().optional().describe('Deploy comment'),
      projectId: z.number().optional().describe('Project ID')
    })
  )
  .output(
    z.object({
      deployId: z.number().describe('Deploy ID'),
      environment: z.string().optional().describe('Target environment'),
      revision: z.string().optional().describe('Code revision or git SHA'),
      status: z.string().optional().describe('Deploy status'),
      localUsername: z.string().optional().describe('Local system username of deployer'),
      rollbarUsername: z.string().optional().describe('Rollbar username of deployer'),
      comment: z.string().optional().describe('Deploy comment'),
      projectId: z.number().optional().describe('Project ID')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let deployData = data.data?.deploy || data.data || {};
      let deployId = deployData.id || deployData.deploy_id;

      let eventId = `deploy_${deployId || Date.now()}`;

      return {
        inputs: [
          {
            eventId,
            deployId,
            environment: deployData.environment,
            revision: deployData.revision,
            status: deployData.status,
            localUsername: deployData.local_username,
            rollbarUsername: deployData.rollbar_username,
            comment: deployData.comment,
            projectId: deployData.project_id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'deploy.created',
        id: ctx.input.eventId,
        output: {
          deployId: ctx.input.deployId || 0,
          environment: ctx.input.environment,
          revision: ctx.input.revision,
          status: ctx.input.status,
          localUsername: ctx.input.localUsername,
          rollbarUsername: ctx.input.rollbarUsername,
          comment: ctx.input.comment,
          projectId: ctx.input.projectId
        }
      };
    }
  })
  .build();
