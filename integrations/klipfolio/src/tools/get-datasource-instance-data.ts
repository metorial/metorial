import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDatasourceInstanceData = SlateTool.create(spec, {
  name: 'Get Data Source Instance Data',
  key: 'get_datasource_instance_data',
  description:
    'DEPRECATED — use `download_datasource_instance_data` instead. This legacy tool preserves its columns and rows response contract; current data source content may not contain those fields.',
  instructions: [
    'Use download_datasource_instance_data to receive the actual source content as a downloadable file.'
  ],
  tags: {
    readOnly: true,
    deprecated: true
  }
})
  .input(
    z.object({
      instanceId: z.string().describe('ID of the data source instance')
    })
  )
  .output(
    z.object({
      columns: z.array(z.any()).optional(),
      rows: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getDatasourceInstanceData(ctx.input.instanceId);

    return {
      output: {
        columns: data?.columns,
        rows: data?.rows
      },
      message: `Retrieved data for instance \`${ctx.input.instanceId}\` — ${data?.rows?.length ?? 0} row(s), ${data?.columns?.length ?? 0} column(s).`
    };
  })
  .build();
