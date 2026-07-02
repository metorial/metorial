import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all Browserbase projects accessible with the current API key. Returns project details including name, owner, default timeout, and concurrency limits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Project identifier'),
          name: z.string().describe('Project name'),
          ownerId: z.string().describe('Owner identifier'),
          defaultTimeout: z.number().describe('Default session timeout in seconds'),
          concurrency: z.number().describe('Maximum concurrent sessions'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let projects = await client.listProjects();

    return {
      output: {
        projects: projects.map(p => ({
          projectId: p.projectId,
          name: p.name,
          ownerId: p.ownerId,
          defaultTimeout: p.defaultTimeout,
          concurrency: p.concurrency,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }))
      },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();

export let getProjectUsage = SlateTool.create(spec, {
  name: 'Get Project Usage',
  key: 'get_project_usage',
  description: `Retrieve usage statistics for a project including browser minutes consumed and proxy bytes used. Defaults to the configured project if no project ID is provided.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID to retrieve usage for. Defaults to the configured project.')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project identifier'),
      browserMinutes: z.number().describe('Total browser minutes consumed'),
      proxyBytes: z.number().describe('Total proxy bytes consumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let projectId = ctx.input.projectId || ctx.config.projectId;
    let usage = await client.getProjectUsage(projectId);

    return {
      output: {
        projectId,
        browserMinutes: usage.browserMinutes,
        proxyBytes: usage.proxyBytes
      },
      message: `Project **${projectId}** has used **${usage.browserMinutes}** browser minutes and **${usage.proxyBytes}** proxy bytes.`
    };
  })
  .build();
