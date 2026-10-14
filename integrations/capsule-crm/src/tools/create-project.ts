import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { customFieldValuesSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project (formerly case) in Capsule CRM, linked to a contact. Projects can be used to track work, support cases, or any grouped set of activities.`,
  instructions: ['A party ID is required when creating a project.']
})
  .input(
    z.object({
      name: z.string().describe('Name of the project'),
      description: z.string().optional().describe('Description of the project'),
      partyId: z.number().describe('ID of the primary party (contact) for this project'),
      ownerId: z
        .number()
        .optional()
        .describe('Owner user ID. Use list_users to discover IDs.'),
      teamId: z.number().optional().describe('Team ID. Use list_teams to discover IDs.'),
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
      expectedCloseOn: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      fields: customFieldValuesSchema,
      tags: z
        .array(
          z.object({
            tagId: z.number().optional().describe('Existing tag ID'),
            name: z.string().optional().describe('Tag name')
          })
        )
        .optional()
        .describe('Tags to associate')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the created project'),
      name: z.string().optional().describe('Name of the project'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let kase: Record<string, any> = {
      name: ctx.input.name,
      party: { id: ctx.input.partyId }
    };

    if (ctx.input.description) kase.description = ctx.input.description;
    if (ctx.input.ownerId) kase.owner = { id: ctx.input.ownerId };
    if (ctx.input.teamId) kase.team = { id: ctx.input.teamId };
    if (ctx.input.expectedCloseOn) kase.expectedCloseOn = ctx.input.expectedCloseOn;

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
      kase.tags = ctx.input.tags.map(t => (t.tagId ? { id: t.tagId } : { name: t.name }));
    }

    let result = await client.createProject(kase);

    return {
      output: {
        projectId: result.id,
        name: result.name ?? undefined,
        createdAt: result.createdAt ?? undefined
      },
      message: `Created project **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
