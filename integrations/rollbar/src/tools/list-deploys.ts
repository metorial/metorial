import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeploys = SlateTool.create(spec, {
  name: 'List Deploys',
  key: 'list_deploys',
  description: `List deployments reported to Rollbar, optionally filtered by environment. Useful for auditing release history and correlating deploys with error spikes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      environment: z.string().optional().describe('Filter deploys by environment name'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      deploys: z
        .array(
          z.object({
            deployId: z.number().describe('Unique deploy ID'),
            environment: z.string().optional().describe('Target environment'),
            revision: z.string().optional().describe('Code revision'),
            status: z.string().optional().describe('Deploy status'),
            localUsername: z.string().optional().describe('Local username of deployer'),
            rollbarUsername: z.string().optional().describe('Rollbar username of deployer'),
            comment: z.string().optional().describe('Deploy comment'),
            startTime: z.number().optional().describe('Unix timestamp of deploy start'),
            finishTime: z.number().optional().describe('Unix timestamp of deploy finish'),
            projectId: z.number().optional().describe('Associated project ID')
          })
        )
        .describe('List of deploys'),
      page: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDeploys({
      environment: ctx.input.environment,
      page: ctx.input.page
    });

    let deploys = (result?.result?.deploys || []).map((d: any) => ({
      deployId: d.id,
      environment: d.environment,
      revision: d.revision,
      status: d.status,
      localUsername: d.local_username,
      rollbarUsername: d.rollbar_username,
      comment: d.comment,
      startTime: d.start_time,
      finishTime: d.finish_time,
      projectId: d.project_id
    }));

    return {
      output: {
        deploys,
        page: ctx.input.page || 1
      },
      message: `Found **${deploys.length}** deploys${ctx.input.environment ? ` in environment "${ctx.input.environment}"` : ''}.`
    };
  })
  .build();
