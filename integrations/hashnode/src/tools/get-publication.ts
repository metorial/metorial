import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPublication = SlateTool.create(spec, {
  name: 'Get Publication',
  key: 'get_publication',
  description: `Retrieve details about the configured Hashnode publication, including title, description, URL, author, and branding information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      publicationId: z.string().describe('Unique identifier of the publication'),
      title: z.string().nullable().optional().describe('Publication title'),
      displayTitle: z.string().nullable().optional().describe('Display title'),
      descriptionSeo: z.string().nullable().optional().describe('SEO description'),
      aboutMarkdown: z.string().nullable().optional().describe('About section in Markdown'),
      aboutHtml: z.string().nullable().optional().describe('About section in HTML'),
      url: z.string().nullable().optional().describe('Publication URL'),
      canonicalUrl: z.string().nullable().optional().describe('Canonical URL'),
      favicon: z.string().nullable().optional().describe('Favicon URL'),
      headerColor: z.string().nullable().optional().describe('Header color'),
      isTeam: z.boolean().nullable().optional().describe('Whether this is a team publication'),
      authorId: z.string().nullable().optional().describe('Author ID'),
      authorUsername: z.string().nullable().optional().describe('Author username'),
      authorName: z.string().nullable().optional().describe('Author display name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let pub = await client.getPublication();
    if (!pub) throw new Error('Publication not found');

    return {
      output: {
        publicationId: pub.id,
        title: pub.title,
        displayTitle: pub.displayTitle,
        descriptionSeo: pub.descriptionSEO,
        aboutMarkdown: pub.about?.markdown,
        aboutHtml: pub.about?.html,
        url: pub.url,
        canonicalUrl: pub.canonicalURL,
        favicon: pub.favicon,
        headerColor: pub.headerColor,
        isTeam: pub.isTeam,
        authorId: pub.author?.id,
        authorUsername: pub.author?.username,
        authorName: pub.author?.name
      },
      message: `Retrieved publication **"${pub.title || pub.displayTitle}"** (${pub.url})`
    };
  })
  .build();
