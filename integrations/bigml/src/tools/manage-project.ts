import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create or update a BigML project. Projects organize resources into logical groups. Resources can be assigned to a project during creation, and all child resources inherit the project from their parent source.`,
  constraints: ['Deleting a project also deletes all resources within it.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Existing project ID to update. If omitted, creates a new project.'),
      name: z.string().optional().describe('Name for the project'),
      description: z.string().optional().describe('Description for the project'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      category: z.number().optional().describe('Category code for the project')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the project'),
      name: z.string().optional().describe('Project name'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.category !== undefined) body.category = ctx.input.category;

    let result: any;

    if (ctx.input.projectId) {
      result = await client.updateResource(ctx.input.projectId, body);
      return {
        output: {
          resourceId: result.resource ?? ctx.input.projectId,
          name: result.name ?? ctx.input.name,
          created: result.created
        },
        message: `Project **${ctx.input.projectId}** updated${ctx.input.name ? ` to "${ctx.input.name}"` : ''}.`
      };
    } else {
      result = await client.createResource('project', body);
      return {
        output: {
          resourceId: result.resource,
          name: result.name,
          created: result.created
        },
        message: `Project **${result.resource}** created${result.name ? ` as "${result.name}"` : ''}.`
      };
    }
  })
  .build();
