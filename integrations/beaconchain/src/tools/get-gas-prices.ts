import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getGasPrices = SlateTool.create(spec, {
  key: 'get_gas_prices',
  name: 'Get Gas Prices',
  description:
    'Retrieve current rapid, fast, standard, and slow execution-layer gas fee recommendations in wei per gas, with the provider timestamp and ETH price snapshot.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({ gasPrices: z.any().describe('Complete current gas recommendations response') })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({ token: ctx.auth.token, chain: ctx.config.chain });
    let gasPrices = await client.getGasNow();
    return {
      output: { gasPrices },
      message: `Retrieved gas fee recommendations on ${ctx.config.chain}.`
    };
  })
  .build();
