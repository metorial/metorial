import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Agiled. Define the project name, details, deadlines, budget, and assign it to a client.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      summary: z.string().optional().describe('Brief summary of the project'),
      notes: z.string().optional().describe('Detailed project notes'),
      startDate: z.string().optional().describe('Project start date (YYYY-MM-DD)'),
      deadline: z.string().optional().describe('Project deadline (YYYY-MM-DD)'),
      clientId: z
        .string()
        .optional()
        .describe('ID of the client/contact to associate with the project'),
      budget: z.number().optional().describe('Project budget amount'),
      status: z
        .string()
        .optional()
        .describe('Project status (e.g. "not started", "in progress", "completed")')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the created project'),
      name: z.string().describe('Name of the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createProject({
      project_name: ctx.input.name,
      project_summary: ctx.input.summary,
      notes: ctx.input.notes,
      start_date: ctx.input.startDate,
      deadline: ctx.input.deadline,
      client_id: ctx.input.clientId,
      project_budget: ctx.input.budget,
      status: ctx.input.status
    });

    let project = result.data;

    return {
      output: {
        projectId: String(project.id ?? ''),
        name: String(project.project_name ?? ctx.input.name)
      },
      message: `Created project **${ctx.input.name}**.`
    };
  })
  .build();
