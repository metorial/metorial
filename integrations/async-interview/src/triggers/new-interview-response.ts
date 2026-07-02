import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
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

export let newInterviewResponse = SlateTrigger.create(spec, {
  name: 'New Interview Response',
  key: 'new_interview_response',
  description:
    'Triggers when a candidate submits a new interview response. Useful for automating follow-up workflows such as notifying hiring managers, pushing data to an ATS, or triggering candidate evaluation.'
})
  .input(
    z.object({
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
    })
  )
  .output(
    z.object({
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
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let state = ctx.state as { lastResponseId?: number } | null;
      let lastResponseId = state?.lastResponseId ?? 0;

      let rawResponses = await client.listInterviewResponses();

      let newResponses = rawResponses
        .filter(r => r.id > lastResponseId)
        .sort((a, b) => a.id - b.id);

      let inputs = newResponses.map(r => {
        let mapped = client.mapInterviewResponse(r);
        return mapped;
      });

      let lastNewResponse = newResponses[newResponses.length - 1];
      let updatedLastId = lastNewResponse ? lastNewResponse.id : lastResponseId;

      return {
        inputs,
        updatedState: {
          lastResponseId: updatedLastId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'interview_response.received',
        id: String(ctx.input.responseId),
        output: {
          responseId: ctx.input.responseId,
          candidateName: ctx.input.candidateName,
          candidateEmail: ctx.input.candidateEmail,
          candidatePhone: ctx.input.candidatePhone,
          jobId: ctx.input.jobId,
          jobTitle: ctx.input.jobTitle,
          interviewTitle: ctx.input.interviewTitle,
          stageId: ctx.input.stageId,
          date: ctx.input.date,
          time: ctx.input.time,
          datetime: ctx.input.datetime,
          shareUrl: ctx.input.shareUrl,
          internalUrl: ctx.input.internalUrl,
          textQuestionsAnswers: ctx.input.textQuestionsAnswers,
          videoUrl: ctx.input.videoUrl,
          audioUrl: ctx.input.audioUrl,
          thumbnailUrl: ctx.input.thumbnailUrl,
          durationSeconds: ctx.input.durationSeconds,
          attempts: ctx.input.attempts
        }
      };
    }
  })
  .build();
