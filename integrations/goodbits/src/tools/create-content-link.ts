import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContentLink = SlateTool.create(spec, {
  name: 'Create Content Link',
  key: 'create_content_link',
  description: `Add a link to the Content Library for use in newsletters. Provide a URL (required) along with optional title, description (HTML supported), and thumbnail image candidates. The content will be available in the Goodbits editor for building newsletters.`,
  instructions: [
    'The description field supports HTML markup.',
    'Thumbnail candidates are shown in the editor alongside any images fetched from the URL.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the article or content to add'),
      title: z.string().optional().describe('Title of the content'),
      description: z.string().optional().describe('HTML description of the content'),
      fetchRemoteThumbnailUrl: z
        .string()
        .optional()
        .describe('URL of an image to use as the thumbnail'),
      imageCandidates: z
        .array(z.string())
        .optional()
        .describe('Array of image URLs to use as thumbnail candidates')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('Unique identifier of the created content link'),
      url: z.string().describe('URL of the content'),
      title: z.string().describe('Title of the content'),
      description: z.string().describe('Description of the content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let link = await client.createLink({
      url: ctx.input.url,
      title: ctx.input.title,
      description: ctx.input.description,
      fetchRemoteThumbnailUrl: ctx.input.fetchRemoteThumbnailUrl,
      imageCandidates: ctx.input.imageCandidates
    });

    return {
      output: link,
      message: `Created content link **${link.title || link.url}** in the Content Library.`
    };
  })
  .build();
