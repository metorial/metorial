import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStatistics = SlateTool.create(spec, {
  name: 'Get Statistics',
  key: 'get_statistics',
  description: `Retrieve performance statistics for sequences, including email metrics (sent, opened, clicked, replied, bounced) and contact engagement data. Can fetch stats for a specific sequence or across all sequences.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sequenceId: z
        .number()
        .optional()
        .describe('Sequence ID to get statistics for. Omit to get stats for all sequences.'),
      reportType: z
        .enum(['overview', 'emails', 'contacts'])
        .optional()
        .describe('Type of statistics report to retrieve (default: overview)')
    })
  )
  .output(
    z.object({
      statistics: z.record(z.string(), z.any()).describe('Statistics data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sequenceId, reportType } = ctx.input;
    let type = reportType ?? 'overview';

    let params = sequenceId ? { sequenceId } : undefined;
    let statistics: any;

    if (type === 'emails') {
      statistics = await client.getSequenceEmailStatistics(params);
    } else if (type === 'contacts') {
      statistics = await client.getSequenceContactStatistics(params);
    } else {
      statistics = await client.getSequenceStatistics(params);
    }

    return {
      output: { statistics },
      message: `Retrieved **${type}** statistics${sequenceId ? ` for sequence **${sequenceId}**` : ' across all sequences'}.`
    };
  })
  .build();
