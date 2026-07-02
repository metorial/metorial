import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the Sentry organization. Returns project slugs, names, platforms, and team assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor for fetching next page')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string(),
          projectSlug: z.string(),
          name: z.string(),
          platform: z.string().optional(),
          dateCreated: z.string().optional(),
          isBookmarked: z.boolean().optional(),
          isMember: z.boolean().optional(),
          hasAccess: z.boolean().optional(),
          teams: z
            .array(
              z.object({
                teamId: z.string(),
                teamSlug: z.string(),
                name: z.string()
              })
            )
            .optional(),
          features: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let projects = await client.listProjects({ cursor: ctx.input.cursor });

    let mapped = (projects || []).map((p: any) => ({
      projectId: String(p.id),
      projectSlug: p.slug || '',
      name: p.name || '',
      platform: p.platform,
      dateCreated: p.dateCreated,
      isBookmarked: p.isBookmarked,
      isMember: p.isMember,
      hasAccess: p.hasAccess,
      teams: (p.teams || []).map((t: any) => ({
        teamId: String(t.id),
        teamSlug: t.slug || '',
        name: t.name || ''
      })),
      features: p.features
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** projects in the organization.`
    };
  })
  .build();
