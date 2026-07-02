import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let noteSchema = z.object({
  noteId: z.string().describe('ID of the note'),
  body: z.string().describe('Note content'),
  createdAt: z.number().describe('Unix timestamp when the note was created')
});

let additionalAnswerSchema = z.object({
  answerId: z.string().describe('ID of the answer'),
  value: z
    .any()
    .describe(
      'Answer value containing free_response, scale, select_one, and select_many fields'
    ),
  question: z.any().describe('Question object with id, type, and text fields')
});

let surveyResponseSchema = z.object({
  responseId: z.string().describe('Unique ID of the survey response'),
  person: z.any().describe('Person ID or expanded person object'),
  surveyType: z
    .string()
    .describe('Type of survey (nps, csat, ces, pmf, enps, smileys, stars, thumbs)'),
  score: z.number().describe('Response score'),
  comment: z.string().nullable().describe('Optional text comment from the respondent'),
  permalink: z.string().nullable().describe('Link to view the response in Delighted'),
  createdAt: z.number().describe('Unix timestamp when the response was created'),
  updatedAt: z.number().describe('Unix timestamp when the response was last updated'),
  personProperties: z
    .record(z.string(), z.string())
    .describe('Custom properties of the person'),
  notes: z.array(noteSchema).describe('Internal notes added to the response'),
  tags: z.array(z.string()).describe('Tags applied to the response'),
  additionalAnswers: z
    .array(additionalAnswerSchema)
    .describe('Answers to additional questions')
});

export let listSurveyResponses = SlateTool.create(spec, {
  name: 'List Survey Responses',
  key: 'list_survey_responses',
  description: `Retrieve survey responses with scores, comments, tags, notes, and additional question answers. Supports filtering by date range, person, and trend. Results are paginated.`,
  instructions: [
    'Use since/until for filtering by creation date, or updatedSince/updatedUntil for filtering by update date.',
    'Set expandPerson to true to include full person details in each response.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Results per page (max 100, default 20)'),
      page: z.number().optional().describe('Page number (default 1)'),
      since: z
        .number()
        .optional()
        .describe('Unix timestamp to filter responses created on or after this time'),
      until: z
        .number()
        .optional()
        .describe('Unix timestamp to filter responses created on or before this time'),
      updatedSince: z
        .number()
        .optional()
        .describe('Unix timestamp to filter responses updated on or after this time'),
      updatedUntil: z
        .number()
        .optional()
        .describe('Unix timestamp to filter responses updated on or before this time'),
      personId: z.string().optional().describe('Filter responses by person ID'),
      personEmail: z.string().optional().describe('Filter responses by person email'),
      trend: z.string().optional().describe('Filter by trend ID'),
      order: z
        .enum(['asc', 'desc', 'asc:updated_at', 'desc:updated_at'])
        .optional()
        .describe('Sort order (default asc)'),
      expandPerson: z
        .boolean()
        .optional()
        .describe('Set to true to expand person details in each response')
    })
  )
  .output(
    z.object({
      responses: z.array(surveyResponseSchema).describe('List of survey responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let responses = await client.listSurveyResponses({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      since: ctx.input.since,
      until: ctx.input.until,
      updatedSince: ctx.input.updatedSince,
      updatedUntil: ctx.input.updatedUntil,
      personId: ctx.input.personId,
      personEmail: ctx.input.personEmail,
      trend: ctx.input.trend,
      order: ctx.input.order,
      expandPerson: ctx.input.expandPerson
    });

    return {
      output: { responses },
      message: `Retrieved **${responses.length}** survey response(s).`
    };
  })
  .build();
