import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema } from '../lib/schemas';
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
          'semantic-segmentation',
          'keypoint-detection'
        ])
        .describe('Type of computer vision task'),
      annotationGroup: z
        .string()
        .optional()
        .describe(
          'Noun describing the labels, such as objects or defects. Defaults to objects.'
        ),
      license: z
        .enum([
          'Public Domain',
          'MIT',
          'CC BY 4.0',
          'BY-NC-SA 4.0',
          'OdBL v1.0',
          'OBdL v1.0',
          'Private'
        ])
        .optional()
        .describe('License for the project dataset')
    })
  )
  .output(
    z.object({
      projectId: projectIdSchema,
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
      annotation: ctx.input.annotationGroup ?? 'objects',
      license: ctx.input.license === 'OdBL v1.0' ? 'OBdL v1.0' : ctx.input.license
    });

    if (typeof result.id !== 'string' || !result.id) {
      throw createApiServiceError(
        'Roboflow created the project without returning a usable ID. Check list_projects before retrying.'
      );
    }

    return {
      output: {
        projectId: result.id,
        name: result.name || ctx.input.name,
        type: result.type || ctx.input.type
      },
      message: `Created project **${result.name || ctx.input.name}** of type **${ctx.input.type}**.`
    };
  })
  .build();
