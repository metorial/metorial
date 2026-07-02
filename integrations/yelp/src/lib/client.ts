import { createAxios } from 'slates';

let placesAxios = createAxios({
  baseURL: 'https://api.yelp.com/v3'
});

let aiAxios = createAxios({
  baseURL: 'https://api.yelp.com/ai'
});

export interface BusinessSearchParams {
  term?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  categories?: string;
  locale?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  price?: string;
  openNow?: boolean;
  openAt?: number;
  attributes?: string;
}

export interface BusinessMatchParams {
  name: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  address2?: string;
  address3?: string;
  zipCode?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
  matchThreshold?: string;
}

export interface AiChatParams {
  query: string;
  chatId?: string;
  latitude?: number;
  longitude?: number;
  locale?: string;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  async searchBusinesses(params: BusinessSearchParams) {
    let response = await placesAxios.get('/businesses/search', {
      headers: this.headers,
      params: {
        term: params.term,
        location: params.location,
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius,
        categories: params.categories,
        locale: params.locale,
        limit: params.limit,
        offset: params.offset,
        sort_by: params.sortBy,
        price: params.price,
        open_now: params.openNow,
        open_at: params.openAt,
        attributes: params.attributes
      }
    });
    return response.data;
  }

  async searchByPhone(phone: string, locale?: string) {
    let response = await placesAxios.get('/businesses/search/phone', {
      headers: this.headers,
      params: {
        phone,
        locale
      }
    });
    return response.data;
  }

  async searchTransactions(
    transactionType: string,
    params: {
      location?: string;
      latitude?: number;
      longitude?: number;
    }
  ) {
    let response = await placesAxios.get(`/transactions/${transactionType}/search`, {
      headers: this.headers,
      params: {
        location: params.location,
        latitude: params.latitude,
        longitude: params.longitude
      }
    });
    return response.data;
  }

  async getBusinessDetails(businessIdOrAlias: string, locale?: string) {
    let response = await placesAxios.get(
      `/businesses/${encodeURIComponent(businessIdOrAlias)}`,
      {
        headers: this.headers,
        params: {
          locale
        }
      }
    );
    return response.data;
  }

  async getBusinessReviews(
    businessIdOrAlias: string,
    params?: {
      locale?: string;
      sortBy?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let response = await placesAxios.get(
      `/businesses/${encodeURIComponent(businessIdOrAlias)}/reviews`,
      {
        headers: this.headers,
        params: {
          locale: params?.locale,
          sort_by: params?.sortBy,
          limit: params?.limit,
          offset: params?.offset
        }
      }
    );
    return response.data;
  }

  async autocomplete(
    text: string,
    params?: {
      latitude?: number;
      longitude?: number;
      locale?: string;
    }
  ) {
    let response = await placesAxios.get('/autocomplete', {
      headers: this.headers,
      params: {
        text,
        latitude: params?.latitude,
        longitude: params?.longitude,
        locale: params?.locale
      }
    });
    return response.data;
  }

  async matchBusiness(params: BusinessMatchParams) {
    let response = await placesAxios.get('/businesses/matches', {
      headers: this.headers,
      params: {
        name: params.name,
        address1: params.address1,
        city: params.city,
        state: params.state,
        country: params.country,
        address2: params.address2,
        address3: params.address3,
        zip_code: params.zipCode,
        phone: params.phone,
        latitude: params.latitude,
        longitude: params.longitude,
        limit: params.limit,
        match_threshold: params.matchThreshold
      }
    });
    return response.data;
  }

  async aiChat(params: AiChatParams) {
    let body: Record<string, any> = {
      query: params.query
    };

    if (params.chatId) {
      body.chat_id = params.chatId;
    }

    let userContext: Record<string, any> = {};
    if (params.latitude !== undefined) userContext.latitude = params.latitude;
    if (params.longitude !== undefined) userContext.longitude = params.longitude;
    if (params.locale) userContext.locale = params.locale;

    if (Object.keys(userContext).length > 0) {
      body.user_context = userContext;
    }

    let response = await aiAxios.post('/chat/v2', body, {
      headers: this.headers
    });
    return response.data;
  }
}
