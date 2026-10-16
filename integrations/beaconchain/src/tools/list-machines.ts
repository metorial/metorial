import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let listMachines = SlateTool.create(spec, {
  key: 'list_machines',
  name: 'List Machines',
  description:
    'List known monitoring machine names for the authenticated account. Use the returned names to filter get_machine_metrics.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      machines: z.any().describe('Complete response containing the account machine names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({ token: ctx.auth.token, chain: ctx.config.chain });
    let machines = await client.getMachineNames();
    return { output: { machines }, message: 'Retrieved monitoring machine names.' };
  })
  .build();
