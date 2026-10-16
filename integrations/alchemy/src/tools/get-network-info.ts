import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getNetworkInfo = SlateTool.create(spec, {
  key: 'get_network_info',
  name: 'Get Network Info',
  description:
    'Verify the configured EVM network by reading its chain ID, current block number, and node client version. This describes the blockchain endpoint rather than an Alchemy account.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      network: z.string(),
      chainId: z.string(),
      latestBlockNumber: z.string(),
      clientVersion: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({ token: ctx.auth.token, network: ctx.config.network });
    let [chainId, latestBlockNumber, clientVersion] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
      client.getClientVersion()
    ]);
    return {
      output: { network: ctx.config.network, chainId, latestBlockNumber, clientVersion },
      message: `Connected to **${ctx.config.network}**, chain ID \`${chainId}\`, at block \`${latestBlockNumber}\`.`
    };
  })
  .build();
