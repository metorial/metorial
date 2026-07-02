import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateQuery = SlateTool.create(spec, {
  name: 'Validate Query',
  key: 'validate_query',
  description: `Check whether Wolfram Alpha can understand and process a given query before sending a full request.
Combines query validation (parsing check) and fast query recognition (confidence score and content domain classification).
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
      confidence: z.number().optional().describe('Confidence score from 0 to 1'),
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
      client
        .fastQueryRecognizer({ input: ctx.input.query, mode: ctx.input.recognizerMode })
        .catch(() => null)
    ]);

    let validation = validationResult?.validatequeryresult ?? validationResult;
    let isValid = validation?.success ?? false;

    let isAccepted: boolean | undefined;
    let domain: string | undefined;
    let confidence: number | undefined;

    if (recognizerResult) {
      isAccepted = recognizerResult?.accepted ?? recognizerResult?.query?.accepted;
      domain = recognizerResult?.domain ?? recognizerResult?.query?.domain;
      let rawConfidence = recognizerResult?.confidence ?? recognizerResult?.query?.confidence;
      if (rawConfidence != null) {
        confidence =
          typeof rawConfidence === 'string' ? Number.parseFloat(rawConfidence) : rawConfidence;
      }
    }

    let message = isValid
      ? `Query "${ctx.input.query}" is valid and can be processed.${domain ? ` Domain: ${domain}.` : ''}${confidence != null ? ` Confidence: ${(confidence * 100).toFixed(0)}%.` : ''}`
      : `Query "${ctx.input.query}" may not be understood by Wolfram Alpha.`;

    return {
      output: {
        isValid,
        isAccepted,
        domain,
        confidence,
        timing: validation?.timing,
        parseTimedOut: validation?.parsetimedout,
        assumptions: validation?.assumptions
      },
      message
    };
  })
  .build();
