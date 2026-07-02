import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacidClient } from '../lib/client';
import { spec } from '../spec';

let layerSchema = z.object({
  name: z.string().describe('Layer name as defined in the template editor'),
  type: z
    .string()
    .describe('Layer type (text, picture, shape, browserframe, barcode, rating, subtitle)')
});

let templateOutputSchema = z.object({
  templateUuid: z.string().describe('Unique template UUID'),
  title: z.string().describe('Template title'),
  thumbnail: z.string().nullable().describe('Thumbnail preview URL'),
  tags: z.array(z.string()).describe('Template tags'),
  customData: z.string().nullable().describe('Custom reference data'),
  layers: z.array(layerSchema).describe('Dynamic layers available for customization')
});

export let manageTemplates = SlateTool.create(spec, {
  name: 'Manage Templates',
  key: 'manage_templates',
  description: `List, retrieve, create, update, or delete Placid design templates. Templates define reusable layouts with dynamic layers that can be populated with data during image, PDF, or video generation.`,
  instructions: [
    'Use action "list" to browse templates. Filter by collection or title, and control sort order.',
    'Use action "get" to retrieve a specific template and see its available layers.',
    'Use action "create" to make a new template from scratch or duplicate an existing one.',
    'Use action "update" to modify a template\'s title, tags, or custom data.',
    'Use action "delete" to permanently remove a template.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      templateUuid: z
        .string()
        .optional()
        .describe('Template UUID (required for get, update, delete)'),
      title: z
        .string()
        .optional()
        .describe('Template title (required for create; optional for update)'),
      width: z.number().optional().describe('Template width in pixels (for create)'),
      height: z.number().optional().describe('Template height in pixels (for create)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags for the template (max 10; for create or update)'),
      customData: z
        .string()
        .optional()
        .describe('Custom reference data (max 255 chars; for create or update)'),
      fromTemplate: z
        .string()
        .optional()
        .describe('UUID of template to duplicate from (for create)'),
      addToCollections: z
        .array(z.string())
        .optional()
        .describe('Collection IDs to add the template to (for create)'),
      collectionId: z
        .string()
        .optional()
        .describe('Filter templates by collection ID (for list)'),
      titleFilter: z.string().optional().describe('Filter templates by title (for list)'),
      orderBy: z
        .string()
        .optional()
        .describe(
          'Sort order: "created_at-asc", "created_at-desc", "updated_at-asc", "updated_at-desc", "title-asc", "title-desc" (for list)'
        ),
      page: z.number().optional().describe('Page number for pagination (for list)')
    })
  )
  .output(
    z.object({
      template: templateOutputSchema
        .optional()
        .describe('Single template (for get, create, update)'),
      templates: z
        .array(templateOutputSchema)
        .optional()
        .describe('List of templates (for list)'),
      hasNextPage: z
        .boolean()
        .optional()
        .describe('Whether more pages are available (for list)'),
      deleted: z.boolean().optional().describe('Whether the template was deleted (for delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacidClient({ token: ctx.auth.token });

    let mapTemplate = (t: {
      uuid: string;
      title: string;
      thumbnail: string | null;
      tags: string[];
      custom_data: string | null;
      layers: Array<{ name: string; type: string }>;
    }) => ({
      templateUuid: t.uuid,
      title: t.title,
      thumbnail: t.thumbnail,
      tags: t.tags,
      customData: t.custom_data,
      layers: t.layers
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listTemplates({
          collectionId: ctx.input.collectionId,
          titleFilter: ctx.input.titleFilter,
          orderBy: ctx.input.orderBy,
          page: ctx.input.page
        });
        let templates = result.data.map(mapTemplate);
        return {
          output: {
            templates,
            hasNextPage: result.links.next !== null
          },
          message: `Found **${templates.length}** template(s).${result.links.next ? ' More pages available.' : ''}`
        };
      }

      case 'get': {
        if (!ctx.input.templateUuid)
          throw new Error('templateUuid is required for "get" action');
        let template = await client.getTemplate(ctx.input.templateUuid);
        return {
          output: { template: mapTemplate(template) },
          message: `Template **"${template.title}"** has **${template.layers.length}** dynamic layer(s): ${template.layers.map(l => `${l.name} (${l.type})`).join(', ')}.`
        };
      }

      case 'create': {
        if (!ctx.input.title) throw new Error('title is required for "create" action');
        let template = await client.createTemplate({
          title: ctx.input.title,
          width: ctx.input.width,
          height: ctx.input.height,
          tags: ctx.input.tags,
          customData: ctx.input.customData,
          fromTemplate: ctx.input.fromTemplate,
          addToCollections: ctx.input.addToCollections
        });
        return {
          output: { template: mapTemplate(template) },
          message: ctx.input.fromTemplate
            ? `Template **"${template.title}"** created by duplicating from \`${ctx.input.fromTemplate}\`.`
            : `Template **"${template.title}"** created (${ctx.input.width}x${ctx.input.height}).`
        };
      }

      case 'update': {
        if (!ctx.input.templateUuid)
          throw new Error('templateUuid is required for "update" action');
        let template = await client.updateTemplate(ctx.input.templateUuid, {
          title: ctx.input.title,
          tags: ctx.input.tags,
          customData: ctx.input.customData
        });
        return {
          output: { template: mapTemplate(template) },
          message: `Template **"${template.title}"** updated.`
        };
      }

      case 'delete': {
        if (!ctx.input.templateUuid)
          throw new Error('templateUuid is required for "delete" action');
        await client.deleteTemplate(ctx.input.templateUuid);
        return {
          output: { deleted: true },
          message: `Template \`${ctx.input.templateUuid}\` deleted.`
        };
      }
    }
  })
  .build();
