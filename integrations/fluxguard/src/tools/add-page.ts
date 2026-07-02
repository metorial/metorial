import { SlateTool } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from '../lib/client';
import { spec } from '../spec';

export let addPage = SlateTool.create(spec, {
  name: 'Add Page',
  key: 'add_page',
  description: `Add a web page for change monitoring. Provide a URL to start tracking changes on that page. Optionally assign it to an existing site and session, or let Fluxguard create new ones automatically. You can also categorize the page and give the site a nickname.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the web page to monitor'),
      siteId: z.string().optional().describe('ID of an existing site to add the page to'),
      sessionId: z.string().optional().describe('ID of an existing session within the site'),
      categories: z
        .array(z.string())
        .optional()
        .describe('List of category IDs to assign the new site to'),
      categoryId: z
        .string()
        .optional()
        .describe('Single category ID to assign the new site to'),
      categoryName: z.string().optional().describe('Category name to assign the new site to'),
      siteNickname: z.string().optional().describe('A nickname for the new site')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('ID of the site containing the page'),
      sessionId: z.string().describe('ID of the session containing the page'),
      pageId: z.string().describe('ID of the newly added page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    let result = await client.addPage({
      url: ctx.input.url,
      siteId: ctx.input.siteId,
      sessionId: ctx.input.sessionId,
      categories: ctx.input.categories,
      categoryId: ctx.input.categoryId,
      categoryName: ctx.input.categoryName,
      siteNickname: ctx.input.siteNickname
    });

    return {
      output: {
        siteId: result.siteId,
        sessionId: result.sessionId,
        pageId: result.pageId
      },
      message: `Added page **${ctx.input.url}** for monitoring (site: \`${result.siteId}\`, session: \`${result.sessionId}\`, page: \`${result.pageId}\`).`
    };
  })
  .build();
