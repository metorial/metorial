import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let quantity = z.string().regex(/^0x[0-9a-f]+$/i);
export let hexData = z.string().regex(/^0x(?:[0-9a-f]{2})*$/i);
let optionalString = z.string().nullish();
let optionalNumber = z.number().nullish();

export let parseResponse = <T>(schema: z.ZodType<T>, value: unknown, operation: string): T => {
  let result = schema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError(`Alchemy returned malformed data for ${operation}.`, {
      reason: 'invalid_provider_response'
    });
  }
  return result.data;
};

export let tokenMetadataSchema = z
  .object({
    name: optionalString,
    symbol: optionalString,
    decimals: z.number().int().min(0).nullish(),
    logo: optionalString
  })
  .passthrough();

export let tokenBalancesSchema = z
  .object({
    tokenBalances: z.array(
      z
        .object({
          contractAddress: z.string(),
          tokenBalance: z.string().nullable(),
          error: optionalString
        })
        .passthrough()
    ),
    pageKey: optionalString
  })
  .passthrough();

let marketplaceSchema = z
  .object({ floorPrice: optionalNumber, collectionName: optionalString })
  .passthrough();
export let nftSchema = z
  .object({
    contract: z
      .object({
        address: z.string(),
        name: optionalString,
        isSpam: z.union([z.boolean(), z.string()]).nullish(),
        openSeaMetadata: marketplaceSchema.nullish(),
        openseaMetadata: marketplaceSchema.nullish()
      })
      .passthrough(),
    tokenId: z.string(),
    tokenType: optionalString,
    name: optionalString,
    description: optionalString,
    image: z
      .object({ cachedUrl: optionalString, originalUrl: optionalString })
      .passthrough()
      .nullish(),
    collection: z
      .object({ name: optionalString, floorPrice: optionalNumber })
      .passthrough()
      .nullish(),
    raw: z
      .object({
        metadata: z
          .object({
            name: optionalString,
            description: optionalString,
            attributes: z
              .array(
                z
                  .object({ trait_type: optionalString, value: z.unknown().optional() })
                  .passthrough()
              )
              .nullish()
          })
          .passthrough()
          .nullish()
      })
      .passthrough()
      .nullish()
  })
  .passthrough();
export let ownedNftsSchema = z
  .object({
    ownedNfts: z.array(nftSchema),
    totalCount: z.number().int().nonnegative(),
    pageKey: optionalString
  })
  .passthrough();

export let ownersSchema = z
  .object({
    owners: z.array(
      z.union([
        z.string(),
        z
          .object({
            ownerAddress: z.string(),
            tokenBalances: z
              .array(
                z
                  .object({ tokenId: z.string(), balance: z.number().int().nonnegative() })
                  .passthrough()
              )
              .optional()
          })
          .passthrough()
      ])
    ),
    pageKey: optionalString
  })
  .passthrough();

export let transfersSchema = z
  .object({
    transfers: z.array(
      z
        .object({
          from: z.string(),
          to: z.string().nullable(),
          value: z.number().nullable(),
          asset: z.string().nullable(),
          category: z.string(),
          blockNum: quantity,
          hash: z.string(),
          tokenId: optionalString,
          rawContract: z
            .object({
              address: optionalString,
              value: optionalString,
              decimal: optionalString
            })
            .passthrough()
            .optional(),
          metadata: z
            .object({ blockTimestamp: z.string().optional() })
            .passthrough()
            .optional()
        })
        .passthrough()
    ),
    pageKey: optionalString
  })
  .passthrough();

export let pricesSchema = z
  .object({
    data: z.array(
      z
        .object({
          network: z.string(),
          address: z.string(),
          prices: z
            .array(
              z
                .object({ currency: z.string(), value: z.string(), lastUpdatedAt: z.string() })
                .passthrough()
            )
            .optional(),
          error: optionalString
        })
        .passthrough()
    )
  })
  .passthrough();

export let transactionSchema = z
  .object({
    hash: z.string(),
    from: z.string(),
    to: z.string().nullable(),
    value: quantity,
    gas: quantity,
    gasPrice: quantity.optional(),
    nonce: quantity,
    blockNumber: quantity.nullable(),
    blockHash: z.string().nullable(),
    input: hexData
  })
  .passthrough()
  .nullable();
export let receiptSchema = z
  .object({
    status: quantity.optional(),
    gasUsed: quantity,
    effectiveGasPrice: quantity.optional(),
    contractAddress: z.string().nullable(),
    logs: z.array(z.unknown())
  })
  .passthrough()
  .nullable();
export let blockSchema = z
  .object({
    number: quantity.nullable(),
    hash: z.string().nullable(),
    timestamp: quantity,
    miner: optionalString,
    gasUsed: quantity,
    gasLimit: quantity,
    baseFeePerGas: quantity.optional(),
    parentHash: z.string(),
    transactions: z.array(z.unknown())
  })
  .passthrough()
  .nullable();
export let logsSchema = z.array(
  z
    .object({
      address: z.string(),
      topics: z.array(z.string()),
      data: hexData,
      blockNumber: quantity,
      transactionHash: z.string(),
      logIndex: quantity,
      blockHash: z.string(),
      removed: z.boolean().optional()
    })
    .passthrough()
);

export let mapNft = (nft: z.infer<typeof nftSchema>) => ({
  contractAddress: nft.contract.address,
  tokenId: nft.tokenId,
  tokenType: nft.tokenType ?? undefined,
  name: nft.name ?? nft.raw?.metadata?.name ?? undefined,
  description: nft.description ?? nft.raw?.metadata?.description ?? undefined,
  imageUrl: nft.image?.cachedUrl ?? nft.image?.originalUrl ?? undefined,
  collectionName:
    nft.collection?.name ??
    nft.contract.openSeaMetadata?.collectionName ??
    nft.contract.openseaMetadata?.collectionName ??
    nft.contract.name ??
    undefined,
  floorPrice:
    nft.collection?.floorPrice ??
    nft.contract.openSeaMetadata?.floorPrice ??
    nft.contract.openseaMetadata?.floorPrice ??
    undefined,
  isSpam: typeof nft.contract.isSpam === 'boolean' ? nft.contract.isSpam : undefined,
  attributes: nft.raw?.metadata?.attributes?.map(a => ({
    traitType: a.trait_type ?? undefined,
    value: a.value
  }))
});
