// V2 GraphQL query templates for Bitquery Streaming API

export let dexTradesV2Query = `
query GetDEXTrades($network: evm_network!, $limit: Int!, $offset: Int!, $since: DateTime, $till: DateTime, $baseCurrency: String, $quoteCurrency: String, $exchange: String) {
  EVM(network: $network, dataset: combined) {
    DEXTradeByTokens(
      limit: {count: $limit, offset: $offset}
      orderBy: {descending: Block_Time}
      where: {
        Trade: {
          Currency: {SmartContract: {is: $baseCurrency}}
          Side: {Currency: {SmartContract: {is: $quoteCurrency}}}
          Dex: {ProtocolName: {is: $exchange}}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time
        Number
      }
      Transaction {
        Hash
      }
      Trade {
        Amount
        AmountInUSD
        Price
        PriceInUSD
        Currency {
          Symbol
          Name
          SmartContract
          Decimals
        }
        Dex {
          ProtocolName
          ProtocolFamily
          SmartContract
        }
        Side {
          Type
          Amount
          AmountInUSD
          Currency {
            Symbol
            Name
            SmartContract
          }
        }
        Buyer
        Seller
      }
    }
  }
}`;

export let dexTradesV2QueryMinimal = `
query GetDEXTrades($network: evm_network!, $limit: Int!, $since: DateTime, $till: DateTime, $baseCurrency: String, $quoteCurrency: String) {
  EVM(network: $network, dataset: combined) {
    DEXTradeByTokens(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {
        Trade: {
          Currency: {SmartContract: {is: $baseCurrency}}
          Side: {Currency: {SmartContract: {is: $quoteCurrency}}}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time
        Number
      }
      Transaction {
        Hash
      }
      Trade {
        Amount
        AmountInUSD
        Price
        PriceInUSD
        Currency {
          Symbol
          Name
          SmartContract
        }
        Dex {
          ProtocolName
          ProtocolFamily
        }
        Side {
          Type
          Amount
          AmountInUSD
          Currency {
            Symbol
            Name
            SmartContract
          }
        }
      }
    }
  }
}`;

export let tokenTransfersV2Query = `
query GetTokenTransfers($network: evm_network!, $limit: Int!, $since: DateTime, $till: DateTime, $tokenAddress: String, $senderAddress: String, $receiverAddress: String) {
  EVM(network: $network, dataset: combined) {
    Transfers(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {
        Transfer: {
          Currency: {SmartContract: {is: $tokenAddress}}
          Sender: {is: $senderAddress}
          Receiver: {is: $receiverAddress}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time
        Number
      }
      Transaction {
        Hash
        From
        To
      }
      Transfer {
        Amount
        AmountInUSD
        Currency {
          Symbol
          Name
          SmartContract
          Decimals
          Fungible
        }
        Sender
        Receiver
        Type
      }
    }
  }
}`;

export let tokenBalanceV2Query = `
query GetTokenBalance($network: evm_network!, $address: String!, $limit: Int!) {
  EVM(network: $network, dataset: combined) {
    BalanceUpdates(
      limit: {count: $limit}
      orderBy: {descendingByField: "balance"}
      where: {
        BalanceUpdate: {
          Address: {is: $address}
        }
      }
    ) {
      Currency {
        Symbol
        Name
        SmartContract
        Decimals
        Fungible
      }
      balance: sum(of: BalanceUpdate_Amount, selectWhere: {gt: "0"})
      BalanceUpdate {
        Address
      }
    }
  }
}`;

export let smartContractEventsV2Query = `
query GetSmartContractEvents($network: evm_network!, $limit: Int!, $contractAddress: String!, $eventSignature: String, $since: DateTime, $till: DateTime) {
  EVM(network: $network, dataset: combined) {
    Events(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {
        Log: {
          SmartContract: {is: $contractAddress}
          Signature: {Name: {is: $eventSignature}}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time
        Number
      }
      Transaction {
        Hash
        From
        To
      }
      Log {
        SmartContract
        Signature {
          Name
          Signature
        }
      }
      Arguments {
        Name
        Type
        Value {
          ... on EVM_ABI_Integer_Value_Arg {
            integer
          }
          ... on EVM_ABI_String_Value_Arg {
            string
          }
          ... on EVM_ABI_Address_Value_Arg {
            address
          }
          ... on EVM_ABI_BigInt_Value_Arg {
            bigInteger
          }
          ... on EVM_ABI_Boolean_Value_Arg {
            bool
          }
        }
      }
    }
  }
}`;

export let smartContractCallsV2Query = `
query GetSmartContractCalls($network: evm_network!, $limit: Int!, $contractAddress: String!, $methodSignature: String, $since: DateTime, $till: DateTime) {
  EVM(network: $network, dataset: combined) {
    Calls(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {
        Call: {
          To: {is: $contractAddress}
          Signature: {Name: {is: $methodSignature}}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time
        Number
      }
      Transaction {
        Hash
        From
        To
      }
      Call {
        From
        To
        Value
        Signature {
          Name
          Signature
        }
        Success
      }
      Arguments {
        Name
        Type
        Value {
          ... on EVM_ABI_Integer_Value_Arg {
            integer
          }
          ... on EVM_ABI_String_Value_Arg {
            string
          }
          ... on EVM_ABI_Address_Value_Arg {
            address
          }
          ... on EVM_ABI_BigInt_Value_Arg {
            bigInteger
          }
          ... on EVM_ABI_Boolean_Value_Arg {
            bool
          }
        }
      }
    }
  }
}`;

export let ohlcV2Query = `
query GetOHLC($network: evm_network!, $baseCurrency: String!, $quoteCurrency: String!, $since: DateTime!, $till: DateTime!, $interval: Int!) {
  EVM(network: $network, dataset: combined) {
    DEXTradeByTokens(
      orderBy: {ascendingByField: "Block_Time"}
      where: {
        Trade: {
          Currency: {SmartContract: {is: $baseCurrency}}
          Side: {Currency: {SmartContract: {is: $quoteCurrency}}}
          Amount: {gt: "0"}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time(interval: {count: $interval, in: minutes})
      }
      open: Trade_Price: Trade_Price(minimum: Block_Number)
      high: Trade_Price: Trade_Price(maximum: Trade_Price)
      low: Trade_Price: Trade_Price(minimum: Trade_Price)
      close: Trade_Price: Trade_Price(maximum: Block_Number)
      volume: sum(of: Trade_Side_AmountInUSD)
      tradeCount: count
    }
  }
}`;

export let transactionsV2Query = `
query GetTransactions($network: evm_network!, $limit: Int!, $address: String, $since: DateTime, $till: DateTime) {
  EVM(network: $network, dataset: combined) {
    Transactions(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {
        Transaction: {
          From: {is: $address}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time
        Number
      }
      Transaction {
        Hash
        From
        To
        Value
        Gas
        GasPrice
        Type
      }
    }
  }
}`;

// V1 GraphQL query templates

export let dexTradesV1Query = `
query GetDEXTrades($network: EthereumNetwork!, $limit: Int!, $offset: Int!, $since: ISO8601DateTime, $till: ISO8601DateTime, $baseCurrency: String, $quoteCurrency: String, $exchange: String) {
  ethereum(network: $network) {
    dexTrades(
      options: {limit: $limit, offset: $offset, desc: "block.timestamp.iso8601"}
      date: {since: $since, till: $till}
      baseCurrency: {is: $baseCurrency}
      quoteCurrency: {is: $quoteCurrency}
      exchangeName: {is: $exchange}
    ) {
      block {
        timestamp {
          iso8601
        }
        height
      }
      transaction {
        hash
      }
      tradeAmount(in: USD)
      baseAmount
      quoteAmount
      baseCurrency {
        symbol
        name
        address
      }
      quoteCurrency {
        symbol
        name
        address
      }
      quotePrice
      exchange {
        fullName
      }
      side
    }
  }
}`;

export let tokenTransfersV1Query = `
query GetTokenTransfers($network: EthereumNetwork!, $limit: Int!, $offset: Int!, $since: ISO8601DateTime, $till: ISO8601DateTime, $currency: String, $sender: String, $receiver: String) {
  ethereum(network: $network) {
    transfers(
      options: {limit: $limit, offset: $offset, desc: "block.timestamp.iso8601"}
      date: {since: $since, till: $till}
      currency: {is: $currency}
      sender: {is: $sender}
      receiver: {is: $receiver}
    ) {
      block {
        timestamp {
          iso8601
        }
        height
      }
      transaction {
        hash
      }
      amount
      currency {
        symbol
        name
        address
        decimals
      }
      sender {
        address
      }
      receiver {
        address
      }
    }
  }
}`;

export let tokenBalanceV1Query = `
query GetTokenBalance($network: EthereumNetwork!, $address: String!) {
  ethereum(network: $network) {
    address(address: {is: $address}) {
      balances {
        currency {
          symbol
          name
          address
          decimals
        }
        value
      }
    }
  }
}`;

// Solana V2 queries

export let solanaDexTradesV2Query = `
query GetSolanaDEXTrades($limit: Int!, $since: DateTime, $till: DateTime, $baseCurrency: String, $quoteCurrency: String) {
  Solana(dataset: combined) {
    DEXTradeByTokens(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {
        Trade: {
          Currency: {MintAddress: {is: $baseCurrency}}
          Side: {Currency: {MintAddress: {is: $quoteCurrency}}}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time
        Slot
      }
      Transaction {
        Signature
      }
      Trade {
        Amount
        AmountInUSD
        Price
        PriceInUSD
        Currency {
          Symbol
          Name
          MintAddress
        }
        Dex {
          ProtocolName
          ProtocolFamily
          ProgramAddress
        }
        Side {
          Type
          Amount
          AmountInUSD
          Currency {
            Symbol
            Name
            MintAddress
          }
        }
        Market {
          MarketAddress
        }
      }
    }
  }
}`;

export let solanaTokenTransfersV2Query = `
query GetSolanaTokenTransfers($limit: Int!, $since: DateTime, $till: DateTime, $tokenAddress: String, $senderAddress: String, $receiverAddress: String) {
  Solana(dataset: combined) {
    Transfers(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {
        Transfer: {
          Currency: {MintAddress: {is: $tokenAddress}}
          Sender: {is: $senderAddress}
          Receiver: {is: $receiverAddress}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time
        Slot
      }
      Transaction {
        Signature
      }
      Transfer {
        Amount
        AmountInUSD
        Currency {
          Symbol
          Name
          MintAddress
        }
        Sender
        Receiver
      }
    }
  }
}`;

export let solanaBalanceV2Query = `
query GetSolanaBalance($address: String!, $limit: Int!) {
  Solana(dataset: combined) {
    BalanceUpdates(
      limit: {count: $limit}
      orderBy: {descendingByField: "balance"}
      where: {
        BalanceUpdate: {
          Account: {Address: {is: $address}}
        }
      }
    ) {
      Currency {
        Symbol
        Name
        MintAddress
      }
      balance: sum(of: BalanceUpdate_Amount, selectWhere: {gt: "0"})
      BalanceUpdate {
        Account {
          Address
        }
      }
    }
  }
}`;
