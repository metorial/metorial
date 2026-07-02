import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';

let answerSchema = z
  .object({
    questionId: z
      .string()
      .optional()
      .describe('ID of the question this answer corresponds to'),
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
      .describe('File upload answer values'),
    grade: z
      .object({
        score: z.number().optional().describe('Score awarded'),
        correct: z.boolean().optional().describe('Whether the answer was correct')
      })
      .optional()
      .describe('Grade for this answer (quiz forms only)')
  })
  .describe('An answer to a question');

export let getResponse = SlateTool.create(spec, {
  name: 'Get Response',
  key: 'get_response',
  description: `Retrieves a single form response by its response ID. Returns the full response including answers, timestamps, respondent email (if collected), and quiz grades.

Useful for inspecting a specific submission in detail.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleFormsActionScopes.getResponse)
  .input(
    z.object({
      formId: z.string().describe('The ID of the Google Form'),
      responseId: z.string().describe('The ID of the specific response to retrieve')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Unique identifier of the response'),
      formId: z.string().optional().describe('ID of the form this response belongs to'),
      createTime: z
        .string()
        .optional()
        .describe('Timestamp when the response was first submitted (ISO 8601)'),
      lastSubmittedTime: z
        .string()
        .optional()
        .describe('Timestamp of the most recent submission (ISO 8601)'),
      respondentEmail: z
        .string()
        .optional()
        .describe('Email address of the respondent, if collected'),
      totalScore: z.number().optional().describe('Total score for quiz forms'),
      answers: z.array(answerSchema).optional().describe('All answers in the response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleFormsClient(ctx.auth.token);

    let response = await client.getResponse(ctx.input.formId, ctx.input.responseId);

    let answers = response.answers
      ? Object.entries(response.answers).map(([questionId, answer]) => ({
          questionId,
          textAnswers: answer.textAnswers?.answers?.map(a => a.value || '') || undefined,
          fileUploadAnswers:
            answer.fileUploadAnswers?.answers?.map(a => ({
              fileId: a.fileId,
              fileName: a.fileName,
              mimeType: a.mimeType
            })) || undefined,
          grade: answer.grade
            ? {
                score: answer.grade.score,
                correct: answer.grade.correct
              }
            : undefined
        }))
      : undefined;

    return {
      output: {
        responseId: response.responseId || ctx.input.responseId,
        formId: response.formId,
        createTime: response.createTime,
        lastSubmittedTime: response.lastSubmittedTime,
        respondentEmail: response.respondentEmail,
        totalScore: response.totalScore,
        answers
      },
      message: `Retrieved response \`${response.responseId}\` submitted at ${response.lastSubmittedTime || 'unknown time'}${response.respondentEmail ? ` by ${response.respondentEmail}` : ''}. Contains ${answers?.length || 0} answer(s).${response.totalScore !== undefined ? ` Total score: ${response.totalScore}` : ''}`
    };
  })
  .build();
