import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePodcast = SlateTool.create(spec, {
  name: 'Delete Podcast',
  key: 'delete_podcast',
  description: `Request removal of a podcast from the Listen Notes database. This is primarily used by podcast hosting services to handle content removal requests on behalf of podcasters.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      podcastId: z.string().describe('Listen Notes podcast ID to request deletion for.'),
      reason: z.string().optional().describe('Reason for the deletion request.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status (e.g., "deleted" or "in review").'),
      podcastId: z.string().describe('ID of the podcast being deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.deletePodcast({
      podcastId: ctx.input.podcastId,
      reason: ctx.input.reason
    });

    return {
      output: {
        status: data.status,
        podcastId: data.podcast_id
      },
      message: `Podcast deletion request submitted. Status: **${data.status}**.`
    };
  })
  .build();
