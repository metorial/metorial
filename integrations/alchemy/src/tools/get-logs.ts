import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getLogs = SlateTool.create(spec, {
  name: 'Get Logs',
  key: 'get_logs',
  description: `Retrieve event logs emitted by smart contracts within a block range. Filter by contract address and/or event topics.
Use this to monitor smart contract events, track specific on-chain actions, or query historical event data.`,
  instructions: [
    'Topics follow Ethereum log topic conventions: topics[0] is the event signature hash, subsequent topics are indexed parameters.',
    'Block parameters should be hex-encoded or use "latest"/"earliest".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contractAddress: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Contract address or array of addresses to filter logs'),
      topics: z
        .array(z.union([z.string(), z.array(z.string()), z.null()]))
        .optional()
        .describe('Array of topic filters. First topic is event signature hash.'),
      fromBlock: z
        .string()
        .optional()
        .default('latest')
        .describe('Start block (hex or "latest"/"earliest")'),
      toBlock: z
        .string()
        .optional()
        .default('latest')
        .describe('End block (hex or "latest"/"earliest")')
    })
  )
  .output(
    z.object({
      logs: z
        .array(
          z.object({
            contractAddress: z.string().describe('Contract that emitted the log'),
            topics: z.array(z.string()).describe('Log topics'),
            logData: z.string().describe('Log data'),
            blockNumber: z.string().describe('Block number in hex'),
            transactionHash: z.string().describe('Transaction hash'),
            logIndex: z.string().describe('Log index in hex'),
            blockHash: z.string().describe('Block hash'),
            removed: z
              .boolean()
              .optional()
              .describe('Whether the log was removed due to chain reorganization')
          })
        )
        .describe('List of event logs'),
      count: z.number().describe('Number of logs returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    let rawLogs = await client.getLogs({
      fromBlock: ctx.input.fromBlock,
      toBlock: ctx.input.toBlock,
      address: ctx.input.contractAddress,
      topics: ctx.input.topics
    });

    let logs = rawLogs.map((log: any) => ({
      contractAddress: log.address,
      topics: log.topics,
      logData: log.data,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      blockHash: log.blockHash,
      removed: log.removed
    }));

    return {
      output: {
        logs,
        count: logs.length
      },
      message: `Found **${logs.length}** log(s) from block ${ctx.input.fromBlock} to ${ctx.input.toBlock}.`
    };
  })
  .build();
