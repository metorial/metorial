import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all coding projects that have recorded activity. Optionally search by name. Returns project names, IDs, and repository information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter projects by name')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z
            .object({
              projectId: z.string().describe('Unique project ID'),
              name: z.string().describe('Project name'),
              repository: z.string().optional().describe('Connected repository URL'),
              badge: z.string().optional().describe('Badge URL'),
              color: z.string().optional().describe('Project color'),
              hasPublicUrl: z
                .boolean()
                .optional()
                .describe('Whether project has a public URL'),
              humanReadableLastHeartbeatAt: z
                .string()
                .optional()
                .describe('Last activity time'),
              lastHeartbeatAt: z.string().optional().describe('Last heartbeat timestamp'),
              url: z.string().optional().describe('Project URL on WakaTime'),
              createdAt: z.string().optional().describe('When the project was first seen')
            })
            .passthrough()
        )
        .describe('List of projects'),
      totalProjects: z.number().describe('Total number of projects returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient(ctx.auth);

    let projects = await client.getProjects({ query: ctx.input.query });

    let mapped = (projects || []).map((p: any) => ({
      projectId: p.id ?? '',
      name: p.name ?? '',
      repository:
        typeof p.repository === 'string'
          ? p.repository
          : (p.repository?.html_url ?? p.repository?.url ?? undefined),
      badge: p.badge ?? undefined,
      color: p.color ?? undefined,
      hasPublicUrl: p.has_public_url ?? undefined,
      humanReadableLastHeartbeatAt: p.human_readable_last_heartbeat_at ?? undefined,
      lastHeartbeatAt: p.last_heartbeat_at ?? undefined,
      url: p.url ?? undefined,
      createdAt: p.created_at ?? undefined
    }));

    return {
      output: {
        projects: mapped,
        totalProjects: mapped.length
      },
      message: `Found **${mapped.length}** project(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
