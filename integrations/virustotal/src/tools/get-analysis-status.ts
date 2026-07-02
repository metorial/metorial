import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAnalysisStatus = SlateTool.create(spec, {
  name: 'Get Analysis Status',
  key: 'get_analysis_status',
  description: `Check the status and results of a file or URL analysis by its analysis ID. Use this after submitting a file or URL for scanning to retrieve the results once the analysis is complete.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      analysisId: z
        .string()
        .describe('The analysis ID returned from a file or URL scan submission')
    })
  )
  .output(
    z.object({
      analysisId: z.string().describe('ID of the analysis'),
      status: z.string().describe('Analysis status (e.g. "queued", "completed")'),
      stats: z
        .object({
          malicious: z.number().optional(),
          suspicious: z.number().optional(),
          undetected: z.number().optional(),
          harmless: z.number().optional(),
          timeout: z.number().optional(),
          confirmedTimeout: z.number().optional(),
          failure: z.number().optional(),
          typeUnsupported: z.number().optional()
        })
        .optional()
        .describe('Analysis result statistics'),
      date: z.string().optional().describe('Analysis date (Unix timestamp)'),
      results: z
        .record(
          z.string(),
          z.object({
            category: z.string().optional(),
            engineName: z.string().optional(),
            engineVersion: z.string().optional(),
            result: z.string().nullable().optional(),
            method: z.string().optional(),
            engineUpdate: z.string().optional()
          })
        )
        .optional()
        .describe('Detailed per-engine results (only when completed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAnalysis(ctx.input.analysisId);
    let attrs = result?.attributes ?? {};

    let engineResults: Record<string, any> | undefined;
    if (attrs.results) {
      engineResults = {};
      for (let [engine, data] of Object.entries(attrs.results as Record<string, any>)) {
        engineResults[engine] = {
          category: data.category,
          engineName: data.engine_name,
          engineVersion: data.engine_version,
          result: data.result,
          method: data.method,
          engineUpdate: data.engine_update
        };
      }
    }

    return {
      output: {
        analysisId: result?.id ?? '',
        status: attrs.status ?? 'unknown',
        stats: attrs.stats
          ? {
              malicious: attrs.stats.malicious,
              suspicious: attrs.stats.suspicious,
              undetected: attrs.stats.undetected,
              harmless: attrs.stats.harmless,
              timeout: attrs.stats.timeout,
              confirmedTimeout: attrs.stats['confirmed-timeout'],
              failure: attrs.stats.failure,
              typeUnsupported: attrs.stats['type-unsupported']
            }
          : undefined,
        date: attrs.date?.toString(),
        results: engineResults
      },
      message: `**Analysis** \`${ctx.input.analysisId}\` — **Status:** ${attrs.status ?? 'unknown'}${attrs.stats ? `\n- Malicious: ${attrs.stats.malicious ?? 0}\n- Suspicious: ${attrs.stats.suspicious ?? 0}\n- Harmless: ${attrs.stats.harmless ?? 0}\n- Undetected: ${attrs.stats.undetected ?? 0}` : ''}`
    };
  })
  .build();
