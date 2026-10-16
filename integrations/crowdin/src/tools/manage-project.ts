import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { rawSchema } from '../lib/schemas';
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
      projectId: z
        .number()
        .optional()
        .describe('Project ID from list_projects (required for update/delete)'),
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
      raw: rawSchema,
      projectId: z.number().optional().describe('Project ID'),
      name: z.string().optional().describe('Project name'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (ctx.input.type !== undefined && ctx.input.type !== 0 && ctx.input.type !== 1)
      throw createApiServiceError('Project type must be 0 (file-based) or 1 (string-based).');
    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.sourceLanguageId) {
        throw createApiServiceError(
          'Name and sourceLanguageId are required for project creation'
        );
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
        output: { raw: client.lastResponse, projectId: project.id, name: project.name },
        message: `Created project **${project.name}** (ID: ${project.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.projectId) {
        throw createApiServiceError('projectId is required for update');
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

      if (!patches.length)
        throw createApiServiceError('Provide at least one project field to update.');
      let project = await client.updateProject(ctx.input.projectId, patches);

      return {
        output: { raw: client.lastResponse, projectId: project.id, name: project.name },
        message: `Updated project **${project.name}** (ID: ${project.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.projectId) {
        throw createApiServiceError('projectId is required for delete');
      }

      await client.deleteProject(ctx.input.projectId);

      return {
        output: { raw: client.lastResponse, projectId: ctx.input.projectId, deleted: true },
        message: `Deleted project with ID **${ctx.input.projectId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
