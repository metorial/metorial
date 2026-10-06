import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve information about the authenticated single-workspace API key, including the project details and environment type. Useful for getting the environmentId needed by other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projectId: z.string().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      environmentType: z
        .string()
        .optional()
        .describe('Environment type (production or development)'),
      environmentId: z
        .string()
        .optional()
        .describe('Legacy environment ID accepted by v1 writes'),
      workspaceId: z.string().optional().describe('Current workspace ID'),
      workspaceName: z.string().optional().describe('Current workspace name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      instanceUrl: ctx.auth.instanceUrl
    });

    let me = await client.getMe();

    return {
      output: {
        projectId: me.project.id,
        projectName: me.project.name,
        environmentType: me.type,
        environmentId: me.id,
        workspaceId: me.workspace?.id,
        workspaceName: me.workspace?.name
      },
      message: `Account: project **${me.project.name}** (${me.type} environment).`
    };
  })
  .build();
