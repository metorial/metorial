import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List workspaces in an organization. Workspaces contain pipelines, compute environments, credentials, runs, and datasets. Each workspace has its own access controls and resource isolation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: z.number().describe('Organization ID to list workspaces for')
    })
  )
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.number().optional().describe('Workspace ID'),
            name: z.string().optional().describe('Workspace short name'),
            fullName: z.string().optional().describe('Workspace full name'),
            description: z.string().optional().describe('Workspace description'),
            visibility: z
              .string()
              .optional()
              .describe('Workspace visibility (PRIVATE, SHARED)'),
            dateCreated: z.string().optional().describe('Creation date'),
            orgId: z.number().optional().describe('Parent organization ID')
          })
        )
        .describe('List of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let workspaces = await client.listWorkspaces(ctx.input.orgId);

    return {
      output: {
        workspaces: workspaces.map(w => ({
          workspaceId: w.id,
          name: w.name,
          fullName: w.fullName,
          description: w.description,
          visibility: w.visibility,
          dateCreated: w.dateCreated,
          orgId: w.orgId
        }))
      },
      message: `Found **${workspaces.length}** workspaces in organization **${ctx.input.orgId}**.`
    };
  })
  .build();
