import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Timely. Configure client, billing, budget, hourly rate, label settings, team assignments, and user assignments with individual rates.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      clientId: z.string().optional().describe('Client ID to associate with'),
      color: z.string().optional().describe('Color hex code (e.g., "67a3bc")'),
      billable: z.boolean().optional().describe('Whether the project is billable'),
      budget: z.number().optional().describe('Budget amount'),
      budgetType: z.string().optional().describe('Budget type (e.g., "hours", "money")'),
      hourRate: z.number().optional().describe('Project hourly rate'),
      rateType: z
        .enum(['project', 'user'])
        .optional()
        .describe('Rate type — project-level or per-user'),
      requiredNotes: z.boolean().optional().describe('Require notes on time entries'),
      requiredLabels: z.boolean().optional().describe('Require labels on time entries'),
      enableLabels: z
        .enum(['all', 'none', 'custom'])
        .optional()
        .describe('Label access setting'),
      externalId: z.string().optional().describe('External reference ID'),
      teamIds: z.array(z.number()).optional().describe('Team IDs to assign'),
      labelIds: z.array(z.number()).optional().describe('Label IDs to associate'),
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            hourRate: z.number().optional().describe('Custom hourly rate for this user')
          })
        )
        .optional()
        .describe('Users to assign with optional individual rates')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Created project ID'),
      name: z.string().describe('Project name'),
      clientName: z.string().nullable().describe('Associated client name'),
      billable: z.boolean().describe('Billable status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let project = await client.createProject({
      name: ctx.input.name,
      description: ctx.input.description,
      clientId: ctx.input.clientId,
      color: ctx.input.color,
      billable: ctx.input.billable,
      budget: ctx.input.budget,
      budgetType: ctx.input.budgetType,
      hourRate: ctx.input.hourRate,
      rateType: ctx.input.rateType,
      requiredNotes: ctx.input.requiredNotes,
      requiredLabels: ctx.input.requiredLabels,
      enableLabels: ctx.input.enableLabels,
      externalId: ctx.input.externalId,
      teamIds: ctx.input.teamIds,
      labelIds: ctx.input.labelIds,
      users: ctx.input.users
    });

    return {
      output: {
        projectId: project.id,
        name: project.name,
        clientName: project.client?.name ?? null,
        billable: project.billable ?? true
      },
      message: `Created project **${project.name}** (ID: ${project.id})${project.client?.name ? ` for client **${project.client.name}**` : ''}.`
    };
  })
  .build();
