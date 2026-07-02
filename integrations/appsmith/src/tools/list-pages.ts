import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `List all pages in an Appsmith application. Pages are the main navigational units within an application, each containing widgets, queries, and JS objects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('The application ID to list pages for.')
    })
  )
  .output(
    z.object({
      pages: z
        .array(
          z.object({
            pageId: z.string().describe('Unique page identifier.'),
            name: z.string().describe('Page name.'),
            slug: z.string().optional().describe('Page URL slug.'),
            isDefault: z
              .boolean()
              .optional()
              .describe('Whether this is the default page of the application.'),
            isHidden: z
              .boolean()
              .optional()
              .describe('Whether the page is hidden from navigation.')
          })
        )
        .describe('List of pages in the application.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let pages = await client.listPages(ctx.input.applicationId);

    let mapped = pages.map((p: any) => ({
      pageId: p.id ?? '',
      name: p.name ?? '',
      slug: p.slug,
      isDefault: p.isDefault,
      isHidden: p.isHidden
    }));

    return {
      output: { pages: mapped },
      message: `Found **${mapped.length}** page(s) in application.`
    };
  })
  .build();
