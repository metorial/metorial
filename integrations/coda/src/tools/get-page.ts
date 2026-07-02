import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPageTool = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve metadata for a Coda page, including visibility, parent/child page relationships, content type, timestamps, and browser link.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      pageIdOrName: z.string().describe('ID or name of the page to retrieve')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the page'),
      name: z.string().describe('Name of the page'),
      subtitle: z.string().optional().describe('Subtitle of the page'),
      iconName: z.string().optional().describe('Icon name for the page'),
      imageUrl: z.string().optional().describe('Cover image URL for the page'),
      contentType: z.string().optional().describe('Type of page content'),
      isHidden: z.boolean().optional().describe('Whether the page is hidden'),
      isEffectivelyHidden: z
        .boolean()
        .optional()
        .describe('Whether the page or any parent is hidden'),
      parentPageId: z.string().optional().describe('ID of the parent page'),
      childPageIds: z.array(z.string()).describe('IDs of child pages'),
      createdAt: z.string().optional().describe('Timestamp when the page was created'),
      updatedAt: z.string().optional().describe('Timestamp when the page was updated'),
      browserLink: z.string().optional().describe('URL to open the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let page = await client.getPage(ctx.input.docId, ctx.input.pageIdOrName);

    return {
      output: {
        pageId: page.id,
        name: page.name,
        subtitle: page.subtitle,
        iconName: page.icon?.name,
        imageUrl: page.image?.browserLink,
        contentType: page.contentType,
        isHidden: page.isHidden,
        isEffectivelyHidden: page.isEffectivelyHidden,
        parentPageId: page.parent?.id,
        childPageIds: (page.children || []).map((child: any) => child.id),
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        browserLink: page.browserLink
      },
      message: `Retrieved page **${page.name}** (${page.id}).`
    };
  })
  .build();
