import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in Timely. Modify name, description, client, billing, budget, rates, label settings, team assignments, user assignments, or archive/unarchive it.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('Updated project name'),
      description: z.string().optional().describe('Updated description'),
      clientId: z.string().optional().describe('Updated client ID'),
      color: z.string().optional().describe('Updated color hex code'),
      billable: z.boolean().optional().describe('Updated billable status'),
      budget: z.number().optional().describe('Updated budget amount'),
      budgetType: z.string().optional().describe('Updated budget type'),
      hourRate: z.number().optional().describe('Updated hourly rate'),
      rateType: z.enum(['project', 'user']).optional().describe('Updated rate type'),
      requiredNotes: z.boolean().optional().describe('Require notes on entries'),
      requiredLabels: z.boolean().optional().describe('Require labels on entries'),
      enableLabels: z
        .enum(['all', 'none', 'custom'])
        .optional()
        .describe('Label access setting'),
      externalId: z.string().optional().describe('Updated external reference ID'),
      teamIds: z.array(z.number()).optional().describe('Updated team IDs'),
      labelIds: z.array(z.number()).optional().describe('Updated label IDs'),
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            hourRate: z.number().optional().describe('Custom hourly rate')
          })
        )
        .optional()
        .describe('Updated user assignments'),
      active: z.boolean().optional().describe('Set to false to archive the project')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Updated project ID'),
      name: z.string().describe('Project name'),
      active: z.boolean().describe('Whether the project is active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let project = await client.updateProject(ctx.input.projectId, {
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
      users: ctx.input.users,
      active: ctx.input.active
    });

    return {
      output: {
        projectId: project.id,
        name: project.name,
        active: project.active ?? true
      },
      message: `Updated project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();
