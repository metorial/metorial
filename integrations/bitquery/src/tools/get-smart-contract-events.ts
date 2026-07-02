import { SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

let eventOutputSchema = z.object({
  blockTime: z.string().describe('Block timestamp'),
  blockNumber: z.number().optional().describe('Block number'),
  transactionHash: z.string().describe('Transaction hash'),
  transactionFrom: z.string().optional().describe('Transaction sender'),
  transactionTo: z.string().optional().describe('Transaction recipient'),
  contractAddress: z.string().optional().describe('Smart contract address'),
  eventName: z.string().optional().describe('Event name'),
  eventSignature: z.string().optional().describe('Full event signature'),
  arguments: z
    .array(
      z.object({
        name: z.string().optional().describe('Argument name'),
        type: z.string().optional().describe('Argument type'),
        value: z.any().optional().describe('Argument value')
      })
    )
    .optional()
    .describe('Decoded event arguments')
});

export let getSmartContractEvents = SlateTool.create(spec, {
  name: 'Get Smart Contract Events',
  key: 'get_smart_contract_events',
  description: `Retrieve decoded smart contract event logs from EVM blockchains. Bitquery automatically parses events using ABI data, returning structured event names and typed arguments.
Use this to monitor contract activity, track specific events like Transfer, Swap, Approval, or any custom event emitted by a contract.`,
  instructions: [
    'Requires V2 API. The contractAddress is the smart contract that emitted the events.',
    'Optionally filter by event name (e.g., "Transfer", "Swap", "Approval").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      blockchain: z
        .enum([
          'eth',
          'bsc',
          'matic',
          'arbitrum',
          'base',
          'optimism',
          'opbnb',
          'avalanche',
          'fantom',
          'cronos'
        ])
        .describe('EVM blockchain network to query'),
      contractAddress: z.string().describe('Smart contract address to query events from'),
      eventName: z
        .string()
        .optional()
        .describe('Filter by event name (e.g., "Transfer", "Swap", "Approval")'),
      since: z.string().optional().describe('Start datetime filter (ISO 8601 format)'),
      till: z.string().optional().describe('End datetime filter (ISO 8601 format)'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .default(25)
        .describe('Maximum number of events to return')
    })
  )
  .output(
    z.object({
      events: z.array(eventOutputSchema).describe('List of decoded smart contract events'),
      eventCount: z.number().describe('Number of events returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BitqueryClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
    });

    let { blockchain, contractAddress, eventName, since, till, limit } = ctx.input;
    ctx.info(`Fetching smart contract events for ${contractAddress} on ${blockchain}`);

    if (ctx.config.apiVersion === 'v1') {
      let networkMap: Record<string, string> = {
        eth: 'ethereum',
        bsc: 'bsc',
        matic: 'matic',
        arbitrum: 'arbitrum',
        base: 'base',
        optimism: 'optimism',
        avalanche: 'avalanche_c',
        fantom: 'fantom',
        cronos: 'cronos'
      };

      let eventFilter = eventName ? ', event: {is: $eventName}' : '';
      let dateFilter =
        since || till
          ? `, date: {${since ? 'since: $since' : ''}${since && till ? ', ' : ''}${till ? 'till: $till' : ''}}`
          : '';

      let varDefs: string[] = [
        '$network: EthereumNetwork!',
        '$limit: Int!',
        '$contractAddress: String!'
      ];
      if (eventName) varDefs.push('$eventName: String');
      if (since) varDefs.push('$since: ISO8601DateTime');
      if (till) varDefs.push('$till: ISO8601DateTime');

      let query = `query GetEvents(${varDefs.join(', ')}) {
  ethereum(network: $network) {
    smartContractEvents(
      options: {limit: $limit, desc: "block.timestamp.iso8601"}
      smartContractAddress: {is: $contractAddress}
      ${eventFilter}
      ${dateFilter}
    ) {
      block { timestamp { iso8601 } height }
      transaction { hash }
      smartContractEvent { name signatureHash }
      arguments { argument value }
    }
  }
}`;

      let variables: Record<string, any> = {
        network: networkMap[blockchain] || blockchain,
        limit,
        contractAddress
      };
      if (eventName) variables.eventName = eventName;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let raw = data?.ethereum?.smartContractEvents || [];

      let events = raw.map((e: any) => ({
        blockTime: e.block?.timestamp?.iso8601 || '',
        blockNumber: e.block?.height,
        transactionHash: e.transaction?.hash || '',
        contractAddress,
        eventName: e.smartContractEvent?.name,
        eventSignature: e.smartContractEvent?.signatureHash,
        arguments: (e.arguments || []).map((a: any) => ({
          name: a.argument,
          value: a.value
        }))
      }));

      return {
        output: { events, eventCount: events.length },
        message: `Retrieved **${events.length}** smart contract event(s) for \`${contractAddress}\` on **${blockchain}**.`
      };
    }

    // V2 query
    let sigFilter = eventName ? 'Signature: {Name: {is: $eventName}}' : '';
    let logFilters = [`SmartContract: {is: $contractAddress}`, sigFilter]
      .filter(Boolean)
      .join(', ');
    let timeFilter =
      since || till
        ? `Block: {Time: {${since ? 'since: $since' : ''}${since && till ? ', ' : ''}${till ? 'till: $till' : ''}}}`
        : '';
    let allWhereFilters = [`Log: {${logFilters}}`, timeFilter].filter(Boolean).join(', ');

    let varDefs: string[] = [
      '$network: evm_network!',
      '$limit: Int!',
      '$contractAddress: String!'
    ];
    if (eventName) varDefs.push('$eventName: String');
    if (since) varDefs.push('$since: DateTime');
    if (till) varDefs.push('$till: DateTime');

    let query = `query GetEvents(${varDefs.join(', ')}) {
  EVM(network: $network, dataset: combined) {
    Events(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {${allWhereFilters}}
    ) {
      Block { Time Number }
      Transaction { Hash From To }
      Log {
        SmartContract
        Signature { Name Signature }
      }
      Arguments {
        Name
        Type
        Value {
          ... on EVM_ABI_Integer_Value_Arg { integer }
          ... on EVM_ABI_String_Value_Arg { string }
          ... on EVM_ABI_Address_Value_Arg { address }
          ... on EVM_ABI_BigInt_Value_Arg { bigInteger }
          ... on EVM_ABI_Boolean_Value_Arg { bool }
        }
      }
    }
  }
}`;

    let variables: Record<string, any> = { network: blockchain, limit, contractAddress };
    if (eventName) variables.eventName = eventName;
    if (since) variables.since = since;
    if (till) variables.till = till;

    let data = await client.query(query, variables);
    let raw = data?.EVM?.Events || [];

    let events = raw.map((e: any) => ({
      blockTime: e.Block?.Time || '',
      blockNumber: e.Block?.Number,
      transactionHash: e.Transaction?.Hash || '',
      transactionFrom: e.Transaction?.From,
      transactionTo: e.Transaction?.To,
      contractAddress: e.Log?.SmartContract,
      eventName: e.Log?.Signature?.Name,
      eventSignature: e.Log?.Signature?.Signature,
      arguments: (e.Arguments || []).map((a: any) => ({
        name: a.Name,
        type: a.Type,
        value:
          a.Value?.integer ??
          a.Value?.string ??
          a.Value?.address ??
          a.Value?.bigInteger ??
          a.Value?.bool
      }))
    }));

    return {
      output: { events, eventCount: events.length },
      message: `Retrieved **${events.length}** smart contract event(s) for \`${contractAddress}\` on **${blockchain}**.`
    };
  })
  .build();
