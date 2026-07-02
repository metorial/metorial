import { createAxios } from 'slates';
import type {
  Event,
  EventMarkets,
  EventWithOdds,
  EventWithScores,
  HistoricalResponse,
  Participant,
  Sport
} from './types';

let api = createAxios({
  baseURL: 'https://api.the-odds-api.com'
});

export interface OddsParams {
  sport: string;
  regions: string;
  markets?: string;
  oddsFormat?: string;
  dateFormat?: string;
  eventIds?: string;
  bookmakers?: string;
  commenceTimeFrom?: string;
  commenceTimeTo?: string;
  includeLinks?: boolean;
  includeSids?: boolean;
  includeBetLimits?: boolean;
  includeRotationNumbers?: boolean;
}

export interface ScoresParams {
  sport: string;
  daysFrom?: number;
  dateFormat?: string;
  eventIds?: string;
}

export interface EventsParams {
  sport: string;
  dateFormat?: string;
  eventIds?: string;
  commenceTimeFrom?: string;
  commenceTimeTo?: string;
}

export interface EventOddsParams {
  sport: string;
  eventId: string;
  regions: string;
  markets?: string;
  oddsFormat?: string;
  dateFormat?: string;
  bookmakers?: string;
  includeLinks?: boolean;
  includeSids?: boolean;
  includeBetLimits?: boolean;
}

export interface EventMarketsParams {
  sport: string;
  eventId: string;
  regions: string;
  bookmakers?: string;
  dateFormat?: string;
}

export interface HistoricalOddsParams {
  sport: string;
  regions: string;
  markets: string;
  date: string;
  oddsFormat?: string;
  dateFormat?: string;
  eventIds?: string;
  bookmakers?: string;
}

export interface HistoricalEventsParams {
  sport: string;
  date: string;
  dateFormat?: string;
  eventIds?: string;
  commenceTimeFrom?: string;
  commenceTimeTo?: string;
}

export interface HistoricalEventOddsParams {
  sport: string;
  eventId: string;
  regions: string;
  markets: string;
  date: string;
  oddsFormat?: string;
  dateFormat?: string;
  bookmakers?: string;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private buildParams(
    params: Record<string, string | number | boolean | undefined>
  ): Record<string, string | number | boolean> {
    let result: Record<string, string | number | boolean> = { apiKey: this.token };
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
    return result;
  }

  async getSports(all?: boolean): Promise<Sport[]> {
    let response = await api.get('/v4/sports', {
      params: this.buildParams({ all: all ? 'true' : undefined })
    });
    return response.data;
  }

  async getOdds(params: OddsParams): Promise<EventWithOdds[]> {
    let response = await api.get(`/v4/sports/${params.sport}/odds`, {
      params: this.buildParams({
        regions: params.regions,
        markets: params.markets,
        oddsFormat: params.oddsFormat,
        dateFormat: params.dateFormat,
        eventIds: params.eventIds,
        bookmakers: params.bookmakers,
        commenceTimeFrom: params.commenceTimeFrom,
        commenceTimeTo: params.commenceTimeTo,
        includeLinks: params.includeLinks,
        includeSids: params.includeSids,
        includeBetLimits: params.includeBetLimits,
        includeRotationNumbers: params.includeRotationNumbers
      })
    });
    return response.data;
  }

  async getScores(params: ScoresParams): Promise<EventWithScores[]> {
    let response = await api.get(`/v4/sports/${params.sport}/scores`, {
      params: this.buildParams({
        daysFrom: params.daysFrom,
        dateFormat: params.dateFormat,
        eventIds: params.eventIds
      })
    });
    return response.data;
  }

  async getEvents(params: EventsParams): Promise<Event[]> {
    let response = await api.get(`/v4/sports/${params.sport}/events`, {
      params: this.buildParams({
        dateFormat: params.dateFormat,
        eventIds: params.eventIds,
        commenceTimeFrom: params.commenceTimeFrom,
        commenceTimeTo: params.commenceTimeTo
      })
    });
    return response.data;
  }

  async getEventOdds(params: EventOddsParams): Promise<EventWithOdds> {
    let response = await api.get(`/v4/sports/${params.sport}/events/${params.eventId}/odds`, {
      params: this.buildParams({
        regions: params.regions,
        markets: params.markets,
        oddsFormat: params.oddsFormat,
        dateFormat: params.dateFormat,
        bookmakers: params.bookmakers,
        includeLinks: params.includeLinks,
        includeSids: params.includeSids,
        includeBetLimits: params.includeBetLimits
      })
    });
    return response.data;
  }

  async getEventMarkets(params: EventMarketsParams): Promise<EventMarkets> {
    let response = await api.get(
      `/v4/sports/${params.sport}/events/${params.eventId}/markets`,
      {
        params: this.buildParams({
          regions: params.regions,
          bookmakers: params.bookmakers,
          dateFormat: params.dateFormat
        })
      }
    );
    return response.data;
  }

  async getParticipants(sport: string): Promise<Participant[]> {
    let response = await api.get(`/v4/sports/${sport}/participants`, {
      params: this.buildParams({})
    });
    return response.data;
  }

  async getHistoricalOdds(
    params: HistoricalOddsParams
  ): Promise<HistoricalResponse<EventWithOdds[]>> {
    let response = await api.get(`/v4/historical/sports/${params.sport}/odds`, {
      params: this.buildParams({
        regions: params.regions,
        markets: params.markets,
        date: params.date,
        oddsFormat: params.oddsFormat,
        dateFormat: params.dateFormat,
        eventIds: params.eventIds,
        bookmakers: params.bookmakers
      })
    });
    return response.data;
  }

  async getHistoricalEvents(
    params: HistoricalEventsParams
  ): Promise<HistoricalResponse<Event[]>> {
    let response = await api.get(`/v4/historical/sports/${params.sport}/events`, {
      params: this.buildParams({
        date: params.date,
        dateFormat: params.dateFormat,
        eventIds: params.eventIds,
        commenceTimeFrom: params.commenceTimeFrom,
        commenceTimeTo: params.commenceTimeTo
      })
    });
    return response.data;
  }

  async getHistoricalEventOdds(
    params: HistoricalEventOddsParams
  ): Promise<HistoricalResponse<EventWithOdds>> {
    let response = await api.get(
      `/v4/historical/sports/${params.sport}/events/${params.eventId}/odds`,
      {
        params: this.buildParams({
          regions: params.regions,
          markets: params.markets,
          date: params.date,
          oddsFormat: params.oddsFormat,
          dateFormat: params.dateFormat,
          bookmakers: params.bookmakers
        })
      }
    );
    return response.data;
  }
}
