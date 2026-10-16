import { createApiServiceError, getApiErrorStatus, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCandidateReport = SlateTool.create(spec, {
  name: 'Get Candidate Report',
  key: 'get_candidate_report',
  description: `Retrieve a candidate's test details and prepare their PDF report for download. Includes the candidate's score, status, completion information, and the original report URL. PDF generation can be temporarily unavailable; retry the request later if HackerRank is still generating it.`,
  tags: { readOnly: true }
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
    let controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), 20_000);
    try {
      let candidateResult = await client.getCandidate(
        ctx.input.testId,
        ctx.input.candidateId,
        controller.signal
      );
      let candidate = candidateResult.data ?? candidateResult;
      let reportResult: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          reportResult = await client.getCandidateReportUrl(
            ctx.input.testId,
            ctx.input.candidateId,
            controller.signal
          );
          break;
        } catch (error) {
          let status =
            getApiErrorStatus(error) ??
            (isApiErrorRecord(error) && isApiErrorRecord(error.data)
              ? error.data.upstreamStatus
              : undefined);
          if (String(status) !== '503' || attempt === 2 || controller.signal.aborted)
            throw error;
          await new Promise<void>((resolve, reject) => {
            let onAbort = () => {
              clearTimeout(delay);
              controller.signal.removeEventListener('abort', onAbort);
              reject(
                createApiServiceError(
                  'The candidate report request exceeded its time budget. Request the report again later.'
                )
              );
            };
            let delay = setTimeout(
              () => {
                controller.signal.removeEventListener('abort', onAbort);
                resolve();
              },
              500 * (attempt + 1)
            );
            controller.signal.addEventListener('abort', onAbort, { once: true });
            if (controller.signal.aborted) onAbort();
          });
        }
      }
      let reportUrl =
        typeof reportResult === 'string'
          ? reportResult
          : (reportResult?.data?.url ?? reportResult?.url);
      if (typeof reportUrl !== 'string' || !/^https?:\/\//i.test(reportUrl))
        throw createApiServiceError(
          'HackerRank did not return a PDF download URL. Request the candidate report again later.'
        );
      await ctx.addAttachment({ type: 'url', url: reportUrl, mimeType: 'application/pdf' });
      return {
        output: { candidate, reportUrl },
        message: `Retrieved candidate **${candidate.email ?? ctx.input.candidateId}** and prepared the PDF report for download.`
      };
    } finally {
      clearTimeout(timer);
    }
  });
