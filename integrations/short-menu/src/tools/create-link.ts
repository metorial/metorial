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

export let createLink = SlateTool.create(spec, {
  name: 'Create Short Link',
  key: 'create_link',
  description: `Create a new branded short link with Short Menu. Specify a destination URL and domain, optionally with a custom slug and tags for organization. If no slug is provided, a random one is generated. Returns the full short URL ready to share.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      destinationUrl: z
        .string()
        .describe(
          'The destination URL the short link will redirect to. Must include a scheme (e.g. https://).'
        ),
      domain: z
        .string()
        .optional()
        .describe(
          'Domain for the short link (e.g. shm.to or a custom domain). Falls back to the configured default domain if not provided.'
        ),
      slug: z
        .string()
        .optional()
        .describe(
          'Custom slug for the short link (e.g. "my-link" creates shm.to/my-link). Must be unique within the domain. If omitted, a random slug is generated.'
        ),
      tags: z
        .array(tagSchema)
        .optional()
        .describe('Tags to assign to the short link for organization.')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('Unique identifier of the created short link.'),
      shortUrl: z.string().describe('The full short URL (e.g. https://shm.to/abc).'),
      destinationUrl: z.string().describe('The destination URL the short link redirects to.'),
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
    let domain = ctx.input.domain ?? ctx.config.domain;

    let link = await client.createLink({
      destinationUrl: ctx.input.destinationUrl,
      domain,
      slug: ctx.input.slug,
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
      message: `Created short link **${link.shortUrl}** pointing to ${link.destinationUrl}`
    };
  })
  .build();
