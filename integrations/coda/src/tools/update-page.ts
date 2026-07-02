import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { codaServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updatePageTool = SlateTool.create(spec, {
  name: 'Update Page',
  key: 'update_page',
  description: `Update the properties of an existing page in a Coda doc, including name, subtitle, icon, and cover image. Can also append content to the page.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      pageIdOrName: z.string().describe('ID or name of the page to update'),
      name: z.string().optional().describe('New name for the page'),
      subtitle: z.string().optional().describe('New subtitle for the page'),
      iconName: z.string().optional().describe('New icon name for the page'),
      imageUrl: z.string().optional().describe('New cover image URL'),
      isHidden: z.boolean().optional().describe('Whether the page should be hidden'),
      insertionMode: z
        .enum(['append', 'replace', 'before', 'after'])
        .optional()
        .default('append')
        .describe('How to apply contentToAppend when provided'),
      elementId: z
        .string()
        .optional()
        .describe('Page content element ID for replace, before, or after insertion modes'),
      contentToAppend: z.string().optional().describe('HTML content to append to the page')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the updated page'),
      requestId: z.string().describe('ID to track the asynchronous page update'),
      name: z.string().optional().describe('Requested updated name of the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      ctx.input.name === undefined &&
      ctx.input.subtitle === undefined &&
      ctx.input.iconName === undefined &&
      ctx.input.imageUrl === undefined &&
      ctx.input.isHidden === undefined &&
      !ctx.input.contentToAppend
    ) {
      throw codaServiceError('Provide at least one page property or contentToAppend.');
    }

    if (
      ctx.input.contentToAppend &&
      ctx.input.insertionMode &&
      ctx.input.insertionMode !== 'append' &&
      !ctx.input.elementId
    ) {
      throw codaServiceError(
        'elementId is required when insertionMode is replace, before, or after.'
      );
    }

    let body: any = {};

    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.subtitle !== undefined) body.subtitle = ctx.input.subtitle;
    if (ctx.input.iconName !== undefined) body.iconName = ctx.input.iconName;
    if (ctx.input.imageUrl !== undefined) body.imageUrl = ctx.input.imageUrl;
    if (ctx.input.isHidden !== undefined) body.isHidden = ctx.input.isHidden;

    if (ctx.input.contentToAppend) {
      body.contentUpdate = {
        insertionMode: ctx.input.insertionMode,
        elementId: ctx.input.elementId,
        canvasContent: {
          format: 'html',
          content: ctx.input.contentToAppend
        }
      };
    }

    let page = await client.updatePage(ctx.input.docId, ctx.input.pageIdOrName, body);

    return {
      output: {
        pageId: page.id,
        requestId: page.requestId,
        name: ctx.input.name
      },
      message: `Queued update for page **${ctx.input.pageIdOrName}** in doc **${ctx.input.docId}**. Request ID: ${page.requestId}`
    };
  })
  .build();
