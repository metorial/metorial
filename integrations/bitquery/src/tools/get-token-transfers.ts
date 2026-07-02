import { SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

let transferOutputSchema = z.object({
  blockTime: z.string().describe('Timestamp of the block'),
  blockNumber: z.number().optional().describe('Block number or slot'),
  transactionHash: z.string().describe('Transaction hash or signature'),
  amount: z.number().optional().describe('Transfer amount'),
  amountInUsd: z.number().optional().describe('Transfer amount in USD'),
  tokenSymbol: z.string().optional().describe('Token symbol'),
  tokenName: z.string().optional().describe('Token name'),
  tokenAddress: z.string().optional().describe('Token contract/mint address'),
  tokenDecimals: z.number().optional().describe('Token decimals'),
  sender: z.string().optional().describe('Sender address'),
  receiver: z.string().optional().describe('Receiver address'),
  transferType: z.string().optional().describe('Transfer type')
});

export let getTokenTransfers = SlateTool.create(spec, {
  name: 'Get Token Transfers',
  key: 'get_token_transfers',
  description: `Retrieve token transfer data from EVM blockchains or Solana. Track ERC-20, ERC-721, ERC-1155, and SPL token movements with filters for token, sender, receiver, and time range.
Use this to monitor wallet activity, track specific token movements, or analyze transfer patterns.`,
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
          'cronos',
          'solana'
        ])
        .describe('Blockchain network to query'),
      tokenAddress: z.string().optional().describe('Token contract/mint address to filter'),
      senderAddress: z.string().optional().describe('Sender address to filter'),
      receiverAddress: z.string().optional().describe('Receiver address to filter'),
      since: z.string().optional().describe('Start datetime filter (ISO 8601 format)'),
      till: z.string().optional().describe('End datetime filter (ISO 8601 format)'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .default(25)
        .describe('Maximum number of transfers to return')
    })
  )
  .output(
    z.object({
      transfers: z.array(transferOutputSchema).describe('List of token transfers'),
      transferCount: z.number().describe('Number of transfers returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BitqueryClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
    });

    let { blockchain, tokenAddress, senderAddress, receiverAddress, since, till, limit } =
      ctx.input;

    ctx.info(`Fetching token transfers on ${blockchain}`);

    let transfers: z.infer<typeof transferOutputSchema>[] = [];

    if (blockchain === 'solana') {
      let query = buildSolanaTransfersQuery(
        tokenAddress,
        senderAddress,
        receiverAddress,
        since,
        till
      );
      let variables: Record<string, any> = { limit };
      if (tokenAddress) variables.tokenAddress = tokenAddress;
      if (senderAddress) variables.senderAddress = senderAddress;
      if (receiverAddress) variables.receiverAddress = receiverAddress;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let raw = data?.Solana?.Transfers || [];

      transfers = raw.map((t: any) => ({
        blockTime: t.Block?.Time || '',
        blockNumber: t.Block?.Slot,
        transactionHash: t.Transaction?.Signature || '',
        amount: t.Transfer?.Amount,
        amountInUsd: t.Transfer?.AmountInUSD,
        tokenSymbol: t.Transfer?.Currency?.Symbol,
        tokenName: t.Transfer?.Currency?.Name,
        tokenAddress: t.Transfer?.Currency?.MintAddress,
        sender: t.Transfer?.Sender,
        receiver: t.Transfer?.Receiver
      }));
    } else if (ctx.config.apiVersion === 'v1') {
      let query = buildV1TransfersQuery(
        tokenAddress,
        senderAddress,
        receiverAddress,
        since,
        till
      );
      let variables: Record<string, any> = {
        network: mapToV1Network(blockchain),
        limit,
        offset: 0
      };
      if (tokenAddress) variables.currency = tokenAddress;
      if (senderAddress) variables.sender = senderAddress;
      if (receiverAddress) variables.receiver = receiverAddress;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let raw = data?.ethereum?.transfers || [];

      transfers = raw.map((t: any) => ({
        blockTime: t.block?.timestamp?.iso8601 || '',
        blockNumber: t.block?.height,
        transactionHash: t.transaction?.hash || '',
        amount: t.amount,
        tokenSymbol: t.currency?.symbol,
        tokenName: t.currency?.name,
        tokenAddress: t.currency?.address,
        tokenDecimals: t.currency?.decimals,
        sender: t.sender?.address,
        receiver: t.receiver?.address
      }));
    } else {
      let query = buildV2EvmTransfersQuery(
        tokenAddress,
        senderAddress,
        receiverAddress,
        since,
        till
      );
      let variables: Record<string, any> = { network: blockchain, limit };
      if (tokenAddress) variables.tokenAddress = tokenAddress;
      if (senderAddress) variables.senderAddress = senderAddress;
      if (receiverAddress) variables.receiverAddress = receiverAddress;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let raw = data?.EVM?.Transfers || [];

      transfers = raw.map((t: any) => ({
        blockTime: t.Block?.Time || '',
        blockNumber: t.Block?.Number,
        transactionHash: t.Transaction?.Hash || '',
        amount: t.Transfer?.Amount,
        amountInUsd: t.Transfer?.AmountInUSD,
        tokenSymbol: t.Transfer?.Currency?.Symbol,
        tokenName: t.Transfer?.Currency?.Name,
        tokenAddress: t.Transfer?.Currency?.SmartContract,
        tokenDecimals: t.Transfer?.Currency?.Decimals,
        sender: t.Transfer?.Sender,
        receiver: t.Transfer?.Receiver,
        transferType: t.Transfer?.Type
      }));
    }

    return {
      output: {
        transfers,
        transferCount: transfers.length
      },
      message: `Retrieved **${transfers.length}** token transfer(s) on **${blockchain}**.`
    };
  })
  .build();

let mapToV1Network = (chain: string): string => {
  let map: Record<string, string> = {
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
  return map[chain] || chain;
};

let buildV1TransfersQuery = (
  token?: string,
  sender?: string,
  receiver?: string,
  since?: string,
  till?: string
): string => {
  let filters: string[] = [
    'options: {limit: $limit, offset: $offset, desc: "block.timestamp.iso8601"}'
  ];
  if (since || till) filters.push('date: {since: $since, till: $till}');
  if (token) filters.push('currency: {is: $currency}');
  if (sender) filters.push('sender: {is: $sender}');
  if (receiver) filters.push('receiver: {is: $receiver}');

  let varDefs: string[] = ['$network: EthereumNetwork!', '$limit: Int!', '$offset: Int!'];
  if (since) varDefs.push('$since: ISO8601DateTime');
  if (till) varDefs.push('$till: ISO8601DateTime');
  if (token) varDefs.push('$currency: String');
  if (sender) varDefs.push('$sender: String');
  if (receiver) varDefs.push('$receiver: String');

  return `query GetTransfers(${varDefs.join(', ')}) {
  ethereum(network: $network) {
    transfers(${filters.join(', ')}) {
      block { timestamp { iso8601 } height }
      transaction { hash }
      amount
      currency { symbol name address decimals }
      sender { address }
      receiver { address }
    }
  }
}`;
};

let buildV2EvmTransfersQuery = (
  token?: string,
  sender?: string,
  receiver?: string,
  since?: string,
  till?: string
): string => {
  let transferFilters: string[] = [];
  if (token) transferFilters.push('Currency: {SmartContract: {is: $tokenAddress}}');
  if (sender) transferFilters.push('Sender: {is: $senderAddress}');
  if (receiver) transferFilters.push('Receiver: {is: $receiverAddress}');

  let transferFilter =
    transferFilters.length > 0 ? `Transfer: {${transferFilters.join(', ')}}` : '';
  let timeFilter =
    since || till
      ? `Block: {Time: {${since ? 'since: $since' : ''}${since && till ? ', ' : ''}${till ? 'till: $till' : ''}}}`
      : '';

  let allWhereFilters = [transferFilter, timeFilter].filter(Boolean).join(', ');
  let whereClause = allWhereFilters ? `where: {${allWhereFilters}}` : '';

  let varDefs: string[] = ['$network: evm_network!', '$limit: Int!'];
  if (token) varDefs.push('$tokenAddress: String');
  if (sender) varDefs.push('$senderAddress: String');
  if (receiver) varDefs.push('$receiverAddress: String');
  if (since) varDefs.push('$since: DateTime');
  if (till) varDefs.push('$till: DateTime');

  return `query GetTransfers(${varDefs.join(', ')}) {
  EVM(network: $network, dataset: combined) {
    Transfers(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      ${whereClause}
    ) {
      Block { Time Number }
      Transaction { Hash From To }
      Transfer {
        Amount AmountInUSD
        Currency { Symbol Name SmartContract Decimals Fungible }
        Sender Receiver Type
      }
    }
  }
}`;
};

let buildSolanaTransfersQuery = (
  token?: string,
  sender?: string,
  receiver?: string,
  since?: string,
  till?: string
): string => {
  let transferFilters: string[] = [];
  if (token) transferFilters.push('Currency: {MintAddress: {is: $tokenAddress}}');
  if (sender) transferFilters.push('Sender: {is: $senderAddress}');
  if (receiver) transferFilters.push('Receiver: {is: $receiverAddress}');

  let transferFilter =
    transferFilters.length > 0 ? `Transfer: {${transferFilters.join(', ')}}` : '';
  let timeFilter =
    since || till
      ? `Block: {Time: {${since ? 'since: $since' : ''}${since && till ? ', ' : ''}${till ? 'till: $till' : ''}}}`
      : '';

  let allWhereFilters = [transferFilter, timeFilter].filter(Boolean).join(', ');
  let whereClause = allWhereFilters ? `where: {${allWhereFilters}}` : '';

  let varDefs: string[] = ['$limit: Int!'];
  if (token) varDefs.push('$tokenAddress: String');
  if (sender) varDefs.push('$senderAddress: String');
  if (receiver) varDefs.push('$receiverAddress: String');
  if (since) varDefs.push('$since: DateTime');
  if (till) varDefs.push('$till: DateTime');

  return `query GetSolanaTransfers(${varDefs.join(', ')}) {
  Solana(dataset: combined) {
    Transfers(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      ${whereClause}
    ) {
      Block { Time Slot }
      Transaction { Signature }
      Transfer {
        Amount AmountInUSD
        Currency { Symbol Name MintAddress }
        Sender Receiver
      }
    }
  }
}`;
};
