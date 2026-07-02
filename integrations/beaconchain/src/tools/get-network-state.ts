import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getNetworkState = SlateTool.create(spec, {
  name: 'Get Network State',
  key: 'get_network_state',
  description: `Retrieve the current state of the Ethereum network including chain health, total validator count, current epoch, and staking queue information.
Optionally include network configuration parameters, validator state distribution, and network-wide performance aggregates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeQueues: z
        .boolean()
        .optional()
        .describe('Include staking queue data with activation and exit wait times'),
      includeValidatorStates: z
        .boolean()
        .optional()
        .describe('Include the distribution of validator states across the network'),
      includeNetworkPerformance: z
        .boolean()
        .optional()
        .describe('Include network-wide aggregated performance metrics'),
      includeNetworkConfig: z
        .boolean()
        .optional()
        .describe('Include network configuration parameters')
    })
  )
  .output(
    z.object({
      chainState: z
        .any()
        .describe(
          'Current chain state with health, epoch, slot, validator count, and other metrics'
        ),
      queues: z
        .any()
        .optional()
        .describe('Staking queue data with activation and exit wait times'),
      validatorStates: z
        .any()
        .optional()
        .describe('Distribution of validator states across the network'),
      networkPerformance: z
        .any()
        .optional()
        .describe('Network-wide aggregated performance metrics'),
      networkConfig: z.any().optional().describe('Network configuration parameters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({
      token: ctx.auth.token,
      chain: ctx.config.chain
    });

    let chainState = await client.getChainState();

    let result: Record<string, any> = { chainState };

    if (ctx.input.includeQueues) {
      result.queues = await client.getStakingQueues();
    }

    if (ctx.input.includeValidatorStates) {
      result.validatorStates = await client.getValidatorStates();
    }

    if (ctx.input.includeNetworkPerformance) {
      result.networkPerformance = await client.getNetworkPerformanceAggregate();
    }

    if (ctx.input.includeNetworkConfig) {
      result.networkConfig = await client.getNetworkConfig();
    }

    return {
      output: result as any,
      message: `Retrieved Ethereum ${ctx.config.chain} network state.`
    };
  })
  .build();
