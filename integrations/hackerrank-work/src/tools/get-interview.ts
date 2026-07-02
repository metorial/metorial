import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInterview = SlateTool.create(spec, {
  name: 'Get Interview',
  key: 'get_interview',
  description: `Retrieve details of a specific interview session including its status, participants, schedule, and optionally the interview transcript. Use this to review interview outcomes and transcripts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      interviewId: z.string().describe('ID of the interview to retrieve'),
      includeTranscript: z
        .boolean()
        .optional()
        .describe('Whether to include the interview transcript')
    })
  )
  .output(
    z.object({
      interview: z.record(z.string(), z.any()).describe('Full interview details'),
      transcript: z
        .record(z.string(), z.any())
        .optional()
        .describe('Interview transcript (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let interviewResult = await client.getInterview(ctx.input.interviewId);
    let interview = interviewResult.data ?? interviewResult;

    let transcript: any;
    if (ctx.input.includeTranscript) {
      try {
        let transcriptResult = await client.getInterviewTranscript(ctx.input.interviewId);
        transcript = transcriptResult.data ?? transcriptResult;
      } catch {
        // Transcript may not be available for all interviews
      }
    }

    return {
      output: {
        interview,
        transcript
      },
      message: `Retrieved interview **${interview.title ?? ctx.input.interviewId}** (status: ${interview.current_status ?? 'unknown'}).${transcript ? ' Transcript included.' : ''}`
    };
  });
