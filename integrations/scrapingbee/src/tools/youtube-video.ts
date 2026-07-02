import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let youtubeVideo = SlateTool.create(spec, {
  name: 'YouTube Video Details',
  key: 'youtube_video',
  description: `Retrieve detailed metadata, transcripts, and trainability information for a specific YouTube video. Combine multiple types of video data in a single call.`,
  instructions: [
    'Provide a YouTube video ID (the part after "v=" in a YouTube URL).',
    'Enable includeTranscript to get the full video transcript/subtitles.',
    'Enable includeTrainability to check AI training permissions for the video.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('YouTube video ID (e.g., "dQw4w9WgXcQ")'),
      includeTranscript: z.boolean().optional().describe('Include video transcript/subtitles'),
      transcriptLanguage: z
        .string()
        .optional()
        .describe('Language code for the transcript (e.g., "en", "es")'),
      includeTrainability: z
        .boolean()
        .optional()
        .describe('Include AI trainability information')
    })
  )
  .output(
    z.object({
      metadata: z
        .any()
        .describe(
          'Video metadata including title, description, channel, views, likes, and more'
        ),
      transcript: z.any().optional().describe('Video transcript/subtitles with timestamps'),
      trainability: z.any().optional().describe('AI trainability information for the video')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let metadata = await client.youtubeMetadata({
      videoId: ctx.input.videoId
    });

    let transcript: any;
    if (ctx.input.includeTranscript) {
      transcript = await client.youtubeTranscript({
        videoId: ctx.input.videoId,
        language: ctx.input.transcriptLanguage
      });
    }

    let trainability: any;
    if (ctx.input.includeTrainability) {
      trainability = await client.youtubeTrainability({
        videoId: ctx.input.videoId
      });
    }

    let parts = ['metadata'];
    if (transcript) parts.push('transcript');
    if (trainability) parts.push('trainability');

    return {
      output: {
        metadata,
        transcript,
        trainability
      },
      message: `Retrieved YouTube video details for **${ctx.input.videoId}** (${parts.join(', ')}).`
    };
  });
