import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let issueCategorySchema = z.object({
  name: z.string().describe('Display name of the category'),
  items: z
    .array(
      z.object({
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
  description: `Retrieve full details of a specific newsletter issue including its categories, items (links and text), and optionally open/click rate statistics. Use the issue number (from list issues) or the database ID for drafts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicationId: z.string().describe('ID of the publication'),
      issueNumber: z
        .string()
        .describe('Issue number for published issues, or database ID for drafts'),
      includeStats: z.boolean().optional().describe('Include open and click rate statistics')
    })
  )
  .output(
    z.object({
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
      name: cat.name,
      items: cat.items?.map(item => ({
        type: item.type,
        title: item.title,
        description: item.description,
        url: item.url,
        imageUrl: item.image_url
      }))
    }));

    return {
      output: {
        issueId: issue.id,
        issueNumber: issue.number,
        title: issue.title,
        summary: issue.summary,
        url: issue.url,
        publishedAt: issue.published_at,
        updatedAt: issue.updated_at,
        categories,
        openRate: issue.open_rate,
        clickRate: issue.click_rate
      },
      message: `Retrieved issue **#${issue.number} - ${issue.title}**${issue.published_at ? ` (published ${issue.published_at})` : ' (draft)'}${issue.categories ? ` with ${issue.categories.length} categories` : ''}.`
    };
  })
  .build();
