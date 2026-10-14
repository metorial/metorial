import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { normalizeUserId, organizationIdSchema, userIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Elorus. Projects help monitor finances, track time, and organize tasks and expenses.`
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
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
        .describe(
          'Projects use the organization base currency; supplying this unsupported field is rejected.'
        ),
      hourlyRate: z.string().optional().describe('Hourly rate for time tracking (as string).'),
      members: z
        .array(
          z.object({
            userId: userIdSchema.describe(
              'User ID from list_users. Prefer the decimal user_id string to preserve long IDs; safe integer numbers are also accepted.'
            ),
            manager: z
              .boolean()
              .optional()
              .describe('Whether this member manages the project.'),
            hourlyRate: z
              .string()
              .optional()
              .describe('Member hourly rate; defaults to an empty value.')
          })
        )
        .optional()
        .describe('Project members allowed to log time. Defaults to no members.'),
      tasks: z
        .array(
          z.object({
            name: z.string().describe('Task name.'),
            description: z.string().optional().describe('Task description.')
          })
        )
        .optional()
        .describe('Project tasks. Defaults to no tasks.')
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
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });

    if (!ctx.input.clientId) {
      throw createApiServiceError('Provide clientId. Use list_contacts to find a client.', {
        reason: 'missing_project_client'
      });
    }
    if (ctx.input.currencyCode !== undefined) {
      throw createApiServiceError(
        'Elorus projects use the organization base currency; omit currencyCode.',
        { reason: 'unsupported_project_currency' }
      );
    }
    if (ctx.input.budget !== undefined && ctx.input.hourlyRate !== undefined) {
      throw createApiServiceError(
        'Choose budget for fixed-cost billing or hourlyRate for hourly billing.',
        { reason: 'conflicting_project_billing' }
      );
    }
    let body: Record<string, unknown> = {
      name: ctx.input.title,
      client: ctx.input.clientId,
      billing_method: ctx.input.hourlyRate !== undefined ? 'project_rate' : 'fixed_cost',
      members: (ctx.input.members ?? []).map(member => ({
        member: normalizeUserId(member.userId),
        manager: member.manager ?? false,
        hourly_rate: member.hourlyRate ?? ''
      })),
      tasks: ctx.input.tasks ?? []
    };
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.clientId) body.client = ctx.input.clientId;
    if (ctx.input.budget) body.fixed_cost = ctx.input.budget;
    if (ctx.input.hourlyRate) body.hourly_rate = ctx.input.hourlyRate;

    let project = await client.createProject(body);

    return {
      output: { project },
      message: `Created project: **${project.name}** (ID: ${project.id})`
    };
  })
  .build();
