import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.object({
  name: z
    .string()
    .describe('Name of the tag. If a tag with this name already exists, it will be reused.'),
  id: z
    .string()
    .optional()
    .describe('ID of an existing tag. Only provide if the tag already exists in your account.')
});

export let updateLink = SlateTool.create(spec, {
  name: 'Update Short Link',
  key: 'update_link',
  description: `Update an existing short link's destination URL or tags. The short URL itself remains unchanged, allowing you to redirect it to a new destination without breaking existing links. You can also reassign tags for organizational purposes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      linkId: z.string().describe('The identifier of the short link to update.'),
      destinationUrl: z
        .string()
        .optional()
        .describe(
          'New destination URL for the short link. If omitted, the current destination is kept.'
        ),
      tags: z
        .array(tagSchema)
        .optional()
        .describe(
          'Updated set of tags for the short link. Replaces all existing tags. If omitted, existing tags are kept.'
        )
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('Unique identifier of the updated short link.'),
      shortUrl: z.string().describe('The full short URL (e.g. https://shm.to/abc).'),
      destinationUrl: z.string().describe('The updated destination URL.'),
      slug: z.string().describe('The slug portion of the short link.'),
      domain: z
        .object({
          domainId: z.string().describe('Identifier of the domain.'),
          domainName: z.string().describe('Name of the domain (e.g. shm.to).')
        })
        .describe('The domain used for the short link.'),
      title: z.string().optional().describe('Title of the destination page, if available.'),
      clickCount: z.number().optional().describe('Number of clicks on the short link.'),
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Identifier of the tag.'),
            tagName: z.string().describe('Name of the tag.')
          })
        )
        .describe('Tags assigned to the short link.'),
      createdAt: z.string().describe('Timestamp when the short link was created.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let link = await client.updateLink(ctx.input.linkId, {
      destinationUrl: ctx.input.destinationUrl,
      tags: ctx.input.tags
    });

    return {
      output: {
        linkId: link.id,
        shortUrl: link.shortUrl,
        destinationUrl: link.destinationUrl,
        slug: link.slug,
        domain: {
          domainId: link.domain.id,
          domainName: link.domain.name
        },
        title: link.title,
        clickCount: link.clickCount,
        tags: link.tags.map(t => ({
          tagId: t.id,
          tagName: t.name
        })),
        createdAt: link.createdAt
      },
      message: `Updated short link **${link.shortUrl}** — now points to ${link.destinationUrl}`
    };
  })
  .build();
