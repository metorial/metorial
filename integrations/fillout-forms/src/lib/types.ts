import { z } from 'zod';

// --- Form Types ---

export let formSummarySchema = z.looseObject({
  formId: z.string().describe('Public identifier of the form'),
  name: z.string().describe('Name of the form'),
  tags: z.array(z.string()).optional().describe('Native form tags')
});

export let questionDefinitionSchema = z.looseObject({
  id: z.string().describe('Unique identifier of the question'),
  name: z.string().describe('Question text'),
  type: z.string().describe('Question type (e.g. ShortAnswer, MultipleChoice, Email, etc.)'),
  options: z
    .array(z.looseObject({ id: z.string(), value: z.string(), label: z.string() }))
    .optional()
    .describe('Native choice options')
});

export let calculationDefinitionSchema = z.looseObject({
  id: z.string().describe('Unique identifier of the calculation'),
  name: z.string().describe('Calculation name'),
  type: z.enum(['number', 'text', 'duration']).describe('Calculation type')
});

export let fieldDefinitionSchema = z.looseObject({
  id: z.string().describe('Field identifier'),
  name: z.string().describe('Field name')
});

export let quizConfigSchema = z.looseObject({
  enabled: z.boolean().describe('Whether quiz mode is enabled')
});

export let formMetadataSchema = z.looseObject({
  id: z.string().describe('Public identifier of the form'),
  name: z.string().describe('Name of the form'),
  questions: z.array(questionDefinitionSchema).describe('Questions defined in the form'),
  tags: z.array(z.string()).optional(),
  documents: z.array(z.looseObject({ id: z.string(), name: z.string() })).optional(),
  approvals: z.array(z.record(z.string(), z.unknown())).optional(),
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

export let questionResponseSchema = z.looseObject({
  id: z.string().describe('Question identifier'),
  name: z.string().describe('Question text'),
  type: z.string().describe('Question type'),
  value: z.any().describe('Response value')
});

export let calculationResponseSchema = z.looseObject({
  id: z.string().describe('Calculation identifier'),
  name: z.string().describe('Calculation name'),
  type: z.string().describe('Calculation type'),
  value: z.any().describe('Calculated value')
});

export let urlParameterResponseSchema = z.looseObject({
  id: z.string().describe('URL parameter identifier'),
  name: z.string().describe('URL parameter name'),
  value: z.any().describe('URL parameter value')
});

export let schedulingResponseSchema = z.looseObject({
  id: z.string().describe('Scheduling field identifier'),
  name: z.string().describe('Scheduling field name'),
  value: z.any().describe('Scheduling value (includes event time, attendee info, etc.)')
});

export let paymentResponseSchema = z.looseObject({
  id: z.string().describe('Payment field identifier'),
  name: z.string().describe('Payment field name'),
  value: z.any().describe('Payment value (includes amount, currency, status, etc.)')
});

export let quizResponseSchema = z.looseObject({
  score: z.number().optional().describe('Quiz score, when available'),
  maxScore: z.number().optional().describe('Maximum possible quiz score, when available')
});

export let loginResponseSchema = z.looseObject({
  email: z.string().describe('Native login email; API imports do not verify identity')
});

export let submissionSchema = z.looseObject({
  submissionId: z.string().describe('Unique identifier of the submission'),
  submissionTime: z.string().describe('ISO 8601 timestamp of when the submission was made'),
  lastUpdatedAt: z.string().optional().describe('ISO 8601 timestamp of the last update'),
  questions: z.array(questionResponseSchema).describe('Question responses'),
  startedAt: z.string().optional(),
  documents: z
    .array(z.looseObject({ id: z.string(), name: z.string(), url: z.string() }))
    .optional()
    .describe('Native generated document metadata and provider links'),
  approvals: z.array(z.record(z.string(), z.unknown())).optional(),
  calculations: z.array(calculationResponseSchema).optional().describe('Calculated values'),
  urlParameters: z
    .array(urlParameterResponseSchema)
    .optional()
    .describe('URL parameter values'),
  scheduling: z.array(schedulingResponseSchema).optional().describe('Scheduling details'),
  payments: z.array(paymentResponseSchema).optional().describe('Payment information'),
  quiz: quizResponseSchema.nullable().optional().describe('Quiz score results'),
  login: loginResponseSchema.optional().describe('Login information'),
  editLink: z.string().optional().describe('Link to edit the submission')
});

export let submissionListResponseSchema = z.looseObject({
  responses: z.array(submissionSchema).describe('Array of submission objects'),
  totalResponses: z
    .number()
    .int()
    .nonnegative()
    .safe()
    .describe('Total number of matching submissions'),
  pageCount: z.number().int().nonnegative().safe().describe('Total number of pages')
});
