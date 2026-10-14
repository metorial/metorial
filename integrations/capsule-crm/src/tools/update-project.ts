import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { customFieldValuesSchema } from '../lib/schemas';
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
      ownerId: z
        .number()
        .optional()
        .describe('New owner user ID. Use list_users to discover IDs.'),
      teamId: z.number().optional().describe('New team ID. Use list_teams to discover IDs.'),
      startOn: z.string().optional().describe('Scheduled start date (YYYY-MM-DD)'),
      opportunityId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Related opportunity ID. Use list_opportunities or search_opportunities to discover IDs.'
        ),
      stageId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Existing project stage ID, for example a stage returned by get_project'),
      expectedCloseOn: z
        .string()
        .optional()
        .describe('Updated expected close date (YYYY-MM-DD)'),
      fields: customFieldValuesSchema,
      tags: z
        .array(
          z.object({
            tagId: z.number().optional(),
            name: z.string().optional(),
            delete: z.boolean().optional().describe('Remove the tag identified by tagId')
          })
        )
        .optional()
        .describe('Tags to add or remove; unspecified tags remain unchanged')
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

    if (ctx.input.fields) {
      kase.fields = ctx.input.fields.map(field => ({
        definition: { id: field.definitionId },
        value: field.value
      }));
    }

    if (ctx.input.startOn !== undefined) kase.startOn = ctx.input.startOn;
    if (ctx.input.opportunityId !== undefined)
      kase.opportunity = { id: ctx.input.opportunityId };
    if (ctx.input.stageId !== undefined) kase.stage = { id: ctx.input.stageId };

    if (ctx.input.tags) {
      if (ctx.input.tags.some(tag => tag.delete && !tag.tagId)) {
        throw createApiServiceError('Provide tagId when removing a tag.');
      }
      kase.tags = ctx.input.tags.map(t =>
        t.tagId ? { id: t.tagId, ...(t.delete ? { _delete: true } : {}) } : { name: t.name }
      );
    }

    let result = await client.updateProject(ctx.input.projectId, kase);

    return {
      output: {
        projectId: result.id,
        name: result.name ?? undefined,
        updatedAt: result.updatedAt ?? undefined
      },
      message: `Updated project **${result.name ?? `#${result.id}`}**.`
    };
  })
  .build();
