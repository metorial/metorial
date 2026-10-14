import { SlateTool } from 'slates';
import { z } from 'zod';
import type { FindAllCandidate } from '../lib/client';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFindallResults = SlateTool.create(spec, {
  name: 'Get FindAll Results',
  key: 'get_findall_results',
  description: `Check the status of a FindAll entity discovery run and retrieve candidate results or an in-progress snapshot.
Use the run ID returned by the **Find Entities** tool.`,
  instructions: [
    'Set includeResults to true to retrieve available candidates once the run has stopped; inspect matchStatus to identify matches.',
    'Set includePartialResults to retrieve the current snapshot while a run is active.',
    'Terminal runs, including cancelled runs, retain their available candidates.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      findallId: z.string().describe('FindAll run ID from the Find Entities tool'),
      includeResults: z
        .boolean()
        .optional()
        .describe(
          'If true and run has stopped, fetch its available results. Defaults to false.'
        ),
      includePartialResults: z
        .boolean()
        .optional()
        .describe(
          'Fetch a candidate snapshot even while the run is active. Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      findallId: z.string().describe('FindAll run ID'),
      status: z
        .string()
        .describe(
          'Current run status, including queued, running, completed, failed, or cancelled'
        ),
      metrics: z
        .object({
          generatedCandidatesCount: z.number().describe('Number of candidates generated'),
          matchedCandidatesCount: z
            .number()
            .describe('Number of candidates that matched conditions')
        })
        .describe('Progress metrics'),
      createdAt: z.string().describe('Creation timestamp'),
      modifiedAt: z.string().describe('Last modification timestamp'),
      candidates: z
        .array(
          z.object({
            candidateId: z.string().describe('Unique candidate ID'),
            name: z.string().describe('Entity name'),
            url: z.string().describe('Entity URL'),
            description: z.string().describe('Entity description'),
            matchStatus: z
              .string()
              .describe('Match status: generated, matched, unmatched, or discarded'),
            output: z
              .record(
                z.string(),
                z.object({
                  value: z.string().describe('Condition evaluation value'),
                  isMatched: z.boolean().describe('Whether this condition matched')
                })
              )
              .describe('Per-condition match results'),
            rawOutput: z
              .record(z.string(), z.unknown())
              .optional()
              .describe(
                'Original provider field values, including structured enrichment data'
              ),
            basis: z
              .array(
                z.object({
                  field: z.string().describe('Condition name'),
                  citations: z
                    .array(
                      z.object({
                        url: z.string().describe('Source URL'),
                        excerpts: z.array(z.string()).describe('Supporting excerpts')
                      })
                    )
                    .describe('Citations'),
                  reasoning: z.string().describe('Reasoning explanation'),
                  confidence: z.string().describe('Confidence level')
                })
              )
              .describe('Evidence and reasoning per condition')
          })
        )
        .nullable()
        .describe(
          'Available candidates; null if results were not requested or an active snapshot was not requested'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let run = await client.getFindAllRun(ctx.input.findallId);

    let candidates: FindAllCandidate[] | null = null;
    if (ctx.input.includePartialResults || (ctx.input.includeResults && !run.isActive)) {
      let results = await client.getFindAllResults(ctx.input.findallId);
      candidates = results.candidates;
    }

    return {
      output: {
        findallId: run.findallId,
        status: run.status,
        metrics: run.metrics,
        createdAt: run.createdAt,
        modifiedAt: run.modifiedAt,
        candidates
      },
      message: `FindAll run **${run.findallId}** status: **${run.status}** — ${run.metrics.matchedCandidatesCount} matched out of ${run.metrics.generatedCandidatesCount} candidates.${candidates ? ` Results retrieved.` : ''}`
    };
  })
  .build();
