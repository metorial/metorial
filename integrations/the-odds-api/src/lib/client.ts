import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import type {
  Event,
  EventMarkets,
  EventWithOdds,
  EventWithScores,
  HistoricalResponse,
  Participant,
  Sport,
  SportEventWithOdds
} from './types';

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
  includeRotationNumbers?: boolean;
  sport: string;
  dateFormat?: string;
  eventIds?: string;
  commenceTimeFrom?: string;
  commenceTimeTo?: string;
}

export interface EventOddsParams {
  includeRotationNumbers?: boolean;
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
  includeRotationNumbers?: boolean;
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
  includeRotationNumbers?: boolean;
  sport: string;
  date: string;
  dateFormat?: string;
  eventIds?: string;
  commenceTimeFrom?: string;
  commenceTimeTo?: string;
}

export interface HistoricalEventOddsParams {
  includeRotationNumbers?: boolean;
  sport: string;
  eventId: string;
  regions: string;
  markets: string;
  date: string;
  oddsFormat?: string;
  dateFormat?: string;
  bookmakers?: string;
}

export interface HistoricalEventMarketsParams extends EventMarketsParams {
  date: string;
}

type Query = Record<string, string | number | boolean | undefined>;

let pathValue = (value: string, name: string) => {
  if (!value.trim() || value === '.' || value === '..') {
    throw createApiServiceError(`Provide a non-empty ${name}.`);
  }
  return encodeURIComponent(value);
};

let validateQuery = (params: Query) => {
  for (let key of ['date', 'commenceTimeFrom', 'commenceTimeTo']) {
    let value = params[key];
    if (value !== undefined && !z.iso.datetime({ offset: true }).safeParse(value).success) {
      throw createApiServiceError(
        `${key} must be an ISO 8601 timestamp, for example 2026-10-15T12:00:00Z.`
      );
    }
  }
  if (
    typeof params.commenceTimeFrom === 'string' &&
    typeof params.commenceTimeTo === 'string' &&
    Date.parse(params.commenceTimeTo) <= Date.parse(params.commenceTimeFrom)
  ) {
    throw createApiServiceError('commenceTimeTo must be later than commenceTimeFrom.');
  }
  if (
    params.daysFrom !== undefined &&
    (typeof params.daysFrom !== 'number' ||
      !Number.isInteger(params.daysFrom) ||
      params.daysFrom < 1 ||
      params.daysFrom > 3)
  ) {
    throw createApiServiceError('daysFrom must be a whole number from 1 to 3.');
  }
  for (let key of ['regions', 'markets', 'eventIds', 'bookmakers']) {
    let value = params[key];
    if (typeof value === 'string' && value.split(',').some(item => !item.trim())) {
      throw createApiServiceError(`${key} must contain non-empty comma-separated values.`);
    }
  }
};

export class Client {
  private api;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError('Reconnect with a non-empty The Odds API key.');
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.the-odds-api.com',
      params: { apiKey: token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'The Odds API',
          reason: 'the_odds_api_request_failed',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response, helpers) => {
            let data = response?.data;
            if (!helpers.isRecord(data)) return undefined;
            let code = data.error_code ?? data.code;
            return typeof code === 'string' || typeof code === 'number'
              ? String(code)
              : undefined;
          }
        })
    });
  }

  private async get<T>(path: string, params: Query = {}): Promise<T> {
    validateQuery(params);
    let response = await this.api.get<T>(path, { params: pickDefined(params) });
    return response.data;
  }

  getSports(all?: boolean): Promise<Sport[]> {
    return this.get('/v4/sports', { all });
  }

  getOdds({ sport, ...params }: OddsParams): Promise<SportEventWithOdds[]> {
    return this.get(
      `/v4/sports/${pathValue(sport, 'sport key from list_sports')}/odds`,
      params
    );
  }

  getScores({ sport, ...params }: ScoresParams): Promise<EventWithScores[]> {
    return this.get(
      `/v4/sports/${pathValue(sport, 'sport key from list_sports')}/scores`,
      params
    );
  }

  getEvents({ sport, ...params }: EventsParams): Promise<Event[]> {
    return this.get(
      `/v4/sports/${pathValue(sport, 'sport key from list_sports')}/events`,
      params
    );
  }

  getEventOdds({ sport, eventId, ...params }: EventOddsParams): Promise<EventWithOdds> {
    return this.get(
      `/v4/sports/${pathValue(sport, 'sport key from list_sports')}/events/${pathValue(eventId, 'event ID from get_events')}/odds`,
      params
    );
  }

  getEventMarkets({ sport, eventId, ...params }: EventMarketsParams): Promise<EventMarkets> {
    return this.get(
      `/v4/sports/${pathValue(sport, 'sport key from list_sports')}/events/${pathValue(eventId, 'event ID from get_events')}/markets`,
      params
    );
  }

  getParticipants(sport: string): Promise<Participant[]> {
    return this.get(
      `/v4/sports/${pathValue(sport, 'sport key from list_sports')}/participants`
    );
  }

  getHistoricalOdds({
    sport,
    ...params
  }: HistoricalOddsParams): Promise<HistoricalResponse<SportEventWithOdds[]>> {
    return this.get(
      `/v4/historical/sports/${pathValue(sport, 'sport key from list_sports')}/odds`,
      params
    );
  }

  getHistoricalEvents({
    sport,
    ...params
  }: HistoricalEventsParams): Promise<HistoricalResponse<Event[]>> {
    return this.get(
      `/v4/historical/sports/${pathValue(sport, 'sport key from list_sports')}/events`,
      params
    );
  }

  getHistoricalEventOdds({
    sport,
    eventId,
    ...params
  }: HistoricalEventOddsParams): Promise<HistoricalResponse<EventWithOdds>> {
    return this.get(
      `/v4/historical/sports/${pathValue(sport, 'sport key from list_sports')}/events/${pathValue(eventId, 'event ID from get_historical_events')}/odds`,
      params
    );
  }

  getHistoricalEventMarkets({
    sport,
    eventId,
    ...params
  }: HistoricalEventMarketsParams): Promise<HistoricalResponse<EventMarkets>> {
    return this.get(
      `/v4/historical/sports/${pathValue(sport, 'sport key from list_sports')}/events/${pathValue(eventId, 'event ID from get_historical_events')}/markets`,
      params
    );
  }
}
