import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAnalysis = SlateTool.create(spec, {
  name: 'Get Root Cause Analysis',
  key: 'get_analysis',
  description: `Retrieves root cause analysis results for a specific uptime check. Helps diagnose why a check failed by providing detailed error information and analysis from different probe servers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkId: z.number().describe('ID of the check to get analysis for'),
      limit: z.number().optional().describe('Maximum number of analysis results'),
      offset: z.number().optional().describe('Offset for pagination'),
      from: z.number().optional().describe('Start timestamp (Unix epoch)'),
      to: z.number().optional().describe('End timestamp (Unix epoch)')
    })
  )
  .output(
    z.object({
      analysis: z
        .array(
          z.object({
            analysisId: z.number().optional().describe('Analysis ID'),
            timeFirstTest: z.number().optional().describe('Time of first test (Unix epoch)'),
            timeConfirmTest: z
              .number()
              .optional()
              .describe('Time of confirmation test (Unix epoch)')
          })
        )
        .describe('Root cause analysis results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.getAnalysis(ctx.input.checkId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let analysis = (result.analysis || []).map((a: any) => ({
      analysisId: a.id,
      timeFirstTest: a.timefirsttest,
      timeConfirmTest: a.timeconfirmtest
    }));

    return {
      output: { analysis },
      message: `Retrieved **${analysis.length}** root cause analysis result(s) for check ${ctx.input.checkId}.`
    };
  })
  .build();
