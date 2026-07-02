import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProjectTool = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, rename, delete, or pin/unpin a project within a team. Use **action** to specify the operation.`
})
  .input(
    z.object({
      action: z
        .enum(['create', 'rename', 'delete', 'pin', 'unpin'])
        .describe('The operation to perform'),
      teamId: z
        .string()
        .optional()
        .describe('ID of the team (required for "create", "pin", "unpin")'),
      projectId: z
        .string()
        .optional()
        .describe('ID of the project (required for "rename", "delete", "pin", "unpin")'),
      name: z.string().optional().describe('Project name (required for "create" and "rename")')
    })
  )
  .output(
    z.object({
      projectId: z.string().optional().describe('ID of the project'),
      name: z.string().optional().describe('Name of the project'),
      teamId: z.string().optional().describe('Team ID the project belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { action, teamId, projectId, name } = ctx.input;

    switch (action) {
      case 'create': {
        if (!teamId || !name)
          throw new Error('teamId and name are required for create action');
        let project = await client.createProject(teamId, name);
        return {
          output: {
            projectId: project.id,
            name: project.name,
            teamId: project['team-id'] ?? project.teamId
          },
          message: `Created project **${name}**.`
        };
      }
      case 'rename': {
        if (!projectId || !name)
          throw new Error('projectId and name are required for rename action');
        await client.renameProject(projectId, name);
        return {
          output: { projectId, name },
          message: `Renamed project to **${name}**.`
        };
      }
      case 'delete': {
        if (!projectId) throw new Error('projectId is required for delete action');
        await client.deleteProject(projectId);
        return {
          output: { projectId },
          message: `Deleted project \`${projectId}\`.`
        };
      }
      case 'pin': {
        if (!teamId || !projectId)
          throw new Error('teamId and projectId are required for pin action');
        await client.updateProjectPin(teamId, projectId, true);
        return {
          output: { projectId },
          message: `Pinned project \`${projectId}\`.`
        };
      }
      case 'unpin': {
        if (!teamId || !projectId)
          throw new Error('teamId and projectId are required for unpin action');
        await client.updateProjectPin(teamId, projectId, false);
        return {
          output: { projectId },
          message: `Unpinned project \`${projectId}\`.`
        };
      }
    }
  })
  .build();
