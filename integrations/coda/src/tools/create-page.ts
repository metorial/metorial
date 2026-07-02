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
      name: z.string().describe('Name of the created page'),
      browserLink: z.string().optional().describe('URL to open the page')
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
        body: ctx.input.content
      };
    }

    let page = await client.createPage(ctx.input.docId, body);

    return {
      output: {
        pageId: page.id,
        name: page.name,
        browserLink: page.browserLink
      },
      message: `Created page **${page.name}** in doc **${ctx.input.docId}**.`
    };
  })
  .build();
