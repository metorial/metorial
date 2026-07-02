import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

let transferInputSchema = z.object({
  blockTime: z.string(),
  blockNumber: z.number().optional(),
  transactionHash: z.string(),
  amount: z.number().optional(),
  amountInUsd: z.number().optional(),
  tokenSymbol: z.string().optional(),
  tokenName: z.string().optional(),
  tokenAddress: z.string().optional(),
  tokenDecimals: z.number().optional(),
  sender: z.string().optional(),
  receiver: z.string().optional(),
  transferType: z.string().optional()
});

export let newTokenTransfers = SlateTrigger.create(spec, {
  name: 'New Token Transfers',
  key: 'new_token_transfers',
  description:
    'Triggers when new token transfers are detected on a specified blockchain. Polls for recent transfers filtered by token, sender, or receiver. Supports EVM chains and Solana.'
})
  .input(transferInputSchema)
  .output(
    z.object({
      blockTime: z.string().describe('Block timestamp'),
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
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BitqueryClient({
        token: ctx.auth.token,
        apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
      });

      let settings = ctx.state?.settings || {};
      let blockchain = settings.blockchain || 'eth';
      let tokenAddress = settings.tokenAddress;
      let senderAddress = settings.senderAddress;
      let receiverAddress = settings.receiverAddress;

      let lastPollTime =
        ctx.state?.lastPollTime || new Date(Date.now() - 5 * 60 * 1000).toISOString();
      let now = new Date().toISOString();

      let transfers: z.infer<typeof transferInputSchema>[] = [];

      try {
        if (blockchain === 'solana') {
          let query = buildSolanaTransfersPollQuery(
            tokenAddress,
            senderAddress,
            receiverAddress
          );
          let variables: Record<string, any> = { limit: 100, since: lastPollTime };
          if (tokenAddress) variables.tokenAddress = tokenAddress;
          if (senderAddress) variables.senderAddress = senderAddress;
          if (receiverAddress) variables.receiverAddress = receiverAddress;

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
          let query = buildV1TransfersPollQuery(tokenAddress, senderAddress, receiverAddress);
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

          let variables: Record<string, any> = {
            network: networkMap[blockchain] || blockchain,
            limit: 100,
            offset: 0,
            since: lastPollTime
          };
          if (tokenAddress) variables.currency = tokenAddress;
          if (senderAddress) variables.sender = senderAddress;
          if (receiverAddress) variables.receiver = receiverAddress;

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
          let query = buildV2EvmTransfersPollQuery(
            tokenAddress,
            senderAddress,
            receiverAddress
          );
          let variables: Record<string, any> = {
            network: blockchain,
            limit: 100,
            since: lastPollTime
          };
          if (tokenAddress) variables.tokenAddress = tokenAddress;
          if (senderAddress) variables.senderAddress = senderAddress;
          if (receiverAddress) variables.receiverAddress = receiverAddress;

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
      } catch (_error) {
        // Return empty on error, will retry next poll
      }

      return {
        inputs: transfers,
        updatedState: {
          lastPollTime: now,
          settings
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'token_transfer.created',
        id: ctx.input.transactionHash || `${ctx.input.blockTime}-${ctx.input.blockNumber}`,
        output: {
          blockTime: ctx.input.blockTime,
          blockNumber: ctx.input.blockNumber,
          transactionHash: ctx.input.transactionHash,
          amount: ctx.input.amount,
          amountInUsd: ctx.input.amountInUsd,
          tokenSymbol: ctx.input.tokenSymbol,
          tokenName: ctx.input.tokenName,
          tokenAddress: ctx.input.tokenAddress,
          tokenDecimals: ctx.input.tokenDecimals,
          sender: ctx.input.sender,
          receiver: ctx.input.receiver,
          transferType: ctx.input.transferType
        }
      };
    }
  })
  .build();

let buildSolanaTransfersPollQuery = (
  token?: string,
  sender?: string,
  receiver?: string
): string => {
  let transferFilters: string[] = [];
  if (token) transferFilters.push('Currency: {MintAddress: {is: $tokenAddress}}');
  if (sender) transferFilters.push('Sender: {is: $senderAddress}');
  if (receiver) transferFilters.push('Receiver: {is: $receiverAddress}');

  let transferFilter =
    transferFilters.length > 0 ? `Transfer: {${transferFilters.join(', ')}}` : '';
  let timeFilter = 'Block: {Time: {since: $since}}';
  let allFilters = [transferFilter, timeFilter].filter(Boolean).join(', ');

  let varDefs: string[] = ['$limit: Int!', '$since: DateTime'];
  if (token) varDefs.push('$tokenAddress: String');
  if (sender) varDefs.push('$senderAddress: String');
  if (receiver) varDefs.push('$receiverAddress: String');

  return `query PollSolanaTransfers(${varDefs.join(', ')}) {
  Solana(dataset: combined) {
    Transfers(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {${allFilters}}
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

let buildV1TransfersPollQuery = (
  token?: string,
  sender?: string,
  receiver?: string
): string => {
  let filters: string[] = [
    'options: {limit: $limit, offset: $offset, desc: "block.timestamp.iso8601"}',
    'date: {since: $since}'
  ];
  if (token) filters.push('currency: {is: $currency}');
  if (sender) filters.push('sender: {is: $sender}');
  if (receiver) filters.push('receiver: {is: $receiver}');

  let varDefs: string[] = [
    '$network: EthereumNetwork!',
    '$limit: Int!',
    '$offset: Int!',
    '$since: ISO8601DateTime'
  ];
  if (token) varDefs.push('$currency: String');
  if (sender) varDefs.push('$sender: String');
  if (receiver) varDefs.push('$receiver: String');

  return `query PollTransfers(${varDefs.join(', ')}) {
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

let buildV2EvmTransfersPollQuery = (
  token?: string,
  sender?: string,
  receiver?: string
): string => {
  let transferFilters: string[] = [];
  if (token) transferFilters.push('Currency: {SmartContract: {is: $tokenAddress}}');
  if (sender) transferFilters.push('Sender: {is: $senderAddress}');
  if (receiver) transferFilters.push('Receiver: {is: $receiverAddress}');

  let transferFilter =
    transferFilters.length > 0 ? `Transfer: {${transferFilters.join(', ')}}` : '';
  let timeFilter = 'Block: {Time: {since: $since}}';
  let allFilters = [transferFilter, timeFilter].filter(Boolean).join(', ');

  let varDefs: string[] = ['$network: evm_network!', '$limit: Int!', '$since: DateTime'];
  if (token) varDefs.push('$tokenAddress: String');
  if (sender) varDefs.push('$senderAddress: String');
  if (receiver) varDefs.push('$receiverAddress: String');

  return `query PollTransfers(${varDefs.join(', ')}) {
  EVM(network: $network, dataset: combined) {
    Transfers(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {${allFilters}}
    ) {
      Block { Time Number }
      Transaction { Hash From To }
      Transfer {
        Amount AmountInUSD
        Currency { Symbol Name SmartContract Decimals }
        Sender Receiver Type
      }
    }
  }
}`;
};
