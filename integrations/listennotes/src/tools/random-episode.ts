import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let randomEpisode = SlateTool.create(spec, {
  name: 'Random Episode',
  key: 'random_episode',
  description: `Get a random podcast episode from Listen Notes ("Just Listen"). Great for discovering new content or providing serendipitous recommendations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      episodeId: z.string().describe('Episode ID.'),
      title: z.string().describe('Episode title.'),
      description: z.string().describe('Episode description.'),
      pubDateMs: z.number().describe('Published date as Unix timestamp in milliseconds.'),
      audio: z.string().describe('Audio file URL.'),
      audioLengthSec: z.number().describe('Audio duration in seconds.'),
      image: z.string().describe('Episode image URL.'),
      thumbnail: z.string().describe('Episode thumbnail URL.'),
      explicitContent: z.boolean().describe('Whether the episode is explicit.'),
      listennotesUrl: z.string().describe('Listen Notes URL.'),
      link: z.string().describe('Original web link.'),
      podcast: z
        .object({
          podcastId: z.string().describe('Parent podcast ID.'),
          title: z.string().describe('Parent podcast title.'),
          publisher: z.string().describe('Parent podcast publisher.'),
          image: z.string().describe('Parent podcast image URL.'),
          listennotesUrl: z.string().describe('Parent podcast Listen Notes URL.')
        })
        .describe('Parent podcast metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.justListen();

    return {
      output: {
        episodeId: data.id,
        title: data.title,
        description: data.description,
        pubDateMs: data.pub_date_ms,
        audio: data.audio || '',
        audioLengthSec: data.audio_length_sec,
        image: data.image || '',
        thumbnail: data.thumbnail || '',
        explicitContent: data.explicit_content,
        listennotesUrl: data.listennotes_url,
        link: data.link || '',
        podcast: {
          podcastId: data.podcast?.id || '',
          title: data.podcast?.title || '',
          publisher: data.podcast?.publisher || '',
          image: data.podcast?.image || '',
          listennotesUrl: data.podcast?.listennotes_url || ''
        }
      },
      message: `Random episode: **${data.title}** from "${data.podcast?.title}".`
    };
  })
  .build();
