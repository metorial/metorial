import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let managePage = SlateTool.create(spec, {
  name: 'Manage Page',
  key: 'manage_page',
  description: `Creates, updates, deletes, publishes, or unpublishes a page via the Management API. Combines all page lifecycle operations into one tool. Requires OAuth authentication.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['save', 'delete', 'publish', 'unpublish'])
        .describe('Operation to perform on the page'),
      pageId: z
        .number()
        .optional()
        .describe(
          'Page ID. Required for update, delete, publish, unpublish. Omit for create.'
        ),
      name: z.string().optional().describe('Page name (for save operations)'),
      title: z.string().optional().describe('Page title (for save operations)'),
      templateId: z.number().optional().describe('Page template ID (for save operations)'),
      parentPageId: z
        .number()
        .optional()
        .describe('Parent page ID for positioning in the tree (for save operations)'),
      pageData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional page data fields to set'),
      locale: z.string().optional().describe('Locale code override')
    })
  )
  .output(
    z.object({
      pageId: z.number().optional().describe('Page ID of the affected page'),
      batchId: z
        .number()
        .optional()
        .describe('Queued batch ID. Use get_batch_status if success is false.'),
      success: z.boolean().describe('Whether the write batch completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region,
      authMethod: ctx.auth.authMethod
    });

    for (let [name, value] of Object.entries({
      pageId: ctx.input.pageId,
      templateId: ctx.input.templateId,
      parentPageId: ctx.input.parentPageId
    })) {
      if (value !== undefined && !Number.isInteger(value)) {
        throw createApiServiceError(`${name} must be a whole number.`);
      }
    }
    if (ctx.input.operation !== 'save') {
      if (ctx.input.pageId === undefined || ctx.input.pageId <= 0) {
        throw createApiServiceError(
          `A positive pageId is required for ${ctx.input.operation}.`
        );
      }
      let operations = {
        delete: () => client.deletePage(ctx.input.pageId!),
        publish: () => client.publishPage(ctx.input.pageId!),
        unpublish: () => client.unpublishPage(ctx.input.pageId!)
      };
      let result = await operations[ctx.input.operation]();
      return {
        output: {
          pageId: ctx.input.pageId,
          batchId: result.batchId,
          success: result.completed
        },
        message: result.completed
          ? `Completed **${ctx.input.operation}** for page **#${ctx.input.pageId}**`
          : `Page operation is still pending in batch **#${result.batchId}**. Call get_batch_status to check completion.`
      };
    }
    let updating = ctx.input.pageId !== undefined && ctx.input.pageId > 0;
    let page: Record<string, any> = updating
      ? await client.getPage(ctx.input.pageId!)
      : { pageID: -1 };
    if (!page || typeof page !== 'object') {
      throw createApiServiceError('The page to update was not found.');
    }
    page = { ...page, ...ctx.input.pageData };
    if (ctx.input.pageId !== undefined) page.pageID = ctx.input.pageId;
    if (ctx.input.name !== undefined) page.name = ctx.input.name;
    if (ctx.input.title !== undefined) page.title = ctx.input.title;
    if (ctx.input.templateId !== undefined) {
      let template = await client.getPageTemplate(ctx.input.templateId);
      let templateName = template?.pageTemplateName;
      if (typeof templateName !== 'string' || !templateName)
        throw createApiServiceError('The selected page template was not found.');
      page.templateName = templateName;
    }
    let result = await client.savePage(page, ctx.input.parentPageId);
    let savedId = result.itemIds[0] ?? (updating ? ctx.input.pageId : undefined);
    if (result.completed && !savedId) {
      throw createApiServiceError(
        `Agility CMS batch ${result.batchId} completed without a page ID. Call get_batch_status to inspect it.`
      );
    }
    return {
      output: { pageId: savedId, batchId: result.batchId, success: result.completed },
      message: result.completed
        ? `${updating ? 'Updated' : 'Created'} page **#${savedId}**`
        : `Page save is still pending in batch **#${result.batchId}**. Call get_batch_status to check completion.`
    };
  })
  .build();
