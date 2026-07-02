import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { workspaceConfigSchema } from '../lib/types';
import { spec } from '../spec';

export let getWorkspaceConfig = SlateTool.create(spec, {
  name: 'Get Workspace Config',
  key: 'get_workspace_config',
  description: `Retrieves workspace configuration including available dartboards, folders, statuses, assignees, tags, priorities, sizes, task types, and custom property definitions. Use this to discover valid values before creating or updating tasks and documents.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(workspaceConfigSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let config = await client.getWorkspaceConfig();

    return {
      output: config,
      message: `Workspace has **${config.dartboards.length}** dartboard(s), **${config.statuses.length}** status(es), **${config.assignees.length}** assignee(s), and **${config.customProperties.length}** custom propert(ies).`
    };
  })
  .build();
