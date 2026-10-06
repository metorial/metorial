import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { reject, text, uid } from '../lib/contracts';
import { templateOutput } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
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
      projectId: projectIdSchema,
      action: z
        .enum(['create', 'update', 'duplicate', 'delete', 'import'])
        .describe('Operation to perform'),
      templateUid: z
        .string()
        .optional()
        .describe('UID of the template (required for update, duplicate, delete)'),
      name: z.string().optional().describe('Template name (for create or update)'),
      width: z.number().optional().describe('Template width in pixels (for create or update)'),
      height: z
        .number()
        .optional()
        .describe('Template height in pixels (for create or update)'),
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
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const { action } = ctx.input;
    const contentFields = ['name', 'width', 'height', 'tags', 'metadata'] as const;
    if (
      ['duplicate', 'delete', 'import'].includes(action) &&
      contentFields.some(field => ctx.input[field] !== undefined)
    )
      reject('Template field changes apply only to create or update.');
    if (action !== 'import' && ctx.input.publicationIds !== undefined)
      reject('publicationIds apply only to import.');
    if ((action === 'create' || action === 'import') && ctx.input.templateUid !== undefined)
      reject('templateUid does not apply to create or import.');
    const body = {
      name: ctx.input.name,
      width: ctx.input.width,
      height: ctx.input.height,
      tags: ctx.input.tags,
      metadata: ctx.input.metadata
    };
    if (action === 'delete') {
      await client.deleteTemplate(uid(ctx.input.templateUid));
      return {
        output: { templateUid: ctx.input.templateUid, deleted: true },
        message: 'The exact template was deleted. Its deletion is permanent.'
      };
    }
    if (action === 'import') {
      const importedTemplates = (
        await client.importTemplates(ctx.input.publicationIds ?? [])
      ).map(item => ({ templateUid: uid(item.uid), name: text(item.name) }));
      return {
        output: { importedTemplates },
        message: `Imported ${importedTemplates.length} template(s).`
      };
    }
    const result =
      action === 'create'
        ? await client.createTemplate(body)
        : action === 'update'
          ? await client.updateTemplate(uid(ctx.input.templateUid), body)
          : await client.duplicateTemplate(uid(ctx.input.templateUid));
    const output = templateOutput(result);
    return { output, message: `Template ${action} completed (UID: ${output.templateUid}).` };
  })
  .build();
