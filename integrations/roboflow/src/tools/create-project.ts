import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createProjectTool = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new computer vision project in the workspace. Supports object detection, classification (single and multi-label), instance segmentation, and semantic segmentation project types.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new project'),
      type: z
        .enum([
          'object-detection',
          'single-label-classification',
          'multi-label-classification',
          'instance-segmentation',
          'semantic-segmentation'
        ])
        .describe('Type of computer vision task'),
      annotationGroup: z
        .string()
        .optional()
        .describe('Annotation group name for organizing related projects'),
      license: z
        .enum(['Public Domain', 'MIT', 'CC BY 4.0', 'BY-NC-SA 4.0', 'OdBL v1.0', 'Private'])
        .optional()
        .describe('License for the project dataset')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique project identifier'),
      name: z.string().describe('Name of the created project'),
      type: z.string().describe('Project type')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();

    let result = await client.createProject(workspaceId, {
      name: ctx.input.name,
      type: ctx.input.type,
      annotation: ctx.input.annotationGroup,
      license: ctx.input.license
    });

    return {
      output: {
        projectId: result.id || result.url || ctx.input.name,
        name: result.name || ctx.input.name,
        type: result.type || ctx.input.type
      },
      message: `Created project **${result.name || ctx.input.name}** of type **${ctx.input.type}**.`
    };
  })
  .build();
