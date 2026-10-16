import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxios
} from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://api.airvisual.com/v2',
  timeout: 30_000,
  headers: { Accept: 'application/json' }
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide an IQAir AirVisual API key and reconnect.', {
        reason: 'iqair_missing_api_key'
      });
    }
    this.token = config.token;
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number | undefined> = {}
  ): Promise<T> {
    let response = await requestAxios<unknown>(
      path,
      () => apiAxios.get(path, { params: { ...pickDefined(params), key: this.token } }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'IQAir AirVisual',
          reason: 'iqair_api_error',
          operation,
          nestedKeys: ['data', 'errors'],
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
        })
    );
    let body = response.data;

    if (!isApiErrorRecord(body) || body.status !== 'success' || !('data' in body)) {
      throw buildApiServiceError(
        { response: { status: response.status, data: body } },
        {
          providerLabel: 'IQAir AirVisual',
          reason: 'iqair_api_error',
          operation: path,
          nestedKeys: ['data', 'errors'],
          fallbackMessage: 'The API did not return a successful data response.'
        }
      );
    }

    return body.data as T;
  }

  private validateNames(names: Record<string, string>) {
    for (let [field, value] of Object.entries(names)) {
      if (!value.trim()) {
        throw createApiServiceError(`Provide a non-empty ${field} name from List Locations.`, {
          reason: 'iqair_invalid_location'
        });
      }
    }
  }

  private validateCoordinates(lat?: number, lon?: number) {
    if ((lat === undefined) !== (lon === undefined)) {
      throw createApiServiceError(
        'Provide both latitude and longitude, or omit both for IP geolocation.',
        { reason: 'iqair_incomplete_coordinates' }
      );
    }
    if (
      (lat !== undefined && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
      (lon !== undefined && (!Number.isFinite(lon) || lon < -180 || lon > 180))
    ) {
      throw createApiServiceError(
        'Latitude must be between -90 and 90; longitude must be between -180 and 180.',
        { reason: 'iqair_invalid_coordinates' }
      );
    }
  }

  private async list<T>(path: string, field: string, params?: Record<string, string>) {
    let data = await this.get<unknown>(path, params);
    if (
      !Array.isArray(data) ||
      data.some(entry => !isApiErrorRecord(entry) || typeof entry[field] !== 'string')
    ) {
      throw createApiServiceError('IQAir AirVisual returned an invalid location directory.', {
        reason: 'iqair_invalid_response'
      });
    }
    return data as T[];
  }

  private async getObservation<T extends CityData>(
    path: string,
    params: Record<string, string | number | undefined>
  ): Promise<T> {
    let data = await this.get<unknown>(path, params);
    if (
      !isApiErrorRecord(data) ||
      !isApiErrorRecord(data.location) ||
      !Array.isArray(data.location.coordinates) ||
      data.location.coordinates.length < 2 ||
      !data.location.coordinates.slice(0, 2).every(value => typeof value === 'number') ||
      !['city', 'state', 'country'].every(field => typeof data[field] === 'string')
    ) {
      throw createApiServiceError(
        'IQAir AirVisual returned an invalid location observation.',
        {
          reason: 'iqair_invalid_response'
        }
      );
    }
    if (
      !isApiErrorRecord(data.current) ||
      !isApiErrorRecord(data.current.pollution) ||
      !isApiErrorRecord(data.current.weather)
    ) {
      throw createApiServiceError(
        'Current air quality or weather data is unavailable for this location. Try another location or retry after the next hourly update.',
        { reason: 'iqair_observation_unavailable' }
      );
    }
    let { pollution, weather } = data.current;
    if (
      !['ts', 'mainus', 'maincn'].every(field => typeof pollution[field] === 'string') ||
      !['aqius', 'aqicn'].every(field => typeof pollution[field] === 'number') ||
      !['ts', 'ic'].every(field => typeof weather[field] === 'string') ||
      !['tp', 'pr', 'hu', 'ws', 'wd'].every(field => typeof weather[field] === 'number')
    ) {
      throw createApiServiceError(
        'IQAir AirVisual returned incomplete current air quality or weather measurements. Try another location or retry later.',
        { reason: 'iqair_observation_unavailable' }
      );
    }
    return data as unknown as T;
  }

  async listCountries(): Promise<Array<{ country: string }>> {
    return this.list('/countries', 'country');
  }

  async listStates(country: string): Promise<Array<{ state: string }>> {
    this.validateNames({ country });
    return this.list('/states', 'state', { country });
  }

  async listCities(country: string, state: string): Promise<Array<{ city: string }>> {
    this.validateNames({ country, state });
    return this.list('/cities', 'city', { state, country });
  }

  async listStations(
    country: string,
    state: string,
    city: string
  ): Promise<Array<{ station: string }>> {
    this.validateNames({ country, state, city });
    return this.list('/stations', 'station', { city, state, country });
  }

  async getCityData(country: string, state: string, city: string): Promise<CityData> {
    this.validateNames({ country, state, city });
    return this.getObservation('/city', { city, state, country });
  }

  async getNearestCity(lat?: number, lon?: number): Promise<CityData> {
    this.validateCoordinates(lat, lon);
    return this.getObservation('/nearest_city', { lat, lon });
  }

  async getNearestStation(lat?: number, lon?: number): Promise<StationData> {
    this.validateCoordinates(lat, lon);
    return this.getObservation('/nearest_station', { lat, lon });
  }

  async getStationData(
    country: string,
    state: string,
    city: string,
    station: string
  ): Promise<StationData> {
    this.validateNames({ country, state, city, station });
    return this.getObservation('/station', { station, city, state, country });
  }

  async getCityRanking(): Promise<CityRankingEntry[]> {
    let data = await this.get<unknown>('/city_ranking');
    if (
      !Array.isArray(data) ||
      data.some(
        entry =>
          !isApiErrorRecord(entry) ||
          !['city', 'state', 'country'].every(field => typeof entry[field] === 'string') ||
          !isApiErrorRecord(entry.ranking) ||
          typeof entry.ranking.current_aqi !== 'number' ||
          typeof entry.ranking.current_aqi_cn !== 'number'
      )
    ) {
      throw createApiServiceError('IQAir AirVisual returned an invalid city ranking.', {
        reason: 'iqair_invalid_response'
      });
    }
    return data as CityRankingEntry[];
  }
}

export interface WeatherData {
  ts: string;
  tp: number;
  pr: number;
  hu: number;
  ws: number;
  wd: number;
  ic: string;
  heatIndex?: number;
}

export interface PollutantDetail {
  conc: number;
  aqius: number;
  aqicn: number;
}

export interface PollutionData {
  ts: string;
  aqius: number;
  mainus: string;
  aqicn: number;
  maincn: string;
  p2?: PollutantDetail;
  p1?: PollutantDetail;
  o3?: PollutantDetail;
  n2?: PollutantDetail;
  s2?: PollutantDetail;
  co?: PollutantDetail;
}

export interface LocationData {
  type: string;
  coordinates: [number, number];
}

export interface CityData {
  city: string;
  state: string;
  country: string;
  location: LocationData;
  current: {
    weather: WeatherData;
    pollution: PollutionData;
  };
  units?: Record<string, string>;
  forecasts?: Record<string, unknown>[];
  forecasts_daily?: Record<string, unknown>[];
  history?: {
    weather?: Record<string, unknown>[];
    pollution?: Record<string, unknown>[];
  };
}

export interface StationData extends CityData {
  name?: string;
  station?: string;
}

export interface CityRankingEntry {
  city: string;
  state: string;
  country: string;
  ranking: {
    current_aqi: number;
    current_aqi_cn: number;
  };
}
