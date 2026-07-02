import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPageTool = SlateTool.create(spec, {
  name: 'Create Page',
  key: 'create_page',
  description: `Create a new page in a Coda doc. Supports setting a name, subtitle, icon, cover image, parent page for nesting, and initial HTML content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      name: z.string().describe('Name for the new page'),
      subtitle: z.string().optional().describe('Subtitle for the page'),
      iconName: z.string().optional().describe('Icon name for the page'),
      imageUrl: z.string().optional().describe('Cover image URL for the page'),
      parentPageId: z.string().optional().describe('ID of the parent page for nesting'),
      content: z.string().optional().describe('Initial HTML content for the page body')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the created page'),
      requestId: z.string().describe('ID to track the asynchronous page creation'),
      name: z.string().describe('Requested name of the created page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {
      name: ctx.input.name,
      subtitle: ctx.input.subtitle,
      iconName: ctx.input.iconName,
      imageUrl: ctx.input.imageUrl,
      parentPageId: ctx.input.parentPageId
    };

    if (ctx.input.content) {
      body.pageContent = {
        type: 'canvas',
        canvasContent: {
          format: 'html',
          content: ctx.input.content
        }
      };
    }

    let page = await client.createPage(ctx.input.docId, body);

    return {
      output: {
        pageId: page.id,
        requestId: page.requestId,
        name: ctx.input.name
      },
      message: `Queued creation of page **${ctx.input.name}** in doc **${ctx.input.docId}**. Request ID: ${page.requestId}`
    };
  })
  .build();
