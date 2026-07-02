import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List Vercel projects for the authenticated user or team. Supports searching by name and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search projects by name'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of projects to return (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique project identifier'),
            name: z.string().describe('Project name'),
            framework: z
              .string()
              .optional()
              .nullable()
              .describe('Framework used (e.g., nextjs, nuxt)'),
            nodeVersion: z.string().optional().describe('Node.js version'),
            createdAt: z.number().optional().describe('Creation timestamp in milliseconds'),
            updatedAt: z.number().optional().describe('Last update timestamp in milliseconds'),
            accountId: z.string().optional().describe('Account identifier')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let result = await client.listProjects({
      search: ctx.input.search,
      limit: ctx.input.limit
    });

    let projectItems = Array.isArray(result) ? result : result.projects || [];
    let projects = projectItems.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      framework: p.framework || null,
      nodeVersion: p.nodeVersion,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      accountId: p.accountId
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
