import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCandidateReport = SlateTool.create(spec, {
  name: 'Get Candidate Report',
  key: 'get_candidate_report',
  description: `Retrieve a detailed report for a specific candidate's test attempt. Includes the candidate's score, status, completion time, and a link to the full PDF report. Use this to review individual candidate performance and assessment results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the test'),
      candidateId: z.string().describe('ID of the candidate')
    })
  )
  .output(
    z.object({
      candidate: z
        .record(z.string(), z.any())
        .describe('Full candidate details including score and status'),
      reportUrl: z.string().optional().describe('URL to the candidate PDF report')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [candidateResult, reportResult] = await Promise.all([
      client.getCandidate(ctx.input.testId, ctx.input.candidateId),
      client.getCandidateReportUrl(ctx.input.testId, ctx.input.candidateId).catch(() => null)
    ]);

    let candidate = candidateResult.data ?? candidateResult;
    let reportUrl = reportResult?.data?.url ?? reportResult?.url;

    return {
      output: {
        candidate,
        reportUrl
      },
      message: `Retrieved report for candidate **${candidate.email ?? ctx.input.candidateId}** (score: ${candidate.score ?? 'N/A'}).${reportUrl ? ` [View PDF](${reportUrl})` : ''}`
    };
  });
