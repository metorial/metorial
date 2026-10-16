import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let issueCategorySchema = z.object({
  code: z.string().optional().describe('Category code used when managing links'),
  name: z.string().describe('Display name of the category'),
  items: z
    .array(
      z.object({
        footer: z.string().optional().describe('Footer text for a text item'),
        urlDomain: z.string().optional().describe('Destination domain for a link item'),
        embeddedLinks: z
          .array(
            z.object({
              identifier: z.string().optional(),
              title: z.string().optional(),
              url: z.string().optional(),
              urlDomain: z.string().optional()
            })
          )
          .optional()
          .describe('Links embedded in the item content'),
        type: z.string().describe('Item type (e.g. "text" or "link")'),
        title: z.string().optional().describe('Title of the item'),
        description: z.string().optional().describe('Description or body text'),
        url: z.string().optional().describe('URL for link items'),
        imageUrl: z.string().optional().describe('Image URL if available')
      })
    )
    .optional()
    .describe('Items within this category')
});

export let getIssue = SlateTool.create(spec, {
  name: 'Get Issue',
  key: 'get_issue',
  description: `Retrieve full details of a specific newsletter issue including its categories, items (links and text), and optionally open/click rate statistics. Use the issue number (from list issues) or the database ID for drafts. Call list_publications to discover the publication ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicationId: publicationIdSchema,
      issueNumber: z
        .string()
        .describe('Issue number for published issues, or database ID for drafts'),
      includeStats: z.boolean().optional().describe('Include open and click rate statistics')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional metadata'),
      issueId: z.number().describe('Database ID of the issue'),
      issueNumber: z.number().describe('Issue number'),
      title: z.string().describe('Title of the issue'),
      summary: z.string().describe('Summary of the issue'),
      url: z.string().describe('Public URL of the issue'),
      publishedAt: z
        .string()
        .nullable()
        .describe('ISO 8601 publication date, null for drafts'),
      updatedAt: z.string().describe('ISO 8601 last updated date'),
      categories: z
        .array(issueCategorySchema)
        .optional()
        .describe('Categories with their items'),
      openRate: z.number().optional().describe('Open rate percentage (if stats requested)'),
      clickRate: z.number().optional().describe('Click rate percentage (if stats requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let issue = await client.getIssue(ctx.input.publicationId, ctx.input.issueNumber, {
      stats: ctx.input.includeStats
    });

    let categories = issue.categories?.map(cat => ({
      code: cat.code ?? undefined,
      name: cat.name,
      items: cat.items?.map(item => ({
        footer: item.footer ?? undefined,
        urlDomain: item.url_domain ?? undefined,
        embeddedLinks: item.embedded_links?.map(link => ({
          identifier: link.identifier ?? undefined,
          title: link.title ?? undefined,
          url: link.url ?? undefined,
          urlDomain: link.url_domain ?? undefined
        })),
        type: item.type,
        title: item.title ?? undefined,
        description: item.description ?? undefined,
        url: item.url ?? undefined,
        imageUrl: item.image_url ?? undefined
      }))
    }));

    return {
      output: {
        raw: issue,
        issueId: issue.id,
        issueNumber: issue.number,
        title: issue.title,
        summary: issue.summary,
        url: issue.url,
        publishedAt: issue.published_at,
        updatedAt: issue.updated_at,
        categories,
        openRate: issue.open_rate ?? undefined,
        clickRate: issue.click_rate ?? undefined
      },
      message: `Retrieved issue **#${issue.number} - ${issue.title}**${issue.published_at ? ` (published ${issue.published_at})` : ' (draft)'}${issue.categories ? ` with ${issue.categories.length} categories` : ''}.`
    };
  })
  .build();
