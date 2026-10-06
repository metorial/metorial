import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Retrieve a single Capsule CRM project by ID, including its state, assignment, and linked records.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z
        .number()
        .int()
        .positive()
        .describe('Project ID. Use list_projects to discover IDs.'),
      embed: z
        .array(z.enum(['tags', 'fields', 'party', 'opportunity', 'missingImportantFields']))
        .optional()
        .describe('Additional related data to include')
    })
  )
  .output(
    z.object({
      projectId: z.number(),
      name: z.string().nullish(),
      description: z.string().nullish(),
      status: z.string().nullish(),
      createdAt: z.string().nullish(),
      updatedAt: z.string().nullish(),
      closedOn: z.string().nullish(),
      startOn: z.string().nullish(),
      expectedCloseOn: z.string().nullish(),
      party: z.any().nullish(),
      opportunity: z.any().nullish(),
      owner: z.any().nullish(),
      team: z.any().nullish(),
      stage: z.any().nullish(),
      tags: z.array(z.any()).nullish(),
      fields: z.array(z.any()).nullish(),
      missingImportantFields: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });
    let result = await client.getProject(ctx.input.projectId, ctx.input.embed);
    return {
      output: {
        projectId: result.id,
        name: result.name,
        description: result.description,
        status: result.status,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        closedOn: result.closedOn,
        startOn: result.startOn,
        expectedCloseOn: result.expectedCloseOn,
        party: result.party,
        opportunity: result.opportunity,
        owner: result.owner,
        team: result.team,
        stage: result.stage,
        tags: result.tags,
        fields: result.fields,
        missingImportantFields: result.missingImportantFields
      },
      message: `Retrieved project **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
