import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resolveUrl = SlateTool.create(spec, {
  name: 'Resolve URL',
  key: 'resolve_url',
  description: `Resolve a SoundCloud URL (e.g., \`soundcloud.com/user/track-name\`) to its full API resource representation. Useful for fetching data from user-facing links. Works with track, playlist, and user URLs.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'SoundCloud URL to resolve (e.g., "https://soundcloud.com/artist/track-name")'
        )
    })
  )
  .output(
    z.object({
      kind: z.string().describe('Resource type (track, playlist, user)'),
      resourceId: z.string().describe('Unique identifier (URN) of the resolved resource'),
      title: z.string().optional().describe('Title (for tracks and playlists)'),
      username: z
        .string()
        .optional()
        .describe('Username (for users, or uploader for tracks/playlists)'),
      permalinkUrl: z.string().describe('Canonical permalink URL'),
      resource: z
        .record(z.string(), z.any())
        .describe('Full resource representation from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let resource = await client.resolve(ctx.input.url);

    let kind = resource.kind || 'unknown';
    let resourceId = resource.urn || String(resource.id);
    let title = resource.title;
    let username = resource.username || resource.user?.username;
    let permalinkUrl = resource.permalink_url;

    return {
      output: {
        kind,
        resourceId,
        title,
        username,
        permalinkUrl,
        resource
      },
      message: `Resolved URL to **${kind}**: ${title || username || resourceId} ([${permalinkUrl}](${permalinkUrl})).`
    };
  })
  .build();
