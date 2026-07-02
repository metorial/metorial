import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProjectTool = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a Crowdin project. When creating, provide a name and source language. When updating, provide the project ID and the fields to change. When deleting, provide the project ID and set the action to "delete".`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      projectId: z.number().optional().describe('Project ID (required for update/delete)'),
      name: z.string().optional().describe('Project name (required for create)'),
      sourceLanguageId: z
        .string()
        .optional()
        .describe('Source language code (required for create, e.g. "en")'),
      targetLanguageIds: z.array(z.string()).optional().describe('Target language codes'),
      identifier: z.string().optional().describe('Project slug/identifier'),
      type: z.number().optional().describe('Project type (0=file-based, 1=string-based)'),
      visibility: z.enum(['open', 'private']).optional().describe('Project visibility'),
      description: z.string().optional().describe('Project description')
    })
  )
  .output(
    z.object({
      projectId: z.number().optional().describe('Project ID'),
      name: z.string().optional().describe('Project name'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.sourceLanguageId) {
        throw new Error('Name and sourceLanguageId are required for project creation');
      }

      let project = await client.createProject({
        name: ctx.input.name,
        sourceLanguageId: ctx.input.sourceLanguageId,
        targetLanguageIds: ctx.input.targetLanguageIds,
        identifier: ctx.input.identifier,
        type: ctx.input.type,
        visibility: ctx.input.visibility,
        description: ctx.input.description
      });

      return {
        output: {
          projectId: project.id,
          name: project.name
        },
        message: `Created project **${project.name}** (ID: ${project.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.projectId) {
        throw new Error('projectId is required for update');
      }

      let patches: Array<{ op: string; path: string; value: any }> = [];
      if (ctx.input.name !== undefined)
        patches.push({ op: 'replace', path: '/name', value: ctx.input.name });
      if (ctx.input.description !== undefined)
        patches.push({ op: 'replace', path: '/description', value: ctx.input.description });
      if (ctx.input.targetLanguageIds !== undefined)
        patches.push({
          op: 'replace',
          path: '/targetLanguageIds',
          value: ctx.input.targetLanguageIds
        });
      if (ctx.input.visibility !== undefined)
        patches.push({ op: 'replace', path: '/visibility', value: ctx.input.visibility });

      let project = await client.updateProject(ctx.input.projectId, patches);

      return {
        output: {
          projectId: project.id,
          name: project.name
        },
        message: `Updated project **${project.name}** (ID: ${project.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.projectId) {
        throw new Error('projectId is required for delete');
      }

      await client.deleteProject(ctx.input.projectId);

      return {
        output: {
          projectId: ctx.input.projectId,
          deleted: true
        },
        message: `Deleted project with ID **${ctx.input.projectId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
