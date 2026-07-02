import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import { mapVideo, videoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let editVideoTool = SlateTool.create(spec, {
  name: 'Edit Video',
  key: 'edit_video',
  description: `Update a video's metadata including its title, description, privacy settings, tags, password, and license. Only the fields you provide will be updated.`,
  instructions: [
    'For password-protected videos, set privacy.view to "password" and provide the password field.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      videoId: z.string().describe('The ID of the video to edit'),
      name: z.string().optional().describe('New title for the video'),
      description: z.string().optional().describe('New description for the video'),
      privacy: z
        .object({
          view: z
            .enum([
              'anybody',
              'contacts',
              'disable',
              'nobody',
              'password',
              'unlisted',
              'users'
            ])
            .optional()
            .describe('Who can view the video'),
          embed: z
            .enum(['private', 'public', 'whitelist'])
            .optional()
            .describe('Where the video can be embedded'),
          download: z.boolean().optional().describe('Whether the video can be downloaded'),
          add: z
            .boolean()
            .optional()
            .describe('Whether the video can be added to showcases, channels, etc.'),
          comments: z
            .enum(['anybody', 'contacts', 'nobody'])
            .optional()
            .describe('Who can comment on the video')
        })
        .optional()
        .describe('Privacy settings to update'),
      password: z
        .string()
        .optional()
        .describe('Password for the video (required if privacy.view is "password")'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to assign to the video (replaces existing tags)'),
      embedDomains: z
        .array(z.string())
        .optional()
        .describe('Domains where the video can be embedded'),
      license: z
        .enum(['by', 'by-nc', 'by-nc-nd', 'by-nc-sa', 'by-nd', 'by-sa', 'cc0'])
        .optional()
        .describe('Creative Commons license for the video')
    })
  )
  .output(videoSchema)
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let video = await client.editVideo(ctx.input.videoId, {
      name: ctx.input.name,
      description: ctx.input.description,
      privacy: ctx.input.privacy,
      password: ctx.input.password,
      tags: ctx.input.tags,
      embedDomains: ctx.input.embedDomains,
      license: ctx.input.license
    });
    let mapped = mapVideo(video);

    return {
      output: mapped,
      message: `Updated video **${mapped.name}** (${mapped.videoId})`
    };
  })
  .build();
