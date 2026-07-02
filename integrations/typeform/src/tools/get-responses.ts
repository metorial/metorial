import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

let answerSchema = z.object({
  fieldId: z.string().describe('ID of the answered field'),
  fieldType: z.string().describe('Type of the answered field'),
  fieldRef: z.string().optional().describe('Reference of the answered field'),
  type: z
    .string()
    .describe(
      'Answer type (text, email, number, boolean, choice, choices, date, file_url, url, payment)'
    ),
  text: z.string().optional().describe('Text answer value'),
  email: z.string().optional().describe('Email answer value'),
  number: z.number().optional().describe('Number answer value'),
  boolean: z.boolean().optional().describe('Yes/no answer value'),
  date: z.string().optional().describe('Date answer value'),
  url: z.string().optional().describe('URL answer value'),
  fileUrl: z.string().optional().describe('File upload URL'),
  choiceLabel: z.string().optional().describe('Selected choice label'),
  choiceLabels: z
    .array(z.string())
    .optional()
    .describe('Selected choice labels for multi-select')
});

let responseSchema = z.object({
  responseId: z.string().describe('Unique response ID'),
  token: z.string().optional().describe('Response token (used for deletion)'),
  submittedAt: z.string().optional().describe('Submission timestamp (ISO 8601)'),
  landedAt: z.string().optional().describe('Timestamp when respondent first opened the form'),
  answers: z.array(answerSchema).describe('Array of answers'),
  hiddenFields: z.record(z.string(), z.string()).optional().describe('Hidden field values'),
  calculatedScore: z.number().optional().describe('Calculated quiz score'),
  variables: z
    .array(
      z.object({
        key: z.string().describe('Variable key'),
        type: z.string().describe('Variable type'),
        numberValue: z.number().optional().describe('Numeric value'),
        textValue: z.string().optional().describe('Text value')
      })
    )
    .optional()
    .describe('Response variables'),
  metadata: z
    .object({
      userAgent: z.string().optional().describe('Browser user agent'),
      platform: z.string().optional().describe('Platform (e.g. desktop, mobile)'),
      referer: z.string().optional().describe('Referrer URL'),
      networkId: z.string().optional().describe('Network identifier'),
      browser: z.string().optional().describe('Browser name')
    })
    .optional()
    .describe('Response metadata')
});

export let getResponses = SlateTool.create(spec, {
  name: 'Get Responses',
  key: 'get_responses',
  description: `Retrieve submission responses for a typeform. Supports filtering by date range, search query, completion status, and pagination. Returns structured answer data for each response.`,
  instructions: [
    'Use **since** and **until** to filter by date range (ISO 8601 format or Unix timestamp).',
    'Use **after** and **before** with response tokens for cursor-based pagination.',
    'Set **responseType** to "completed" or "partial" to filter by completion status.'
  ],
  constraints: ['Maximum page size is 1000 responses per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to retrieve responses for'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of responses per page (default 25, max 1000)'),
      since: z
        .string()
        .optional()
        .describe('Filter responses submitted after this date (ISO 8601 or Unix timestamp)'),
      until: z
        .string()
        .optional()
        .describe('Filter responses submitted before this date (ISO 8601 or Unix timestamp)'),
      after: z.string().optional().describe('Response token for forward pagination'),
      before: z.string().optional().describe('Response token for backward pagination'),
      includedResponseIds: z
        .array(z.string())
        .optional()
        .describe('Only include these response IDs'),
      excludedResponseIds: z
        .array(z.string())
        .optional()
        .describe('Exclude these response IDs'),
      sort: z.string().optional().describe('Sort order, e.g. "submitted_at,desc"'),
      query: z.string().optional().describe('Search responses for text matches'),
      responseType: z
        .enum(['completed', 'partial', 'started'])
        .optional()
        .describe('Filter by one response completion status'),
      responseTypes: z
        .array(z.enum(['completed', 'partial', 'started']))
        .optional()
        .describe('Filter by multiple response completion statuses'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Only include answers for these field IDs'),
      answeredFields: z
        .array(z.string())
        .optional()
        .describe('Only include responses that answered at least one of these field IDs')
    })
  )
  .output(
    z.object({
      totalItems: z.number().describe('Total number of responses'),
      pageCount: z.number().describe('Number of pages available'),
      responses: z.array(responseSchema).describe('Array of form responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getResponses(ctx.input.formId, {
      pageSize: ctx.input.pageSize,
      since: ctx.input.since,
      until: ctx.input.until,
      after: ctx.input.after,
      before: ctx.input.before,
      includedResponseIds: ctx.input.includedResponseIds?.join(','),
      excludedResponseIds: ctx.input.excludedResponseIds?.join(','),
      sort: ctx.input.sort,
      query: ctx.input.query,
      responseType: ctx.input.responseType,
      responseTypes: ctx.input.responseTypes,
      fields: ctx.input.fields,
      answeredFields: ctx.input.answeredFields
    });

    let responses = (result.items || []).map((r: any) => {
      let answers = (r.answers || []).map((a: any) => {
        let answer: Record<string, any> = {
          fieldId: a.field?.id,
          fieldType: a.field?.type,
          fieldRef: a.field?.ref,
          type: a.type
        };
        if (a.text !== undefined) answer.text = a.text;
        if (a.email !== undefined) answer.email = a.email;
        if (a.number !== undefined) answer.number = a.number;
        if (a.boolean !== undefined) answer.boolean = a.boolean;
        if (a.date !== undefined) answer.date = a.date;
        if (a.url !== undefined) answer.url = a.url;
        if (a.file_url !== undefined) answer.fileUrl = a.file_url;
        if (a.choice?.label) answer.choiceLabel = a.choice.label;
        if (a.choices?.labels) answer.choiceLabels = a.choices.labels;
        return answer;
      });

      let variables = r.variables?.map((v: any) => ({
        key: v.key,
        type: v.type,
        numberValue: v.number,
        textValue: v.text
      }));

      return {
        responseId: r.response_id,
        token: r.token,
        submittedAt: r.submitted_at,
        landedAt: r.landed_at,
        answers,
        hiddenFields: r.hidden,
        calculatedScore: r.calculated?.score,
        variables,
        metadata: r.metadata
          ? {
              userAgent: r.metadata.user_agent,
              platform: r.metadata.platform,
              referer: r.metadata.referer,
              networkId: r.metadata.network_id,
              browser: r.metadata.browser
            }
          : undefined
      };
    });

    return {
      output: {
        totalItems: result.total_items || 0,
        pageCount: result.page_count || 0,
        responses
      },
      message: `Retrieved **${responses.length}** of **${result.total_items || 0}** total responses for form \`${ctx.input.formId}\`.`
    };
  })
  .build();
