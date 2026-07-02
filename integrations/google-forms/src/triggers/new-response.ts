import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';

let answerSchema = z.object({
  questionId: z.string().optional().describe('ID of the question'),
  textAnswers: z.array(z.string()).optional().describe('Text answer values'),
  fileUploadAnswers: z
    .array(
      z.object({
        fileId: z.string().optional().describe('Google Drive file ID'),
        fileName: z.string().optional().describe('Name of the uploaded file'),
        mimeType: z.string().optional().describe('MIME type of the uploaded file')
      })
    )
    .optional()
    .describe('File upload answers'),
  grade: z
    .object({
      score: z.number().optional().describe('Score awarded'),
      correct: z.boolean().optional().describe('Whether the answer was correct')
    })
    .optional()
    .describe('Grade for this answer')
});

export let newResponse = SlateTrigger.create(spec, {
  name: 'New Form Response',
  key: 'new_response',
  description:
    'Triggers when a new response is submitted to a Google Form. Polls for new responses periodically and returns each new submission with its full answer data.'
})
  .scopes(googleFormsActionScopes.newResponse)
  .input(
    z.object({
      formId: z.string().describe('ID of the form'),
      responseId: z.string().describe('ID of the response'),
      createTime: z.string().optional().describe('When the response was first submitted'),
      lastSubmittedTime: z
        .string()
        .optional()
        .describe('When the response was last submitted'),
      respondentEmail: z.string().optional().describe('Email of the respondent'),
      totalScore: z.number().optional().describe('Total score for quiz responses'),
      answers: z
        .record(z.string(), z.any())
        .optional()
        .describe('Raw answers keyed by question ID')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Unique identifier of the response'),
      formId: z.string().describe('ID of the form this response belongs to'),
      createTime: z
        .string()
        .optional()
        .describe('When the response was first submitted (ISO 8601)'),
      lastSubmittedTime: z
        .string()
        .optional()
        .describe('When the response was last submitted (ISO 8601)'),
      respondentEmail: z.string().optional().describe('Email of the respondent, if collected'),
      totalScore: z.number().optional().describe('Total score for quiz forms'),
      answers: z.array(answerSchema).optional().describe('All answers in the response')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let formId = (ctx.state?.formId as string) || '';
      if (!formId) {
        return { inputs: [], updatedState: ctx.state };
      }

      let client = new GoogleFormsClient(ctx.auth.token);
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let filter: string | undefined;
      if (lastPollTime) {
        filter = `timestamp >= ${lastPollTime}`;
      }

      let responses = await client.listAllResponses(formId, filter);

      let lastSeenIds = (ctx.state?.lastSeenIds as string[] | undefined) || [];
      let newResponses = responses.filter(r => !lastSeenIds.includes(r.responseId || ''));

      let now = new Date().toISOString();

      let updatedSeenIds = responses.map(r => r.responseId || '').filter(Boolean);
      // Keep a reasonable window of IDs to prevent unbounded growth
      if (updatedSeenIds.length > 1000) {
        updatedSeenIds = updatedSeenIds.slice(-500);
      }

      return {
        inputs: newResponses.map(r => ({
          formId,
          responseId: r.responseId || '',
          createTime: r.createTime,
          lastSubmittedTime: r.lastSubmittedTime,
          respondentEmail: r.respondentEmail,
          totalScore: r.totalScore,
          answers: r.answers
        })),
        updatedState: {
          formId,
          lastPollTime: now,
          lastSeenIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let answers = ctx.input.answers
        ? Object.entries(ctx.input.answers).map(([questionId, answer]: [string, any]) => ({
            questionId,
            textAnswers:
              answer?.textAnswers?.answers?.map((a: any) => a.value || '') || undefined,
            fileUploadAnswers:
              answer?.fileUploadAnswers?.answers?.map((a: any) => ({
                fileId: a.fileId,
                fileName: a.fileName,
                mimeType: a.mimeType
              })) || undefined,
            grade: answer?.grade
              ? {
                  score: answer.grade.score,
                  correct: answer.grade.correct
                }
              : undefined
          }))
        : undefined;

      return {
        type: 'response.submitted',
        id: ctx.input.responseId,
        output: {
          responseId: ctx.input.responseId,
          formId: ctx.input.formId,
          createTime: ctx.input.createTime,
          lastSubmittedTime: ctx.input.lastSubmittedTime,
          respondentEmail: ctx.input.respondentEmail,
          totalScore: ctx.input.totalScore,
          answers
        }
      };
    }
  })
  .build();
