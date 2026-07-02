import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in Capsule CRM. Modify its name, description, status, owner, team, and expected close date.`
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      status: z.enum(['OPEN', 'CLOSED']).optional().describe('Updated status'),
      ownerId: z.number().optional().describe('New owner user ID'),
      teamId: z.number().optional().describe('New team ID'),
      expectedCloseOn: z
        .string()
        .optional()
        .describe('Updated expected close date (YYYY-MM-DD)'),
      tags: z
        .array(
          z.object({
            tagId: z.number().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Tags to set')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the updated project'),
      name: z.string().optional().describe('Name'),
      updatedAt: z.string().optional().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let kase: Record<string, any> = {};

    if (ctx.input.name !== undefined) kase.name = ctx.input.name;
    if (ctx.input.description !== undefined) kase.description = ctx.input.description;
    if (ctx.input.status !== undefined) kase.status = ctx.input.status;
    if (ctx.input.ownerId) kase.owner = { id: ctx.input.ownerId };
    if (ctx.input.teamId) kase.team = { id: ctx.input.teamId };
    if (ctx.input.expectedCloseOn !== undefined)
      kase.expectedCloseOn = ctx.input.expectedCloseOn;

    if (ctx.input.tags) {
      kase.tags = ctx.input.tags.map(t => (t.tagId ? { id: t.tagId } : { name: t.name }));
    }

    let result = await client.updateProject(ctx.input.projectId, kase);

    return {
      output: {
        projectId: result.id,
        name: result.name,
        updatedAt: result.updatedAt
      },
      message: `Updated project **${result.name ?? `#${result.id}`}**.`
    };
  })
  .build();
