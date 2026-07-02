import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFindallResults = SlateTool.create(spec, {
  name: 'Get FindAll Results',
  key: 'get_findall_results',
  description: `Check the status of a FindAll entity discovery run and retrieve matched entities when complete.
Use the run ID returned by the **Find Entities** tool.`,
  instructions: [
    'Set includeResults to true to retrieve the list of matched candidates.',
    'If the run is not yet complete, only status and metrics are returned.'
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
        .describe('If true and run is completed, fetch the full results. Defaults to false.')
    })
  )
  .output(
    z.object({
      findallId: z.string().describe('FindAll run ID'),
      status: z.string().describe('Current status: queued, running, or completed'),
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
            matchStatus: z.string().describe('Match status: generated, matched, or unmatched'),
            output: z
              .record(
                z.string(),
                z.object({
                  value: z.string().describe('Condition evaluation value'),
                  isMatched: z.boolean().describe('Whether this condition matched')
                })
              )
              .describe('Per-condition match results'),
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
        .describe('Matched candidates (null if results not requested or run not complete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let run = await client.getFindAllRun(ctx.input.findallId);

    let candidates: any = null;
    if (ctx.input.includeResults && run.status === 'completed') {
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
