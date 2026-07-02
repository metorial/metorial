import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeploymentsTool = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List deployments for the authenticated user or team. Filter by project, target environment, or state. Returns deployment status, URL, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter by project ID or name'),
      target: z
        .string()
        .optional()
        .describe('Filter by environment (e.g., production, preview)'),
      state: z
        .enum(['BUILDING', 'ERROR', 'INITIALIZING', 'QUEUED', 'READY', 'CANCELED'])
        .optional()
        .describe('Filter by deployment state'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of deployments to return (default: 20)')
    })
  )
  .output(
    z.object({
      deployments: z
        .array(
          z.object({
            deploymentId: z.string().describe('Deployment unique ID'),
            name: z.string().optional().describe('Project name'),
            url: z.string().optional().nullable().describe('Deployment URL'),
            state: z.string().optional().describe('Deployment state'),
            target: z.string().optional().nullable().describe('Target environment'),
            createdAt: z.number().optional().describe('Creation timestamp'),
            readyAt: z.number().optional().nullable().describe('Ready timestamp'),
            creator: z
              .object({
                email: z.string().optional(),
                username: z.string().optional()
              })
              .optional()
              .describe('Deployment creator')
          })
        )
        .describe('List of deployments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let result = await client.listDeployments({
      projectId: ctx.input.projectId,
      target: ctx.input.target,
      state: ctx.input.state,
      limit: ctx.input.limit
    });

    let deployments = (result.deployments || []).map((d: any) => ({
      deploymentId: d.uid,
      name: d.name,
      url: d.url || null,
      state: d.readyState || d.state,
      target: d.target || null,
      createdAt: d.created ? Number(d.created) : d.createdAt,
      readyAt: d.ready ? Number(d.ready) : null,
      creator: d.creator
        ? {
            email: d.creator.email,
            username: d.creator.username
          }
        : undefined
    }));

    return {
      output: { deployments },
      message: `Found **${deployments.length}** deployment(s)${ctx.input.projectId ? ` for project "${ctx.input.projectId}"` : ''}.`
    };
  })
  .build();
