import { createAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  next?: string;
}

export interface EventsParams extends PaginationParams {
  eventType?: string;
  after?: number;
  before?: number;
}

export interface ListingsParams extends PaginationParams {}

export interface OffersParams extends PaginationParams {}

export interface NftsByCollectionParams extends PaginationParams {}

export interface NftsByAccountParams extends PaginationParams {
  collection?: string;
}

export interface CollectionsParams extends PaginationParams {
  chainIdentifier?: string;
  includeHidden?: boolean;
  orderBy?: string;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.opensea.io/api/v2',
      headers: {
        'X-API-KEY': config.token,
        Accept: 'application/json'
      }
    });
  }

  // =====================
  // NFT Endpoints
  // =====================

  async getNft(chain: string, contractAddress: string, identifier: string) {
    let response = await this.axios.get(
      `/chain/${chain}/contract/${contractAddress}/nfts/${identifier}`
    );
    return response.data;
  }

  async getNftsByCollection(collectionSlug: string, params?: NftsByCollectionParams) {
    let response = await this.axios.get(`/collection/${collectionSlug}/nfts`, {
      params: {
        limit: params?.limit,
        next: params?.next
      }
    });
    return response.data;
  }

  async getNftsByContract(chain: string, contractAddress: string, params?: PaginationParams) {
    let response = await this.axios.get(`/chain/${chain}/contract/${contractAddress}/nfts`, {
      params: {
        limit: params?.limit,
        next: params?.next
      }
    });
    return response.data;
  }

  async getNftsByAccount(chain: string, address: string, params?: NftsByAccountParams) {
    let response = await this.axios.get(`/chain/${chain}/account/${address}/nfts`, {
      params: {
        limit: params?.limit,
        next: params?.next,
        collection: params?.collection
      }
    });
    return response.data;
  }

  async refreshNftMetadata(chain: string, contractAddress: string, identifier: string) {
    let response = await this.axios.post(
      `/chain/${chain}/contract/${contractAddress}/nfts/${identifier}/refresh`
    );
    return response.data;
  }

  // =====================
  // Collection Endpoints
  // =====================

  async getCollection(collectionSlug: string) {
    let response = await this.axios.get(`/collections/${collectionSlug}`);
    return response.data;
  }

  async listCollections(params?: CollectionsParams) {
    let response = await this.axios.get('/collections', {
      params: {
        chain_identifier: params?.chainIdentifier,
        include_hidden: params?.includeHidden,
        order_by: params?.orderBy,
        limit: params?.limit,
        next: params?.next
      }
    });
    return response.data;
  }

  async getCollectionStats(collectionSlug: string) {
    let response = await this.axios.get(`/collections/${collectionSlug}/stats`);
    return response.data;
  }

  async getCollectionTraits(collectionSlug: string) {
    let response = await this.axios.get(`/collection/${collectionSlug}/traits`);
    return response.data;
  }

  // =====================
  // Account Endpoints
  // =====================

  async getAccount(addressOrUsername: string) {
    let response = await this.axios.get(`/accounts/${addressOrUsername}`);
    return response.data;
  }

  // =====================
  // Events Endpoints
  // =====================

  async getEventsByCollection(collectionSlug: string, params?: EventsParams) {
    let response = await this.axios.get(`/events/collection/${collectionSlug}`, {
      params: {
        event_type: params?.eventType,
        after: params?.after,
        before: params?.before,
        limit: params?.limit,
        next: params?.next
      }
    });
    return response.data;
  }

  async getEventsByNft(
    chain: string,
    contractAddress: string,
    identifier: string,
    params?: EventsParams
  ) {
    let response = await this.axios.get(
      `/events/chain/${chain}/contract/${contractAddress}/nfts/${identifier}`,
      {
        params: {
          event_type: params?.eventType,
          after: params?.after,
          before: params?.before,
          limit: params?.limit,
          next: params?.next
        }
      }
    );
    return response.data;
  }

  async getEventsByAccount(address: string, params?: EventsParams) {
    let response = await this.axios.get(`/events/accounts/${address}`, {
      params: {
        event_type: params?.eventType,
        after: params?.after,
        before: params?.before,
        limit: params?.limit,
        next: params?.next
      }
    });
    return response.data;
  }

  // =====================
  // Listings Endpoints
  // =====================

  async getAllListingsByCollection(collectionSlug: string, params?: ListingsParams) {
    let response = await this.axios.get(`/listings/collection/${collectionSlug}/all`, {
      params: {
        limit: params?.limit,
        next: params?.next
      }
    });
    return response.data;
  }

  async getBestListingsByCollection(collectionSlug: string, params?: ListingsParams) {
    let response = await this.axios.get(`/listings/collection/${collectionSlug}/best`, {
      params: {
        limit: params?.limit,
        next: params?.next
      }
    });
    return response.data;
  }

  async getBestListingByNft(collectionSlug: string, identifier: string) {
    let response = await this.axios.get(
      `/listings/collection/${collectionSlug}/nfts/${identifier}/best`
    );
    return response.data;
  }

  // =====================
  // Offers Endpoints
  // =====================

  async getOffersByCollection(collectionSlug: string, params?: OffersParams) {
    let response = await this.axios.get(`/offers/collection/${collectionSlug}`, {
      params: {
        limit: params?.limit,
        next: params?.next
      }
    });
    return response.data;
  }

  async getBestOfferByNft(collectionSlug: string, identifier: string) {
    let response = await this.axios.get(
      `/offers/collection/${collectionSlug}/nfts/${identifier}/best`
    );
    return response.data;
  }

  async getTraitOffers(collectionSlug: string, params?: PaginationParams) {
    let response = await this.axios.get(`/offers/collection/${collectionSlug}/traits`, {
      params: {
        limit: params?.limit,
        next: params?.next
      }
    });
    return response.data;
  }
}
