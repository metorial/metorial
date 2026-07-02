import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let retrieveTranscript = SlateTool.create(spec, {
  name: 'Retrieve Transcript',
  key: 'retrieve_transcript',
  description: `Download a completed transcript for an audiofile. Supports plain text, Word document, RTF, and HTML formats. The audiofile must be in the **Delivered** state for the transcript to be available.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      audiofileId: z.number().describe('ID of the audiofile whose transcript to retrieve'),
      format: z
        .enum(['txt', 'doc', 'rtf', 'html'])
        .default('txt')
        .describe('Output format for the transcript')
    })
  )
  .output(
    z.object({
      audiofileId: z.number().describe('ID of the audiofile'),
      format: z.string().describe('Format of the retrieved transcript'),
      transcript: z.string().describe('The transcript content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let content = await client.getTranscript(ctx.input.audiofileId, ctx.input.format);

    let transcript = typeof content === 'string' ? content : JSON.stringify(content);

    return {
      output: {
        audiofileId: ctx.input.audiofileId,
        format: ctx.input.format,
        transcript
      },
      message: `Retrieved **${ctx.input.format.toUpperCase()}** transcript for audiofile **${ctx.input.audiofileId}** (${transcript.length} characters).`
    };
  })
  .build();
