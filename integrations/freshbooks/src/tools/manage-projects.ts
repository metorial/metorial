import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    projectId: z.number(),
    title: z.string().nullable().optional(),
    clientId: z.number().nullable().optional(),
    projectType: z.string().nullable().optional(),
    fixedPrice: z.string().nullable().optional(),
    rate: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    complete: z.boolean().nullable().optional(),
    active: z.boolean().nullable().optional(),
    loggedDuration: z.number().nullable().optional().describe('Total logged time in seconds')
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let manageProjects = SlateTool.create(spec, {
  name: 'Manage Projects',
  key: 'manage_projects',
  description: `Create, update, or delete projects in FreshBooks. Projects are associated with clients and can be either fixed-price or hourly-rate. Time entries can be logged against projects. Select the account or business discovered by get_identity.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      projectId: z.number().optional().describe('Project ID (required for update/delete)'),
      title: z.string().optional().describe('Project title (required for create)'),
      clientId: z.number().optional().describe('Client ID (required for create)'),
      projectType: z
        .enum(['fixed_price', 'hourly_rate'])
        .optional()
        .describe('Project billing type (required for create)'),
      fixedPrice: z
        .string()
        .optional()
        .describe('Fixed price amount (for fixed_price projects)'),
      rate: z.string().optional().describe('Hourly rate (for hourly_rate projects)'),
      description: z.string().optional().describe('Project description'),
      dueDate: z.string().optional().describe('Project due date (YYYY-MM-DD)'),
      complete: z.boolean().optional().describe('Whether the project is complete')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_projects', ctx, outputSchema))
  .build();
