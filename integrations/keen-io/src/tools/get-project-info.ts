import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProjectInfo = SlateTool.create(spec, {
  name: 'Get Project Info',
  key: 'get_project_info',
  description: `Retrieve information about the current Keen.io project, including its name, event collections, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projectId: z.string().describe('The project ID'),
      projectName: z.string().optional().describe('The project name'),
      eventCollections: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of event collections in the project'),
      projectDetails: z.record(z.string(), z.any()).describe('Full project details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      projectId: ctx.config.projectId,
      token: ctx.auth.token
    });

    let info = await client.getProjectInfo();

    return {
      output: {
        projectId: info.project_id || ctx.config.projectId,
        projectName: info.name,
        eventCollections: info.events,
        projectDetails: info
      },
      message: `Project **${info.name || ctx.config.projectId}** has **${info.events?.length ?? 0}** event collection(s).`
    };
  });
