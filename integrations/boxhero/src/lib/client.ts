import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  items: T[];
  cursor?: string;
  has_more: boolean;
}

export interface BoxHeroItem {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  photo_url: string | null;
  cost: string | null;
  price: string | null;
  quantity?: number;
  attrs: BoxHeroAttribute[];
}

export interface BoxHeroAttribute {
  id: number;
  name: string;
  type: string;
  value: string | number | null;
}

export interface BoxHeroLocation {
  id: number;
  name: string;
  deleted?: boolean;
}

export interface BoxHeroPartner {
  id: number;
  name: string;
  type?: string;
  deleted?: boolean;
}

export interface BoxHeroMember {
  id: number;
  name: string;
  deleted?: boolean;
}

export interface BoxHeroTransactionItem {
  id: number;
  name: string;
  quantity: number;
  deleted?: boolean;
  to_location_new_stock_level?: number;
  from_location_new_stock_level?: number;
}

export interface BoxHeroTransaction {
  id: number;
  type: string;
  from_location?: BoxHeroLocation;
  to_location?: BoxHeroLocation;
  partner?: BoxHeroPartner;
  items: BoxHeroTransactionItem[];
  transaction_time: string;
  created_at: string;
  created_by: BoxHeroMember;
  count_of_items: number;
  total_quantity: number;
  memo?: string;
  url: string;
  revision?: number;
}

export interface BoxHeroTeam {
  id: number;
  name: string;
  mode: number;
}

export interface BoxHeroAttributeDefinition {
  id: number;
  name: string;
  type: string;
}

export interface ListItemsParams {
  locationIds?: number[];
  limit?: number;
  cursor?: string;
}

export interface ListTransactionsParams {
  type?: string;
  limit?: number;
  cursor?: string;
}

export interface CreateTransactionParams {
  type: 'in' | 'out' | 'adjust' | 'move';
  toLocationId?: number;
  fromLocationId?: number;
  partnerId?: number;
  memo?: string;
  transactionTime?: string;
  items: {
    itemId: number;
    quantity: number;
  }[];
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://rest.boxhero-app.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  async getTeam(): Promise<BoxHeroTeam> {
    let response = await this.axios.get('/teams/linked');
    return response.data;
  }

  async listItems(params?: ListItemsParams): Promise<PaginatedResponse<BoxHeroItem>> {
    let queryParams: Record<string, string | string[]> = {};

    if (params?.locationIds && params.locationIds.length > 0) {
      queryParams.location_ids = params.locationIds.map(String);
    }
    if (params?.limit) {
      queryParams.limit = String(params.limit);
    }
    if (params?.cursor) {
      queryParams.cursor = params.cursor;
    }

    let response = await this.axios.get('/items', { params: queryParams });
    return response.data;
  }

  async listAllItems(params?: Omit<ListItemsParams, 'cursor'>): Promise<BoxHeroItem[]> {
    let allItems: BoxHeroItem[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      let response = await this.listItems({
        ...params,
        cursor
      });

      allItems.push(...response.items);
      hasMore = response.has_more;
      cursor = response.cursor;
    }

    return allItems;
  }

  async listTransactions(
    params?: ListTransactionsParams
  ): Promise<PaginatedResponse<BoxHeroTransaction>> {
    let queryParams: Record<string, string> = {};

    if (params?.type) {
      queryParams.type = params.type;
    }
    if (params?.limit) {
      queryParams.limit = String(params.limit);
    }
    if (params?.cursor) {
      queryParams.cursor = params.cursor;
    }

    let response = await this.axios.get('/txs', { params: queryParams });
    return response.data;
  }

  async listLocationTransactions(
    params?: ListTransactionsParams
  ): Promise<PaginatedResponse<BoxHeroTransaction>> {
    let queryParams: Record<string, string> = {};

    if (params?.type) {
      queryParams.type = params.type;
    }
    if (params?.limit) {
      queryParams.limit = String(params.limit);
    }
    if (params?.cursor) {
      queryParams.cursor = params.cursor;
    }

    let response = await this.axios.get('/location-txs', { params: queryParams });
    return response.data;
  }

  async createTransaction(params: CreateTransactionParams): Promise<BoxHeroTransaction> {
    let body: Record<string, unknown> = {
      type: params.type,
      items: params.items.map(item => ({
        item_id: item.itemId,
        quantity: item.quantity
      }))
    };

    if (params.toLocationId !== undefined) {
      body.to_location_id = params.toLocationId;
    }
    if (params.fromLocationId !== undefined) {
      body.from_location_id = params.fromLocationId;
    }
    if (params.partnerId !== undefined) {
      body.partner_id = params.partnerId;
    }
    if (params.memo !== undefined) {
      body.memo = params.memo;
    }
    if (params.transactionTime !== undefined) {
      body.transaction_time = params.transactionTime;
    }

    let response = await this.axios.post('/txs', body);
    return response.data;
  }

  async listLocations(): Promise<PaginatedResponse<BoxHeroLocation>> {
    let response = await this.axios.get('/locations');
    return response.data;
  }

  async listPartners(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<BoxHeroPartner>> {
    let queryParams: Record<string, string> = {};

    if (params?.limit) {
      queryParams.limit = String(params.limit);
    }
    if (params?.cursor) {
      queryParams.cursor = params.cursor;
    }

    let response = await this.axios.get('/partners', { params: queryParams });
    return response.data;
  }

  async listAttributes(): Promise<PaginatedResponse<BoxHeroAttributeDefinition>> {
    let response = await this.axios.get('/attributes');
    return response.data;
  }
}
