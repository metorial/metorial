import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

export let manageTemplate = SlateTool.create(spec, {
  name: 'Manage Template',
  key: 'manage_template',
  description: `Create, update, duplicate, or delete a Bannerbear design template. Also supports importing templates from the Bannerbear public library. Use this tool to manage the templates that serve as the basis for image, video, and GIF generation.`,
  instructions: [
    'Set the **action** field to choose which operation to perform.',
    'For "create": provide name, width, and height. For "update": provide templateUid and fields to update. For "duplicate": provide templateUid. For "delete": provide templateUid. For "import": provide publicationIds.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'duplicate', 'delete', 'import'])
        .describe('Operation to perform'),
      templateUid: z
        .string()
        .optional()
        .describe('UID of the template (required for update, duplicate, delete)'),
      name: z.string().optional().describe('Template name (for create or update)'),
      width: z.number().optional().describe('Template width in pixels (for create)'),
      height: z.number().optional().describe('Template height in pixels (for create)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to assign to the template (for create or update)'),
      metadata: z.string().optional().describe('Custom metadata (for create or update)'),
      publicationIds: z
        .array(z.string())
        .optional()
        .describe('IDs of library publications to import (for import action)')
    })
  )
  .output(
    z.object({
      templateUid: z
        .string()
        .optional()
        .describe('UID of the created/updated/duplicated template'),
      name: z.string().optional().describe('Template name'),
      width: z.number().optional().describe('Template width'),
      height: z.number().optional().describe('Template height'),
      previewUrl: z.string().nullable().optional().describe('Preview image URL'),
      tags: z.array(z.string()).optional().describe('Template tags'),
      deleted: z.boolean().optional().describe('True if the template was deleted'),
      importedTemplates: z
        .array(
          z.object({
            templateUid: z.string().describe('UID of the imported template'),
            name: z.string().describe('Name of the imported template')
          })
        )
        .optional()
        .describe('List of imported templates (for import action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.width || !ctx.input.height) {
        throw new Error('name, width, and height are required for creating a template');
      }
      let result = await client.createTemplate({
        name: ctx.input.name,
        width: ctx.input.width,
        height: ctx.input.height,
        tags: ctx.input.tags,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          templateUid: result.uid,
          name: result.name,
          width: result.width,
          height: result.height,
          previewUrl: result.preview_url || null,
          tags: result.tags || []
        },
        message: `Template **${result.name}** created (UID: ${result.uid}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.templateUid)
        throw new Error('templateUid is required for updating a template');
      let result = await client.updateTemplate(ctx.input.templateUid, {
        name: ctx.input.name,
        tags: ctx.input.tags,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          templateUid: result.uid,
          name: result.name,
          width: result.width,
          height: result.height,
          previewUrl: result.preview_url || null,
          tags: result.tags || []
        },
        message: `Template **${result.name}** updated.`
      };
    }

    if (action === 'duplicate') {
      if (!ctx.input.templateUid)
        throw new Error('templateUid is required for duplicating a template');
      let result = await client.duplicateTemplate(ctx.input.templateUid);
      return {
        output: {
          templateUid: result.uid,
          name: result.name,
          width: result.width,
          height: result.height,
          previewUrl: result.preview_url || null,
          tags: result.tags || []
        },
        message: `Template duplicated. New template: **${result.name}** (UID: ${result.uid}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.templateUid)
        throw new Error('templateUid is required for deleting a template');
      await client.deleteTemplate(ctx.input.templateUid);
      return {
        output: {
          deleted: true
        },
        message: `Template ${ctx.input.templateUid} deleted.`
      };
    }

    if (action === 'import') {
      if (!ctx.input.publicationIds || ctx.input.publicationIds.length === 0) {
        throw new Error('publicationIds are required for importing templates');
      }
      let results = await client.importTemplates(ctx.input.publicationIds);
      let imported = (Array.isArray(results) ? results : [results]).map((t: any) => ({
        templateUid: t.uid,
        name: t.name
      }));
      return {
        output: {
          importedTemplates: imported
        },
        message: `Imported ${imported.length} template(s) from the Bannerbear library.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
