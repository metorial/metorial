import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateQuery = SlateTool.create(spec, {
  name: 'Validate Query',
  key: 'validate_query',
  description: `Check whether Wolfram Alpha can understand and process a given query before sending a full request.
Combines query validation (parsing check) and fast query recognition (result significance score and content domain classification).
Useful for pre-screening queries to avoid unnecessary API calls.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The query to validate'),
      recognizerMode: z
        .enum(['Default', 'Voice'])
        .optional()
        .describe('Recognition mode. "Voice" is more permissive for spoken input.')
    })
  )
  .output(
    z.object({
      isValid: z.boolean().describe('Whether the query can be parsed by Wolfram Alpha'),
      isAccepted: z
        .boolean()
        .optional()
        .describe('Whether the fast query recognizer accepts the query'),
      domain: z.string().optional().describe('Expected content domain for the query'),
      confidence: z
        .number()
        .optional()
        .describe('Result significance score normalized from 0 to 1; not a probability'),
      resultSignificanceScore: z
        .number()
        .optional()
        .describe('Provider result significance score from 0 to 100'),
      timing: z.number().optional().describe('Validation processing time in seconds'),
      parseTimedOut: z.boolean().optional().describe('Whether the parse phase timed out'),
      assumptions: z
        .any()
        .optional()
        .describe('Initial assumptions identified during validation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [validationResult, recognizerResult] = await Promise.all([
      client.validateQuery({ input: ctx.input.query }),
      client.fastQueryRecognizer({ input: ctx.input.query, mode: ctx.input.recognizerMode })
    ]);

    let validation = validationResult;
    if (typeof validation.success !== 'boolean') {
      throw createApiServiceError('Wolfram Alpha returned an invalid validation status.');
    }
    let isValid = validation.success;
    let query = Array.isArray(recognizerResult.query)
      ? recognizerResult.query[0]
      : recognizerResult.query;
    if (
      !isApiErrorRecord(query) ||
      (query.accepted !== true &&
        query.accepted !== false &&
        query.accepted !== 'true' &&
        query.accepted !== 'false')
    ) {
      throw createApiServiceError(
        'Wolfram Alpha returned an invalid query recognition status.'
      );
    }
    let isAccepted = query.accepted === true || query.accepted === 'true';
    let domain = typeof query.domain === 'string' ? query.domain : undefined;
    let rawScore = query.resultsignificancescore;
    let parsedScore =
      typeof rawScore === 'number' || (typeof rawScore === 'string' && rawScore.trim())
        ? Number(rawScore)
        : undefined;
    let resultSignificanceScore =
      parsedScore !== undefined &&
      Number.isFinite(parsedScore) &&
      parsedScore >= 0 &&
      parsedScore <= 100
        ? parsedScore
        : undefined;
    let confidence =
      resultSignificanceScore === undefined ? undefined : resultSignificanceScore / 100;

    let message = isValid
      ? `Query "${ctx.input.query}" is valid and can be processed.${domain ? ` Domain: ${domain}.` : ''}${resultSignificanceScore !== undefined ? ` Result significance: ${resultSignificanceScore}/100.` : ''}`
      : `Query "${ctx.input.query}" may not be understood by Wolfram Alpha.`;

    return {
      output: {
        isValid,
        isAccepted,
        domain,
        confidence,
        resultSignificanceScore,
        timing: typeof validation.timing === 'number' ? validation.timing : undefined,
        parseTimedOut:
          typeof validation.parsetimedout === 'boolean' ? validation.parsetimedout : undefined,
        assumptions: validation?.assumptions
      },
      message
    };
  })
  .build();
