import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let manageTemplates = SlateTool.create(spec, {
  name: 'Manage Templates',
  key: 'manage_templates',
  description: `Create, retrieve, update, delete, clone, or render email templates in Klaviyo.
Templates are used in campaigns and flows for composing email content. Supports HTML and drag-and-drop editor types.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'clone', 'render'])
        .describe('Action to perform'),
      templateId: z
        .string()
        .optional()
        .describe('Template ID (required for get, update, delete, clone, render)'),
      name: z.string().optional().describe('Template name (required for create and clone)'),
      html: z.string().optional().describe('HTML content for the template'),
      editorType: z
        .enum(['CODE', 'USER_DRAGGABLE'])
        .optional()
        .describe('Editor type (default CODE for HTML templates)'),
      renderContext: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template variables for render preview'),
      filter: z.string().optional().describe('Filter string for listing templates'),
      sort: z.string().optional().describe('Sort field'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template ID'),
            name: z.string().optional().describe('Template name'),
            editorType: z.string().optional().describe('Editor type'),
            html: z.string().optional().describe('HTML content'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last updated timestamp')
          })
        )
        .optional()
        .describe('Template results'),
      renderedHtml: z.string().optional().describe('Rendered HTML (for render action)'),
      renderedText: z.string().optional().describe('Rendered plain text (for render action)'),
      templateId: z.string().optional().describe('ID of the created/cloned/targeted template'),
      success: z.boolean().describe('Whether the operation succeeded'),
      nextCursor: z.string().optional().describe('Pagination cursor'),
      hasMore: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      action,
      templateId,
      name,
      html,
      editorType,
      renderContext,
      filter,
      sort,
      pageCursor,
      pageSize
    } = ctx.input;

    if (action === 'list') {
      let result = await client.getTemplates({ filter, sort, pageCursor, pageSize });
      let templates = result.data.map(t => ({
        templateId: t.id ?? '',
        name: t.attributes?.name ?? undefined,
        editorType: t.attributes?.editor_type ?? undefined,
        created: t.attributes?.created ?? undefined,
        updated: t.attributes?.updated ?? undefined
      }));
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { templates, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${templates.length}** templates`
      };
    }

    if (action === 'get') {
      if (!templateId) throw new Error('templateId is required');
      let result = await client.getTemplate(templateId);
      let t = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          templates: [
            {
              templateId: t?.id ?? '',
              name: t?.attributes?.name,
              editorType: t?.attributes?.editor_type,
              html: t?.attributes?.html,
              created: t?.attributes?.created,
              updated: t?.attributes?.updated
            }
          ],
          templateId: t?.id,
          success: true
        },
        message: `Retrieved template **${t?.attributes?.name ?? templateId}**`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required for create');
      let result = await client.createTemplate({
        name,
        html: html ?? '<html><body></body></html>',
        editor_type: editorType ?? 'CODE'
      });
      let t = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { templateId: t?.id, success: true },
        message: `Created template **${name}** (${t?.id})`
      };
    }

    if (action === 'update') {
      if (!templateId) throw new Error('templateId is required');
      let attributes: Record<string, any> = {};
      if (name) attributes.name = name;
      if (html) attributes.html = html;
      await client.updateTemplate(templateId, attributes);
      return {
        output: { templateId, success: true },
        message: `Updated template **${templateId}**`
      };
    }

    if (action === 'delete') {
      if (!templateId) throw new Error('templateId is required');
      await client.deleteTemplate(templateId);
      return {
        output: { templateId, success: true },
        message: `Deleted template **${templateId}**`
      };
    }

    if (action === 'clone') {
      if (!templateId) throw new Error('templateId is required');
      if (!name) throw new Error('name is required for clone');
      let result = await client.cloneTemplate(templateId, name);
      let t = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { templateId: t?.id, success: true },
        message: `Cloned template **${templateId}** as **${name}** (${t?.id})`
      };
    }

    if (action === 'render') {
      if (!templateId) throw new Error('templateId is required');
      let result = await client.renderTemplate(templateId, renderContext);
      let rendered = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          renderedHtml: rendered?.attributes?.html ?? undefined,
          renderedText: rendered?.attributes?.text ?? undefined,
          templateId,
          success: true
        },
        message: `Rendered template **${templateId}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
