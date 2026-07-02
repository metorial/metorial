import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEpisode = SlateTool.create(spec, {
  name: 'Get Episode',
  key: 'get_episode',
  description: `Fetch detailed metadata for a podcast episode by its Listen Notes ID. Returns full episode information including title, description, audio URL, duration, publish date, and parent podcast metadata.
Optionally include transcript if available (PRO/ENTERPRISE plans).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      episodeId: z.string().describe('Listen Notes episode ID.'),
      showTranscript: z
        .boolean()
        .optional()
        .describe(
          'Set to true to include transcript if available. Requires PRO/ENTERPRISE plan.'
        )
    })
  )
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
      explicitContent: z.boolean().describe('Whether the episode contains explicit content.'),
      listennotesUrl: z.string().describe('Listen Notes URL for the episode.'),
      link: z.string().describe('Original web link for the episode.'),
      maybeAudioInvalid: z.boolean().describe('Whether the audio URL may be invalid.'),
      transcript: z
        .string()
        .optional()
        .describe('Transcript text if available and requested.'),
      podcast: z
        .object({
          podcastId: z.string().describe('Parent podcast ID.'),
          title: z.string().describe('Parent podcast title.'),
          publisher: z.string().describe('Parent podcast publisher.'),
          image: z.string().describe('Parent podcast image URL.'),
          listennotesUrl: z.string().describe('Parent podcast Listen Notes URL.'),
          listenScore: z.number().describe('Parent podcast Listen Score.')
        })
        .describe('Parent podcast metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.getEpisode({
      episodeId: ctx.input.episodeId,
      showTranscript: ctx.input.showTranscript ? 1 : undefined
    });

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
        maybeAudioInvalid: data.maybe_audio_invalid,
        transcript: data.transcript || undefined,
        podcast: {
          podcastId: data.podcast?.id || '',
          title: data.podcast?.title || '',
          publisher: data.podcast?.publisher || '',
          image: data.podcast?.image || '',
          listennotesUrl: data.podcast?.listennotes_url || '',
          listenScore: data.podcast?.listen_score || 0
        }
      },
      message: `Fetched episode **${data.title}** from podcast "${data.podcast?.title}".`
    };
  })
  .build();
