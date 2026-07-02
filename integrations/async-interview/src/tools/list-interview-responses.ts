import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attemptSchema = z.object({
  attemptId: z.number().describe('Unique identifier for the attempt'),
  durationSeconds: z.number().describe('Duration of the attempt in seconds'),
  videoUrl: z.string().describe('URL of the recorded video'),
  thumbnailUrl: z.string().describe('URL of the video thumbnail'),
  streamingVideoUrl: z.string().describe('URL for streaming the video'),
  recordedAt: z.string().describe('Timestamp when the attempt was recorded')
});

let responseSchema = z.object({
  responseId: z.number().describe('Unique identifier of the interview response'),
  candidateName: z.string().describe('Full name of the candidate'),
  candidateEmail: z.string().describe('Email address of the candidate'),
  candidatePhone: z.string().describe('Phone number of the candidate'),
  jobId: z.number().describe('Identifier of the associated job'),
  jobTitle: z.string().describe('Title of the associated job position'),
  interviewTitle: z.string().describe('Title of the interview stage'),
  stageId: z.number().describe('Identifier of the interview stage'),
  date: z.string().describe('Date of the response submission'),
  time: z.string().describe('Time of the response submission'),
  datetime: z.string().describe('Full ISO datetime of the response submission'),
  shareUrl: z.string().describe('Public shareable URL for the response'),
  internalUrl: z.string().describe('Internal URL for viewing the response'),
  textQuestionsAnswers: z
    .record(z.string(), z.unknown())
    .describe('Answers to text-based interview questions'),
  videoUrl: z.string().describe('URL of the primary video recording'),
  audioUrl: z.string().describe('URL of the audio recording'),
  thumbnailUrl: z.string().describe('URL of the video thumbnail'),
  durationSeconds: z.number().describe('Total duration of the response in seconds'),
  attempts: z.array(attemptSchema).describe('List of recording attempts')
});

export let listInterviewResponses = SlateTool.create(spec, {
  name: 'List Interview Responses',
  key: 'list_interview_responses',
  description: `Retrieve all candidate interview responses from your Async Interview account. Returns detailed information about each submission including candidate details, video/audio recordings, text answers, and recording attempts. Useful for reviewing candidate submissions, building reporting workflows, or syncing data with an ATS.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z
        .number()
        .optional()
        .describe('Filter responses by job ID. If not provided, all responses are returned.')
    })
  )
  .output(
    z.object({
      responses: z.array(responseSchema).describe('List of interview responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let rawResponses = await client.listInterviewResponses();

    let mapped = rawResponses.map(r => client.mapInterviewResponse(r));

    if (ctx.input.jobId !== undefined) {
      mapped = mapped.filter(r => r.jobId === ctx.input.jobId);
    }

    return {
      output: {
        responses: mapped
      },
      message: `Retrieved **${mapped.length}** interview response(s)${ctx.input.jobId !== undefined ? ` for job ID ${ctx.input.jobId}` : ''}.`
    };
  })
  .build();
