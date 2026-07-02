import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLiveSessionResult = SlateTool.create(spec, {
  name: 'Get Live Session Result',
  key: 'get_live_session_result',
  description: `Retrieve the post-processed results of a completed live transcription session. Returns the full transcript and any enabled post-processing features like summarization and chapterization.`,
  instructions: [
    'Use the session ID returned from Initiate Live Session.',
    'Results are only available after the session has ended and post-processing is complete.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the live session to retrieve results for')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Unique ID of the live session'),
      status: z.string().describe('Current status of the session'),
      createdAt: z.string().describe('ISO 8601 timestamp when the session was created'),
      completedAt: z
        .string()
        .nullable()
        .describe('ISO 8601 timestamp when the session completed'),
      fullTranscript: z.string().optional().describe('Full transcript text'),
      languages: z.array(z.string()).optional().describe('Detected or specified languages'),
      utterances: z
        .array(
          z.object({
            text: z.string(),
            language: z.string(),
            start: z.number(),
            end: z.number(),
            confidence: z.number(),
            channel: z.number(),
            speaker: z.number()
          })
        )
        .optional()
        .describe('Transcript utterances with timestamps and speaker information'),
      summarization: z.any().optional().describe('Summarization results if enabled'),
      chapterization: z.any().optional().describe('Chapterization results if enabled'),
      errorCode: z.number().nullable().optional().describe('Error code if the session failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLiveSessionResult(ctx.input.sessionId);

    let utterances = result.result?.transcription?.utterances?.map(u => ({
      text: u.text,
      language: u.language,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
      channel: u.channel,
      speaker: u.speaker
    }));

    let output: any = {
      sessionId: result.id,
      status: result.status,
      createdAt: result.created_at,
      completedAt: result.completed_at,
      errorCode: result.error_code
    };

    if (result.result) {
      output.fullTranscript = result.result.transcription?.full_transcript;
      output.languages = result.result.transcription?.languages;
      output.utterances = utterances;
      if (result.result.summarization) output.summarization = result.result.summarization;
      if (result.result.chapterization) output.chapterization = result.result.chapterization;
    }

    if (result.status === 'done') {
      let transcript = result.result?.transcription?.full_transcript ?? '';
      let preview = transcript.substring(0, 200) + (transcript.length > 200 ? '...' : '');
      return {
        output,
        message: `Live session **completed**. Preview: "${preview}"`
      };
    }

    if (result.status === 'error') {
      return {
        output,
        message: `Live session **failed** with error code \`${result.error_code}\`.`
      };
    }

    return {
      output,
      message: `Live session is currently **${result.status}**.`
    };
  })
  .build();
