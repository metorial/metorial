import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let listServiceDesksTool = SlateTool.create(spec, {
  name: 'List Service Desks',
  key: 'list_service_desks',
  description: `List all service desks available in the Jira Service Management instance. Returns service desk IDs, names, project keys, and descriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Maximum number of results (default: 50)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of service desks'),
      serviceDesks: z
        .array(
          z.object({
            serviceDeskId: z.string().describe('Unique ID of the service desk'),
            projectId: z.string().describe('Associated project ID'),
            projectKey: z.string().describe('Associated project key'),
            projectName: z.string().describe('Associated project name')
          })
        )
        .describe('List of service desks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let result = await client.getServiceDesks(ctx.input.start, ctx.input.limit);

    let serviceDesks = (result.values || []).map((sd: any) => ({
      serviceDeskId: String(sd.id),
      projectId: sd.projectId,
      projectKey: sd.projectKey,
      projectName: sd.projectName
    }));

    return {
      output: {
        total: result.size || serviceDesks.length,
        serviceDesks
      },
      message: `Found **${serviceDesks.length}** service desks.`
    };
  })
  .build();
