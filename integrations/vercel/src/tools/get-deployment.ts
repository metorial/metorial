import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDeploymentTool = SlateTool.create(spec, {
  name: 'Get Deployment',
  key: 'get_deployment',
  description: `Retrieve detailed information about a specific deployment by its ID or URL. Returns build status, alias assignments, Git metadata, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentIdOrUrl: z
        .string()
        .describe('Deployment ID (dpl_...) or deployment URL hostname')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('Deployment unique ID'),
      name: z.string().optional().describe('Project name'),
      url: z.string().optional().describe('Deployment URL'),
      state: z.string().optional().describe('Deployment state (BUILDING, READY, ERROR, etc.)'),
      target: z.string().optional().nullable().describe('Target environment'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      buildingAt: z.number().optional().nullable().describe('Build start timestamp'),
      readyAt: z.number().optional().nullable().describe('Ready timestamp'),
      projectId: z.string().optional().describe('Associated project ID'),
      aliases: z.array(z.string()).optional().describe('Assigned alias URLs'),
      gitSource: z
        .object({
          ref: z.string().optional(),
          sha: z.string().optional(),
          message: z.string().optional()
        })
        .optional()
        .nullable()
        .describe('Git commit info'),
      creator: z
        .object({
          userId: z.string().optional(),
          username: z.string().optional()
        })
        .optional()
        .describe('Deployment creator')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let d = await client.getDeployment(ctx.input.deploymentIdOrUrl);

    return {
      output: {
        deploymentId: d.id,
        name: d.name,
        url: d.url,
        state: d.readyState || d.status,
        target: d.target || null,
        createdAt: d.createdAt,
        buildingAt: d.buildingAt || null,
        readyAt: d.ready || null,
        projectId: d.projectId,
        aliases: d.alias || [],
        gitSource: d.gitSource
          ? {
              ref: d.gitSource.ref,
              sha: d.gitSource.sha,
              message: d.gitSource.message
            }
          : null,
        creator: d.creator
          ? {
              userId: d.creator.uid,
              username: d.creator.username
            }
          : undefined
      },
      message: `Deployment **${d.id}** is in state **${d.readyState || d.status}** at ${d.url || 'N/A'}.`
    };
  })
  .build();
