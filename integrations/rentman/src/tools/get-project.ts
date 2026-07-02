import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific Rentman project by its ID. Optionally include related subprojects, equipment groups, crew assignments, and cost items.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z.number().describe('The ID of the project to retrieve'),
      includeSubprojects: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also fetch subprojects'),
      includeEquipmentGroups: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also fetch equipment groups'),
      includeCrew: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also fetch crew assignments')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Unique project ID'),
      name: z.string().optional(),
      number: z.string().optional(),
      status: z.string().optional(),
      projectType: z.string().optional(),
      location: z.string().optional(),
      inDate: z.string().optional(),
      outDate: z.string().optional(),
      planPeriodFrom: z.string().optional(),
      planPeriodTo: z.string().optional(),
      contact: z.string().optional(),
      memo: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      subprojects: z.array(z.record(z.string(), z.any())).optional(),
      equipmentGroups: z.array(z.record(z.string(), z.any())).optional(),
      crewAssignments: z.array(z.record(z.string(), z.any())).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.get('projects', ctx.input.projectId);
    let p = result.data as any;

    let output: any = {
      projectId: p.id,
      name: p.name,
      number: p.number,
      status: p.status,
      projectType: p.project_type,
      location: p.location,
      inDate: p.equipment_period_from || p.in,
      outDate: p.equipment_period_to || p.out,
      planPeriodFrom: p.planperiod_start,
      planPeriodTo: p.planperiod_end,
      contact: p.contact,
      memo: p.memo,
      createdAt: p.created,
      updatedAt: p.modified
    };

    if (ctx.input.includeSubprojects) {
      let subs = await client.listNested('projects', ctx.input.projectId, 'subprojects');
      output.subprojects = subs.data;
    }

    if (ctx.input.includeEquipmentGroups) {
      let groups = await client.listNested(
        'projects',
        ctx.input.projectId,
        'projectequipmentgroup'
      );
      output.equipmentGroups = groups.data;
    }

    if (ctx.input.includeCrew) {
      let crew = await client.listNested('projects', ctx.input.projectId, 'crew');
      output.crewAssignments = crew.data;
    }

    return {
      output,
      message: `Retrieved project **${output.name || output.projectId}**${output.number ? ` (#${output.number})` : ''}.`
    };
  })
  .build();
