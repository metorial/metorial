import { SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

let transactionOutputSchema = z.object({
  blockTime: z.string().describe('Block timestamp'),
  blockNumber: z.number().optional().describe('Block number or slot'),
  transactionHash: z.string().describe('Transaction hash or signature'),
  from: z.string().optional().describe('Transaction sender address'),
  to: z.string().optional().describe('Transaction recipient address'),
  value: z.string().optional().describe('Transaction value in native currency'),
  gas: z.string().optional().describe('Gas used'),
  gasPrice: z.string().optional().describe('Gas price'),
  success: z.boolean().optional().describe('Whether the transaction succeeded')
});

export let getTransactions = SlateTool.create(spec, {
  name: 'Get Transactions',
  key: 'get_transactions',
  description: `Retrieve blockchain transactions from EVM chains or Solana. Filter by sender address, receiver address, or time range.
Use this to audit wallet activity, monitor address transactions, or investigate specific blockchain activity.`,
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
      fromAddress: z.string().optional().describe('Filter by sender address'),
      toAddress: z.string().optional().describe('Filter by recipient address'),
      since: z.string().optional().describe('Start datetime filter (ISO 8601 format)'),
      till: z.string().optional().describe('End datetime filter (ISO 8601 format)'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .default(25)
        .describe('Maximum number of transactions to return')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionOutputSchema).describe('List of transactions'),
      transactionCount: z.number().describe('Number of transactions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BitqueryClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
    });

    let { blockchain, fromAddress, toAddress, since, till, limit } = ctx.input;
    ctx.info(`Fetching transactions on ${blockchain}`);

    let transactions: z.infer<typeof transactionOutputSchema>[] = [];

    if (blockchain === 'solana') {
      let txFilters: string[] = [];
      if (fromAddress) txFilters.push('Signer: {is: $fromAddress}');

      let timeFilter =
        since || till
          ? `Block: {Time: {${since ? 'since: $since' : ''}${since && till ? ', ' : ''}${till ? 'till: $till' : ''}}}`
          : '';
      let txFilter = txFilters.length > 0 ? `Transaction: {${txFilters.join(', ')}}` : '';
      let allFilters = [txFilter, timeFilter].filter(Boolean).join(', ');
      let whereClause = allFilters ? `where: {${allFilters}}` : '';

      let varDefs: string[] = ['$limit: Int!'];
      if (fromAddress) varDefs.push('$fromAddress: String');
      if (since) varDefs.push('$since: DateTime');
      if (till) varDefs.push('$till: DateTime');

      let query = `query GetSolanaTransactions(${varDefs.join(', ')}) {
  Solana(dataset: combined) {
    Transactions(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      ${whereClause}
    ) {
      Block { Time Slot }
      Transaction {
        Signature
        Signer
        Fee
        Result { Success }
      }
    }
  }
}`;

      let variables: Record<string, any> = { limit };
      if (fromAddress) variables.fromAddress = fromAddress;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let raw = data?.Solana?.Transactions || [];

      transactions = raw.map((t: any) => ({
        blockTime: t.Block?.Time || '',
        blockNumber: t.Block?.Slot,
        transactionHash: t.Transaction?.Signature || '',
        from: t.Transaction?.Signer,
        value: t.Transaction?.Fee?.toString(),
        success: t.Transaction?.Result?.Success
      }));
    } else if (ctx.config.apiVersion === 'v1') {
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

      let filters: string[] = ['options: {limit: $limit, desc: "block.timestamp.iso8601"}'];
      if (since || till)
        filters.push(
          `date: {${since ? 'since: $since' : ''}${since && till ? ', ' : ''}${till ? 'till: $till' : ''}}`
        );
      if (fromAddress) filters.push('txSender: {is: $fromAddress}');
      if (toAddress) filters.push('txTo: {is: $toAddress}');

      let varDefs: string[] = ['$network: EthereumNetwork!', '$limit: Int!'];
      if (fromAddress) varDefs.push('$fromAddress: String');
      if (toAddress) varDefs.push('$toAddress: String');
      if (since) varDefs.push('$since: ISO8601DateTime');
      if (till) varDefs.push('$till: ISO8601DateTime');

      let query = `query GetTransactions(${varDefs.join(', ')}) {
  ethereum(network: $network) {
    transactions(${filters.join(', ')}) {
      block { timestamp { iso8601 } height }
      hash
      txFrom { address }
      txTo { address }
      value
      gas
      gasPrice
      success
    }
  }
}`;

      let variables: Record<string, any> = {
        network: networkMap[blockchain] || blockchain,
        limit
      };
      if (fromAddress) variables.fromAddress = fromAddress;
      if (toAddress) variables.toAddress = toAddress;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let raw = data?.ethereum?.transactions || [];

      transactions = raw.map((t: any) => ({
        blockTime: t.block?.timestamp?.iso8601 || '',
        blockNumber: t.block?.height,
        transactionHash: t.hash || '',
        from: t.txFrom?.address,
        to: t.txTo?.address,
        value: t.value?.toString(),
        gas: t.gas?.toString(),
        gasPrice: t.gasPrice?.toString(),
        success: t.success
      }));
    } else {
      // V2 EVM
      let txFilters: string[] = [];
      if (fromAddress) txFilters.push('From: {is: $fromAddress}');
      if (toAddress) txFilters.push('To: {is: $toAddress}');

      let txFilter = txFilters.length > 0 ? `Transaction: {${txFilters.join(', ')}}` : '';
      let timeFilter =
        since || till
          ? `Block: {Time: {${since ? 'since: $since' : ''}${since && till ? ', ' : ''}${till ? 'till: $till' : ''}}}`
          : '';
      let allFilters = [txFilter, timeFilter].filter(Boolean).join(', ');
      let whereClause = allFilters ? `where: {${allFilters}}` : '';

      let varDefs: string[] = ['$network: evm_network!', '$limit: Int!'];
      if (fromAddress) varDefs.push('$fromAddress: String');
      if (toAddress) varDefs.push('$toAddress: String');
      if (since) varDefs.push('$since: DateTime');
      if (till) varDefs.push('$till: DateTime');

      let query = `query GetTransactions(${varDefs.join(', ')}) {
  EVM(network: $network, dataset: combined) {
    Transactions(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      ${whereClause}
    ) {
      Block { Time Number }
      Transaction {
        Hash From To Value Gas GasPrice Type
      }
    }
  }
}`;

      let variables: Record<string, any> = { network: blockchain, limit };
      if (fromAddress) variables.fromAddress = fromAddress;
      if (toAddress) variables.toAddress = toAddress;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let raw = data?.EVM?.Transactions || [];

      transactions = raw.map((t: any) => ({
        blockTime: t.Block?.Time || '',
        blockNumber: t.Block?.Number,
        transactionHash: t.Transaction?.Hash || '',
        from: t.Transaction?.From,
        to: t.Transaction?.To,
        value: t.Transaction?.Value?.toString(),
        gas: t.Transaction?.Gas?.toString(),
        gasPrice: t.Transaction?.GasPrice?.toString()
      }));
    }

    return {
      output: {
        transactions,
        transactionCount: transactions.length
      },
      message: `Retrieved **${transactions.length}** transaction(s) on **${blockchain}**.`
    };
  })
  .build();
