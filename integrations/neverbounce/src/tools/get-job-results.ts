import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobResultsTool = SlateTool.create(spec, {
  name: 'Get Job Results',
  key: 'get_job_results',
  description: `Retrieve paginated verification results for a completed bulk job. Each result contains the original submitted data and the verification outcome including result status, flags, and address parsing information.`,
  instructions: [
    'The job must be in "complete" status before results can be retrieved.',
    'Use pagination to iterate through large result sets.'
  ],
  constraints: ['Items per page must be between 1 and 1000.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.number().describe('The job ID to retrieve results for'),
      page: z.number().optional().describe('Page number (default: 1)'),
      itemsPerPage: z
        .number()
        .optional()
        .describe('Number of results per page, 1-1000 (default: 10)')
    })
  )
  .output(
    z.object({
      totalResults: z.number().describe('Total number of results'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number'),
      results: z
        .array(
          z.object({
            originalData: z
              .record(z.string(), z.string())
              .describe('Original data submitted for this row'),
            verificationResult: z
              .string()
              .describe(
                'Verification result: valid, invalid, disposable, catchall, or unknown'
              ),
            flags: z.array(z.string()).describe('Verification flags'),
            suggestedCorrection: z
              .string()
              .describe('Suggested email correction if applicable'),
            addressInfo: z
              .object({
                originalEmail: z.string(),
                normalizedEmail: z.string(),
                addr: z.string(),
                alias: z.string(),
                host: z.string(),
                fqdn: z.string(),
                domain: z.string(),
                subdomain: z.string(),
                tld: z.string()
              })
              .optional()
              .describe('Parsed address components')
          })
        )
        .describe('Verification results for the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getJobResults({
      jobId: ctx.input.jobId,
      page: ctx.input.page,
      itemsPerPage: ctx.input.itemsPerPage
    });

    return {
      output: {
        totalResults: result.totalResults,
        totalPages: result.totalPages,
        currentPage: result.query.page,
        results: result.results.map(r => ({
          originalData: r.data,
          verificationResult: r.verification.result,
          flags: r.verification.flags,
          suggestedCorrection: r.verification.suggestedCorrection,
          addressInfo: r.verification.addressInfo
        }))
      },
      message: `Retrieved **${result.results.length}** results (page ${result.query.page} of ${result.totalPages}, ${result.totalResults} total).`
    };
  })
  .build();
