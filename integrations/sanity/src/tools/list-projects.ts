import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { projectId } from '../lib/schemas';
import { spec } from '../spec';

const outputProject = z
  .object({
    projectId: z.string(),
    displayName: z.string(),
    organizationId: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    studioHost: z.string().nullable().optional(),
    members: z
      .array(z.object({ userId: z.string(), role: z.string().optional() }).passthrough())
      .optional()
  })
  .passthrough();
export const listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'Discover accessible native project IDs and names, or read one project by projectId. Robot tokens are limited by their granted scope; no projects are inferred from token contents.',
  tags: { readOnly: true }
})
  .input(z.object({ projectId: projectId.optional() }))
  .output(
    z.object({ projects: z.array(outputProject).optional(), project: z.unknown().optional() })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    if (ctx.input.projectId) {
      const project = await client.getProject(ctx.input.projectId);
      return {
        output: { project: { ...project, projectId: project.id } },
        message: 'Retrieved the exact project.'
      };
    }
    const native = await client.listProjects();
    const projects = native.map(p => ({
      ...p,
      projectId: p.id,
      members: p.members?.map(member => ({ ...member, userId: member.id }))
    }));
    return {
      output: { projects },
      message: `Found ${projects.length} accessible project(s).`
    };
  })
  .build();
