import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStatistics = SlateTool.create(spec, {
  name: 'Get Statistics',
  key: 'get_statistics',
  description: `Retrieve current sequence email and LinkedIn engagement statistics, email step statistics, or the enrolled-contact count. The contacts report requires sequenceId. Global overview/email results cover the provider default last-week window (maximum supported window: 31 days).`,
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
    let client = new Client(ctx.auth);
    let { sequenceId, reportType } = ctx.input;
    let type = reportType ?? 'overview';

    let params = sequenceId !== undefined ? { sequenceId } : undefined;
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
