import { createAxios } from 'slates';
import type {
  SeatGeekEvent,
  SeatGeekEventRecommendationsResponse,
  SeatGeekEventsResponse,
  SeatGeekPerformer,
  SeatGeekPerformerRecommendationsResponse,
  SeatGeekPerformersResponse,
  SeatGeekTaxonomiesResponse,
  SeatGeekVenue,
  SeatGeekVenuesResponse
} from './types';

let api = createAxios({
  baseURL: 'https://api.seatgeek.com/2'
});

export interface ClientConfig {
  clientId: string;
  clientSecret?: string;
  affiliateId?: string;
  referralId?: string;
}

export class Client {
  private clientId: string;
  private clientSecret: string;
  private affiliateId?: string;
  private referralId?: string;

  constructor(config: ClientConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret ?? '';
    this.affiliateId = config.affiliateId;
    this.referralId = config.referralId;
  }

  private baseParams(): Record<string, string> {
    let params: Record<string, string> = {
      client_id: this.clientId,
      client_secret: this.clientSecret
    };
    if (this.affiliateId) {
      params.aid = this.affiliateId;
    }
    if (this.referralId) {
      params.rid = this.referralId;
    }
    return params;
  }

  async searchEvents(params: Record<string, string>): Promise<SeatGeekEventsResponse> {
    let response = await api.get<SeatGeekEventsResponse>('/events', {
      params: { ...this.baseParams(), ...params }
    });
    return response.data;
  }

  async getEvent(eventId: number): Promise<SeatGeekEvent> {
    let response = await api.get<SeatGeekEvent>(`/events/${eventId}`, {
      params: this.baseParams()
    });
    return response.data;
  }

  async searchPerformers(params: Record<string, string>): Promise<SeatGeekPerformersResponse> {
    let response = await api.get<SeatGeekPerformersResponse>('/performers', {
      params: { ...this.baseParams(), ...params }
    });
    return response.data;
  }

  async getPerformer(performerId: number): Promise<SeatGeekPerformer> {
    let response = await api.get<SeatGeekPerformer>(`/performers/${performerId}`, {
      params: this.baseParams()
    });
    return response.data;
  }

  async searchVenues(params: Record<string, string>): Promise<SeatGeekVenuesResponse> {
    let response = await api.get<SeatGeekVenuesResponse>('/venues', {
      params: { ...this.baseParams(), ...params }
    });
    return response.data;
  }

  async getVenue(venueId: number): Promise<SeatGeekVenue> {
    let response = await api.get<SeatGeekVenue>(`/venues/${venueId}`, {
      params: this.baseParams()
    });
    return response.data;
  }

  async getTaxonomies(): Promise<SeatGeekTaxonomiesResponse> {
    let response = await api.get<SeatGeekTaxonomiesResponse>('/taxonomies', {
      params: this.baseParams()
    });
    return response.data;
  }

  async getEventRecommendations(
    params: Record<string, string>
  ): Promise<SeatGeekEventRecommendationsResponse> {
    let response = await api.get<SeatGeekEventRecommendationsResponse>('/recommendations', {
      params: { ...this.baseParams(), ...params }
    });
    return response.data;
  }

  async getPerformerRecommendations(
    params: Record<string, string>
  ): Promise<SeatGeekPerformerRecommendationsResponse> {
    let response = await api.get<SeatGeekPerformerRecommendationsResponse>(
      '/recommendations/performers',
      {
        params: { ...this.baseParams(), ...params }
      }
    );
    return response.data;
  }
}
