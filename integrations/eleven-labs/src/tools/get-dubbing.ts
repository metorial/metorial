import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let getDubbing = SlateTool.create(spec, {
  name: 'Get Dubbing',
  key: 'get_dubbing',
  description: `Check the status and details of a dubbing project. Use this to monitor progress of a dubbing job created with the "Create Dubbing" tool.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dubbingId: z.string().describe('ID of the dubbing project to check')
    })
  )
  .output(
    z.object({
      dubbingId: z.string().describe('Dubbing project ID'),
      name: z.string().describe('Project name'),
      status: z.string().describe('Current status of the dubbing job'),
      sourceLanguage: z.string().optional().describe('Detected source language'),
      targetLanguages: z.array(z.string()).describe('Target languages for dubbing'),
      createdAt: z.string().describe('Timestamp when the project was created'),
      error: z.string().optional().describe('Error message if dubbing failed'),
      contentType: z.string().optional().describe('Media content type'),
      durationSeconds: z.number().optional().describe('Media duration in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);
    let data = (await client.getDubbing(ctx.input.dubbingId)) as Record<string, unknown>;
    let media = data.media_metadata as Record<string, unknown> | undefined;

    return {
      output: {
        dubbingId: data.dubbing_id as string,
        name: data.name as string,
        status: data.status as string,
        sourceLanguage: data.source_language as string | undefined,
        targetLanguages: data.target_languages as string[],
        createdAt: data.created_at as string,
        error: data.error as string | undefined,
        contentType: media?.content_type as string | undefined,
        durationSeconds: media?.duration as number | undefined
      },
      message: `Dubbing project \`${data.dubbing_id}\`: status **${data.status}**, target languages: ${(data.target_languages as string[]).join(', ')}.`
    };
  })
  .build();
