import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let getDubbingTool = SlateTool.create(spec, {
  name: 'Get Dubbing',
  key: 'get_dubbing',
  description: `Get the status and details of a dubbing project. Use this to check if dubbing is complete and retrieve metadata about the project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dubbingId: z.string().describe('ID of the dubbing project to retrieve')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      dubbingId: z.string().describe('ID of the dubbing project'),
      name: z.string().optional().describe('Name of the dubbing project'),
      status: z
        .string()
        .describe('Current status of the dubbing (e.g. "dubbed", "dubbing", "failed")'),
      targetLanguages: z
        .array(z.string())
        .optional()
        .describe('Target languages for the dubbing'),
      sourceLanguage: z.string().optional().describe('Detected or specified source language'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      error: z.string().optional().describe('Error message if the dubbing failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.getDubbing(ctx.input.dubbingId);

    return {
      output: {
        raw: result.raw,
        dubbingId: result.dubbing_id,
        name: result.name ?? undefined,
        status: result.status,
        targetLanguages: result.target_languages ?? undefined,
        sourceLanguage: result.source_language ?? undefined,
        createdAt: result.created_at ?? undefined,
        error: result.error ?? undefined
      },
      message: `Dubbing \`${result.dubbing_id}\` status: **${result.status}**.${result.error ? ` Error: ${result.error}` : ''}`
    };
  })
  .build();
