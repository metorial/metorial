import { z } from 'zod';

// --- Form Types ---

export let formSummarySchema = z.object({
  formId: z.string().describe('Public identifier of the form'),
  name: z.string().describe('Name of the form')
});

export let questionDefinitionSchema = z.object({
  id: z.string().describe('Unique identifier of the question'),
  name: z.string().describe('Question text'),
  type: z.string().describe('Question type (e.g. ShortAnswer, MultipleChoice, Email, etc.)')
});

export let calculationDefinitionSchema = z.object({
  id: z.string().describe('Unique identifier of the calculation'),
  name: z.string().describe('Calculation name'),
  type: z.enum(['number', 'text', 'duration']).describe('Calculation type')
});

export let fieldDefinitionSchema = z.object({
  id: z.string().describe('Field identifier'),
  name: z.string().describe('Field name')
});

export let quizConfigSchema = z.object({
  enabled: z.boolean().describe('Whether quiz mode is enabled')
});

export let formMetadataSchema = z.object({
  id: z.string().describe('Public identifier of the form'),
  name: z.string().describe('Name of the form'),
  questions: z.array(questionDefinitionSchema).describe('Questions defined in the form'),
  calculations: z
    .array(calculationDefinitionSchema)
    .optional()
    .describe('Calculations defined in the form'),
  urlParameters: z
    .array(fieldDefinitionSchema)
    .optional()
    .describe('URL parameters configured for the form'),
  scheduling: z
    .array(fieldDefinitionSchema)
    .optional()
    .describe('Scheduling fields in the form'),
  payments: z.array(fieldDefinitionSchema).optional().describe('Payment fields in the form'),
  quiz: quizConfigSchema.optional().describe('Quiz configuration')
});

// --- Submission Types ---

export let questionResponseSchema = z.object({
  id: z.string().describe('Question identifier'),
  name: z.string().describe('Question text'),
  type: z.string().describe('Question type'),
  value: z.any().describe('Response value')
});

export let calculationResponseSchema = z.object({
  id: z.string().describe('Calculation identifier'),
  name: z.string().describe('Calculation name'),
  type: z.string().describe('Calculation type'),
  value: z.any().describe('Calculated value')
});

export let urlParameterResponseSchema = z.object({
  id: z.string().describe('URL parameter identifier'),
  name: z.string().describe('URL parameter name'),
  value: z.any().describe('URL parameter value')
});

export let schedulingResponseSchema = z.object({
  id: z.string().describe('Scheduling field identifier'),
  name: z.string().describe('Scheduling field name'),
  value: z.any().describe('Scheduling value (includes event time, attendee info, etc.)')
});

export let paymentResponseSchema = z.object({
  id: z.string().describe('Payment field identifier'),
  name: z.string().describe('Payment field name'),
  value: z.any().describe('Payment value (includes amount, currency, status, etc.)')
});

export let quizResponseSchema = z.object({
  score: z.number().describe('Quiz score'),
  maxScore: z.number().describe('Maximum possible quiz score')
});

export let loginResponseSchema = z.object({
  email: z.string().describe('Verified email address')
});

export let submissionSchema = z.object({
  submissionId: z.string().describe('Unique identifier of the submission'),
  submissionTime: z.string().describe('ISO 8601 timestamp of when the submission was made'),
  lastUpdatedAt: z.string().optional().describe('ISO 8601 timestamp of the last update'),
  questions: z.array(questionResponseSchema).describe('Question responses'),
  calculations: z.array(calculationResponseSchema).optional().describe('Calculated values'),
  urlParameters: z
    .array(urlParameterResponseSchema)
    .optional()
    .describe('URL parameter values'),
  scheduling: z.array(schedulingResponseSchema).optional().describe('Scheduling details'),
  payments: z.array(paymentResponseSchema).optional().describe('Payment information'),
  quiz: quizResponseSchema.optional().describe('Quiz score results'),
  login: loginResponseSchema.optional().describe('Login information'),
  editLink: z.string().optional().describe('Link to edit the submission')
});

export let submissionListResponseSchema = z.object({
  responses: z.array(submissionSchema).describe('Array of submission objects'),
  totalResponses: z.number().describe('Total number of matching submissions'),
  pageCount: z.number().describe('Total number of pages')
});

// --- Webhook Types ---

export let webhookCreateResponseSchema = z.object({
  webhookId: z.number().describe('ID of the created webhook')
});
