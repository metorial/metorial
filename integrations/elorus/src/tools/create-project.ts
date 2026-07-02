import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Elorus. Projects help monitor finances, track time, and organize tasks and expenses.`
})
  .input(
    z.object({
      title: z.string().describe('Project name.'),
      description: z.string().optional().describe('Project description.'),
      clientId: z
        .string()
        .optional()
        .describe('Contact ID of the client this project is for.'),
      budget: z.string().optional().describe('Project budget amount (as string).'),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code for the budget (e.g. "EUR").'),
      hourlyRate: z.string().optional().describe('Hourly rate for time tracking (as string).')
    })
  )
  .output(
    z.object({
      project: z.any().describe('The newly created project object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: any = {
      title: ctx.input.title
    };
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.clientId) body.client = ctx.input.clientId;
    if (ctx.input.budget) body.budget = ctx.input.budget;
    if (ctx.input.currencyCode) body.currency_code = ctx.input.currencyCode;
    if (ctx.input.hourlyRate) body.hourly_rate = ctx.input.hourlyRate;

    let project = await client.createProject(body);

    return {
      output: { project },
      message: `Created project: **${project.title}** (ID: ${project.id})`
    };
  })
  .build();
