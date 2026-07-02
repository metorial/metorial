import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let deployEvent = SlateTrigger.create(spec, {
  name: 'Deployment Event',
  key: 'deploy_event',
  description: 'Triggers when a deployment is recorded in Honeybadger.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of deployment event'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      environment: z.string().optional().describe('Deployment environment'),
      revision: z.string().optional().describe('Revision/commit hash'),
      repository: z.string().optional().describe('Repository URL'),
      localUsername: z.string().optional().describe('User who deployed'),
      deployUrl: z.string().optional().describe('URL to the deployment'),
      deployCreatedAt: z.string().optional().describe('When the deployment was recorded')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      environment: z.string().optional().describe('Deployment environment'),
      revision: z.string().optional().describe('Revision/commit hash'),
      repository: z.string().optional().describe('Repository URL'),
      deployedBy: z.string().optional().describe('User who deployed'),
      deployUrl: z.string().optional().describe('URL to the deployment'),
      createdAt: z.string().optional().describe('When the deployment was recorded')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let event = body.event || 'deployed';

      let project = body.project || {};
      let deploy = body.deploy || {};

      return {
        inputs: [
          {
            eventType: event,
            projectId: project.id,
            projectName: project.name,
            environment: deploy.environment,
            revision: deploy.revision,
            repository: deploy.repository,
            localUsername: deploy.local_username,
            deployUrl: deploy.url,
            deployCreatedAt: deploy.created_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let {
        eventType,
        projectId,
        projectName,
        environment,
        revision,
        repository,
        localUsername,
        deployUrl,
        deployCreatedAt
      } = ctx.input;

      return {
        type: `deploy.${eventType}`,
        id: `${projectId}-${eventType}-${revision || Date.now()}`,
        output: {
          projectId,
          projectName,
          environment,
          revision,
          repository,
          deployedBy: localUsername,
          deployUrl,
          createdAt: deployCreatedAt
        }
      };
    }
  })
  .build();
