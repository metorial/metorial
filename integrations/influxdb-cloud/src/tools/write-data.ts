import { SlateTool } from 'slates';
import { z } from 'zod';

import { createClient, orgIdInput } from '../lib/helpers';
import { spec } from '../spec';

export let writeData = SlateTool.create(spec, {
  name: 'Write Data',
  key: 'write_data',
  description: `Write time-series data to an InfluxDB Cloud bucket using **line protocol** format.
Each line represents a data point with measurement, optional tags, fields, and an optional timestamp.
Line protocol format: \`measurement,tag1=val1 field1=val2 timestamp\`.`,
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.',
    'Provide data in InfluxDB line protocol format. Multiple lines can be separated by newlines.',
    'If no timestamp is provided, InfluxDB uses the server time. Cloud writes are queued and become readable asynchronously.'
  ],
  constraints: ['Write size is limited by the InfluxDB Cloud plan.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      bucket: z.string().describe('Name or ID of the bucket to write data to'),
      lineProtocol: z.string().describe('Data in InfluxDB line protocol format'),
      precision: z
        .enum(['ns', 'us', 'ms', 's'])
        .optional()
        .describe('Timestamp precision (default: ns)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the provider accepted the write request')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.writeData({
      bucket: ctx.input.bucket,
      lineProtocol: ctx.input.lineProtocol,
      precision: ctx.input.precision
    });

    return {
      output: { success: true },
      message: `Accepted the write request for bucket **${ctx.input.bucket}**.`
    };
  })
  .build();
