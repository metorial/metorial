import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      contentToAppend: z.string().optional().describe('HTML content to append to the page')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the updated page'),
      name: z.string().describe('Updated name of the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {};

    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.subtitle !== undefined) body.subtitle = ctx.input.subtitle;
    if (ctx.input.iconName !== undefined) body.iconName = ctx.input.iconName;
    if (ctx.input.imageUrl !== undefined) body.imageUrl = ctx.input.imageUrl;

    if (ctx.input.contentToAppend) {
      body.contentUpdate = {
        canvasContent: {
          type: 'canvas',
          body: ctx.input.contentToAppend
        }
      };
    }

    let page = await client.updatePage(ctx.input.docId, ctx.input.pageIdOrName, body);

    return {
      output: {
        pageId: page.id,
        name: page.name || ctx.input.name || ctx.input.pageIdOrName
      },
      message: `Updated page **${ctx.input.pageIdOrName}** in doc **${ctx.input.docId}**.`
    };
  })
  .build();
