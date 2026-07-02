import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { asanaServiceError } from '../lib/errors';
import { spec } from '../spec';

let projectTemplateSchema = z.object({
  projectTemplateId: z.string(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  requestedDates: z.array(z.any()).optional(),
  team: z.any().optional(),
  workspace: z.any().optional()
});

let formatProjectTemplate = (template: any) => ({
  projectTemplateId: template.gid,
  name: template.name,
  description: template.description,
  color: template.color,
  isPublic: template.public,
  requestedDates: template.requested_dates,
  team: template.team,
  workspace: template.workspace
});

let requireField = <T>(value: T | undefined | null, label: string, action: string): T => {
  if (value === undefined || value === null || value === '') {
    throw asanaServiceError(`${label} is required for "${action}".`);
  }

  return value;
};

export let manageProjectTemplates = SlateTool.create(spec, {
  name: 'Manage Project Templates',
  key: 'manage_project_templates',
  description: `List, inspect, and instantiate Asana project templates.`,
  instructions: [
    'Use action "list" with workspaceId or teamId to discover templates.',
    'Use action "get" before instantiating to inspect requestedDates.',
    'Use action "instantiate" with projectTemplateId and name; Asana returns an async job.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'instantiate'])
        .describe('Project template operation to perform.'),
      workspaceId: z.string().optional().describe('Workspace GID for list action.'),
      teamId: z.string().optional().describe('Team GID for list or instantiate action.'),
      projectTemplateId: z
        .string()
        .optional()
        .describe('Project template GID for get/instantiate actions.'),
      name: z.string().optional().describe('Name for the instantiated project.'),
      requestedDates: z
        .array(
          z.object({
            gid: z.string().describe('Requested date variable GID from the template.'),
            value: z.string().describe('Date value in YYYY-MM-DD format.')
          })
        )
        .optional()
        .describe('Requested date values required by the template.'),
      public: z
        .boolean()
        .optional()
        .describe('Whether the instantiated project is public when supported.'),
      limit: z.number().optional().describe('Maximum project templates to return.')
    })
  )
  .output(
    z.object({
      projectTemplates: z.array(projectTemplateSchema).optional(),
      projectTemplate: projectTemplateSchema.optional(),
      job: z.any().optional(),
      jobId: z.string().optional(),
      projectTemplateCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (!ctx.input.workspaceId && !ctx.input.teamId) {
        throw asanaServiceError('workspaceId or teamId is required for "list".');
      }

      let result = await client.listProjectTemplates({
        workspaceId: ctx.input.workspaceId,
        teamId: ctx.input.teamId,
        limit: ctx.input.limit
      });
      let projectTemplates = (result.data || []).map(formatProjectTemplate);

      return {
        output: { projectTemplates, projectTemplateCount: projectTemplates.length },
        message: `Found **${projectTemplates.length}** project template(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let projectTemplateId = requireField(
        ctx.input.projectTemplateId,
        'projectTemplateId',
        ctx.input.action
      );
      let projectTemplate = formatProjectTemplate(
        await client.getProjectTemplate(projectTemplateId)
      );

      return {
        output: { projectTemplate, projectTemplateCount: 1 },
        message: `Retrieved project template **${projectTemplate.name ?? projectTemplateId}**.`
      };
    }

    let projectTemplateId = requireField(
      ctx.input.projectTemplateId,
      'projectTemplateId',
      ctx.input.action
    );
    let name = requireField(ctx.input.name, 'name', ctx.input.action);
    let data: Record<string, any> = { name };
    if (ctx.input.teamId) data.team = ctx.input.teamId;
    if (ctx.input.requestedDates) data.requested_dates = ctx.input.requestedDates;
    if (ctx.input.public !== undefined) data.public = ctx.input.public;

    let job = await client.instantiateProjectTemplate(projectTemplateId, data);

    return {
      output: { job, jobId: job.gid },
      message: `Started project template instantiation job ${job.gid ?? ''}.`
    };
  })
  .build();
