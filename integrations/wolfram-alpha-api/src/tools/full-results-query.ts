import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let podSubpodSchema = z
  .object({
    title: z.string().optional(),
    plaintext: z.string().optional(),
    img: z
      .object({
        src: z.string().optional(),
        alt: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional()
      })
      .optional()
  })
  .passthrough();

let podSchema = z
  .object({
    title: z.string().optional(),
    scanner: z.string().optional(),
    podId: z.string().optional(),
    position: z.number().optional(),
    numsubpods: z.number().optional(),
    subpods: z.array(podSubpodSchema).optional()
  })
  .passthrough();

let assumptionSchema = z
  .object({
    type: z.string().optional(),
    word: z.string().optional(),
    template: z.string().optional(),
    count: z.number().optional(),
    values: z
      .array(
        z
          .object({
            name: z.string().optional(),
            desc: z.string().optional(),
            input: z.string().optional()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough();

export let fullResultsQuery = SlateTool.create(spec, {
  name: 'Full Results Query',
  key: 'full_results_query',
  description: `Submit a natural language query to Wolfram Alpha and receive comprehensive, structured results organized into categorized pods (e.g., Input Interpretation, Result, Charts, Properties).
Supports filtering by pod ID, title, index, or scanner type. Results include plaintext, images, and assumptions for disambiguation.
Use this when you need detailed, multi-faceted computational answers.`,
  instructions: [
    'Use the "assumptions" parameter to disambiguate when the API returns assumption data.',
    'Set "format" to control which content types are returned (e.g., "plaintext,image" for both).',
    'Use "location" for queries that depend on geographic context (e.g., weather, time).'
  ],
  constraints: ['Complex queries may time out. Increase timeout if needed.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Natural language query to compute (e.g., "integrate x^2 dx", "population of France")'
        ),
      format: z
        .string()
        .optional()
        .describe(
          'Comma-separated content types: plaintext, image, mathml, sound, minput, moutput'
        ),
      includePodId: z
        .string()
        .optional()
        .describe('Only include pods with this ID (e.g., "Result", "Input")'),
      excludePodId: z.string().optional().describe('Exclude pods with this ID'),
      podTitle: z.string().optional().describe('Only include pods with this title'),
      podIndex: z
        .string()
        .optional()
        .describe('Comma-separated pod indices to include (e.g., "1,2,3")'),
      scanner: z
        .string()
        .optional()
        .describe('Only include pods from this scanner type (e.g., "Numeric", "Data")'),
      assumptions: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Assumption values for disambiguation, from a previous query response'),
      podState: z
        .string()
        .optional()
        .describe(
          'Request additional pod states (e.g., "Step-by-step solution", "More digits")'
        ),
      units: z.enum(['metric', 'imperial']).optional().describe('Unit system for results'),
      location: z
        .string()
        .optional()
        .describe('Location context for the query (e.g., "New York, NY")'),
      ip: z.string().optional().describe('IP address for location-sensitive queries'),
      latLong: z
        .string()
        .optional()
        .describe('Latitude,longitude for location-sensitive queries (e.g., "40.7,-74.0")'),
      maxWidth: z.number().optional().describe('Maximum image width in pixels'),
      reinterpret: z
        .boolean()
        .optional()
        .describe('Whether to reinterpret the query if no results found'),
      significantDigits: z
        .number()
        .optional()
        .describe('Number of significant digits for numeric results')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the query was successful'),
      numpods: z.number().optional().describe('Number of pods in the result'),
      pods: z
        .array(podSchema)
        .optional()
        .describe('Result pods containing the computed answer'),
      assumptions: z
        .array(assumptionSchema)
        .optional()
        .describe('Disambiguation assumptions available for refining the query'),
      timedout: z.string().optional().describe('Pod scanners that timed out'),
      timing: z.number().optional().describe('Total query processing time in seconds'),
      parseTimedOut: z.boolean().optional().describe('Whether the query parsing timed out'),
      tips: z.any().optional().describe('Suggestions for improving the query'),
      didYouMeans: z.any().optional().describe('Suggested alternative queries'),
      errorMessage: z.string().optional().describe('Error message if the query failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.fullResultsQuery({
      input: ctx.input.query,
      format: ctx.input.format,
      includePodId: ctx.input.includePodId,
      excludePodId: ctx.input.excludePodId,
      podTitle: ctx.input.podTitle,
      podIndex: ctx.input.podIndex,
      scanner: ctx.input.scanner,
      assumption: ctx.input.assumptions,
      podState: ctx.input.podState,
      units: ctx.input.units ?? ctx.config.unitSystem,
      location: ctx.input.location,
      ip: ctx.input.ip,
      latLong: ctx.input.latLong,
      maxWidth: ctx.input.maxWidth,
      reinterpret: ctx.input.reinterpret,
      sig: ctx.input.significantDigits
    });

    let queryResult = result?.queryresult ?? result;
    let success = queryResult?.success ?? false;
    let pods = queryResult?.pods ?? [];
    let assumptions = queryResult?.assumptions
      ? Array.isArray(queryResult.assumptions)
        ? queryResult.assumptions
        : [queryResult.assumptions]
      : [];

    let podSummaries = pods.map((pod: any) => {
      let title = pod.title ?? 'Untitled';
      let texts = (pod.subpods ?? []).map((sp: any) => sp.plaintext).filter(Boolean);
      return `**${title}**: ${texts.join(', ') || '(image/non-text result)'}`;
    });

    let message = success
      ? `Query computed successfully with ${pods.length} pod(s):\n${podSummaries.join('\n')}`
      : `Query did not produce results. ${(queryResult?.tips?.text ?? queryResult?.didyoumeans) ? 'See suggestions in the output.' : 'Try rephrasing or check the query.'}`;

    return {
      output: {
        success,
        numpods: queryResult?.numpods,
        pods,
        assumptions,
        timedout: queryResult?.timedout,
        timing: queryResult?.timing,
        parseTimedOut: queryResult?.parsetimedout,
        tips: queryResult?.tips,
        didYouMeans: queryResult?.didyoumeans,
        errorMessage: queryResult?.error
          ? typeof queryResult.error === 'object'
            ? queryResult.error.msg
            : String(queryResult.error)
          : undefined
      },
      message
    };
  })
  .build();
