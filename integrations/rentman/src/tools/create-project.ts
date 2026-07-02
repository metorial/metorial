import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new rental project in Rentman. You can set the project name, location, dates, contact, and other details. The project creation API is in beta and supports a limited set of fields.`,
  constraints: [
    'The project creation endpoint is currently in BETA. Only a limited subset of fields is supported.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      location: z.string().optional().describe('Project location'),
      contact: z.string().optional().describe('Contact reference URI (e.g. "/contacts/123")'),
      planPeriodFrom: z
        .string()
        .optional()
        .describe('Planning period start (ISO 8601 datetime)'),
      planPeriodTo: z.string().optional().describe('Planning period end (ISO 8601 datetime)'),
      equipmentPeriodFrom: z
        .string()
        .optional()
        .describe('Equipment usage start (ISO 8601 datetime)'),
      equipmentPeriodTo: z
        .string()
        .optional()
        .describe('Equipment usage end (ISO 8601 datetime)'),
      memo: z.string().optional().describe('Project memo / notes'),
      projectType: z.string().optional().describe('Project type reference URI'),
      status: z.string().optional().describe('Status reference URI')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the newly created project'),
      name: z.string().optional(),
      number: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.location) body.location = ctx.input.location;
    if (ctx.input.contact) body.contact = ctx.input.contact;
    if (ctx.input.planPeriodFrom) body.planperiod_start = ctx.input.planPeriodFrom;
    if (ctx.input.planPeriodTo) body.planperiod_end = ctx.input.planPeriodTo;
    if (ctx.input.equipmentPeriodFrom)
      body.equipment_period_from = ctx.input.equipmentPeriodFrom;
    if (ctx.input.equipmentPeriodTo) body.equipment_period_to = ctx.input.equipmentPeriodTo;
    if (ctx.input.memo) body.memo = ctx.input.memo;
    if (ctx.input.projectType) body.project_type = ctx.input.projectType;
    if (ctx.input.status) body.status = ctx.input.status;

    let result = await client.create('projects', body);
    let p = result.data as any;

    return {
      output: {
        projectId: p.id,
        name: p.name,
        number: p.number,
        createdAt: p.created
      },
      message: `Created project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();
