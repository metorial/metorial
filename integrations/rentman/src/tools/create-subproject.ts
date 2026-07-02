import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSubproject = SlateTool.create(spec, {
  name: 'Create Subproject',
  key: 'create_subproject',
  description: `Create a new subproject within an existing project in Rentman. Subprojects help organize complex projects into manageable parts (e.g. different event days or stages).`,
  constraints: ['The subproject creation endpoint is currently in BETA.'],
  tags: { destructive: false }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the parent project'),
      name: z.string().describe('Subproject name'),
      equipmentPeriodFrom: z.string().optional().describe('Equipment usage start (ISO 8601)'),
      equipmentPeriodTo: z.string().optional().describe('Equipment usage end (ISO 8601)'),
      location: z.string().optional().describe('Subproject location'),
      memo: z.string().optional().describe('Notes')
    })
  )
  .output(
    z.object({
      subprojectId: z.number().describe('ID of the newly created subproject'),
      name: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.equipmentPeriodFrom)
      body.equipment_period_from = ctx.input.equipmentPeriodFrom;
    if (ctx.input.equipmentPeriodTo) body.equipment_period_to = ctx.input.equipmentPeriodTo;
    if (ctx.input.location) body.location = ctx.input.location;
    if (ctx.input.memo) body.memo = ctx.input.memo;

    let result = await client.createNested(
      'projects',
      ctx.input.projectId,
      'subprojects',
      body
    );
    let s = result.data as any;

    return {
      output: {
        subprojectId: s.id,
        name: s.name,
        createdAt: s.created
      },
      message: `Created subproject **${s.name}** (ID: ${s.id}) under project **${ctx.input.projectId}**.`
    };
  })
  .build();
