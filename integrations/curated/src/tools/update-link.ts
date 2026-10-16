import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateLink = SlateTool.create(spec, {
  name: 'Update Link',
  key: 'update_link',
  description: `Update a collected link's properties or move it into a draft issue. You can change the URL, title, description, category, or assign it to a draft issue by specifying the issue ID. Set the issue ID to empty to move a link back to collected items. Call list_publications to discover the publication ID.`,
  constraints: ['Links belonging to published issues cannot be updated.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      publicationId: publicationIdSchema,
      linkId: z.string().describe('ID of the link to update'),
      url: z.string().optional().describe('New URL for the link'),
      title: z.string().optional().describe('New title for the link'),
      description: z.string().optional().describe('New description for the link'),
      category: z.string().optional().describe('New category code for the link'),
      issueId: z
        .string()
        .optional()
        .describe(
          'Draft issue ID to move the link to, or empty string to move back to collected items'
        )
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional metadata'),
      issueId: z
        .number()
        .nullable()
        .optional()
        .describe('Draft issue containing the link, or null for collected items'),
      createdAt: z.string().optional().describe('Date the link was collected'),
      updatedAt: z.string().optional().describe('Date the link was last updated'),
      linkId: z.number().describe('Unique identifier of the updated link'),
      url: z.string().describe('URL of the link'),
      title: z.string().describe('Title of the link'),
      description: z.string().describe('Description of the link'),
      imageUrl: z.string().optional().describe('Image URL attached to the link'),
      category: z.string().optional().describe('Category code assigned to the link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let link = await client.updateLink(ctx.input.publicationId, ctx.input.linkId, {
      url: ctx.input.url,
      title: ctx.input.title,
      description: ctx.input.description,
      category: ctx.input.category,
      issueId: ctx.input.issueId
    });

    return {
      output: {
        raw: link,
        issueId: link.issue_id,
        createdAt: link.created_at ?? undefined,
        updatedAt: link.updated_at ?? undefined,
        linkId: link.id,
        url: link.url,
        title: link.title,
        description: link.description,
        imageUrl: link.image_url ?? undefined,
        category: link.category ?? undefined
      },
      message: `Updated link **"${link.title || link.url}"** (ID: ${link.id}).${ctx.input.issueId === '' ? ' Moved back to collected items.' : ctx.input.issueId ? ` Moved to issue ${ctx.input.issueId}.` : ''}`
    };
  })
  .build();
