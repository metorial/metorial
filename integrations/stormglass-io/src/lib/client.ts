import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxiosData
} from 'slates';

export interface AstronomyParams {
  lat: number;
  lng: number;
  start?: string;
  end?: string;
}

export interface WeatherParams extends AstronomyParams {
  params: string[];
  source?: string[];
}

export interface TideParams extends AstronomyParams {
  datum?: string;
}

export type SolarParams = WeatherParams;
export type BioParams = WeatherParams;

export interface ElevationParams {
  lat: number;
  lng: number;
}

export interface TideStationsAreaParams {
  box: string;
}

export interface StormglassResponse {
  [key: string]: any;
  meta: Record<string, any>;
}

let validateCoordinates = ({ lat, lng }: ElevationParams) => {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw createApiServiceError('Latitude must be between -90 and 90 degrees.');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw createApiServiceError('Longitude must be between -180 and 180 degrees.');
  }
};

// Stormglass treats ISO prefixes as UTC and ignores the supplied timezone component.
let timestampInUtc = (value: string) => {
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value) * 1000;
  let match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(
      value
    );
  if (!match) return undefined;
  let [, year, month, day, hour = '00', minute = '00', second = '00', fraction] = match;
  let timestamp = Date.parse(
    `${year}-${month}-${day}T${hour}:${minute}:${second}${fraction ? `.${fraction}` : ''}Z`
  );
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

let validateTimeRange = ({ start, end }: Pick<AstronomyParams, 'start' | 'end'>) => {
  for (let [name, value] of Object.entries({ start, end })) {
    if (value !== undefined && !value.trim()) {
      throw createApiServiceError(`${name} must be a UTC ISO timestamp or UNIX timestamp.`);
    }
  }
  let startTime = start === undefined ? undefined : timestampInUtc(start);
  let endTime = end === undefined ? undefined : timestampInUtc(end);
  if (startTime !== undefined && endTime !== undefined && startTime > endTime) {
    throw createApiServiceError('start must be at or before end in UTC.');
  }
  return { startTime, endTime };
};

let pointQuery = (params: AstronomyParams) => {
  validateCoordinates(params);
  validateTimeRange(params);
  return pickDefined({
    lat: params.lat,
    lng: params.lng,
    start: params.start,
    end: params.end
  });
};

let parameterQuery = (params: WeatherParams) => {
  let query = pointQuery(params);
  if (!params.params.length || params.params.some(value => !value.trim())) {
    throw createApiServiceError('Provide at least one nonblank parameter name.');
  }
  if (params.source?.some(value => !value.trim())) {
    throw createApiServiceError('Data source names must not be blank.');
  }
  return {
    ...query,
    params: params.params.join(','),
    ...(params.source?.length ? { source: params.source.join(',') } : {})
  };
};

export let getResponseRows = (
  result: StormglassResponse,
  member: 'data' | 'hours',
  fallbackMember?: 'data' | 'hours'
): any[] => {
  let rows = result[member] ?? (fallbackMember ? result[fallbackMember] : undefined);
  if (!Array.isArray(rows)) {
    throw createApiServiceError(
      `Stormglass returned an invalid response: expected ${member} data.`
    );
  }
  return rows;
};

export class Client {
  private http;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A Stormglass API key is required. Reconnect with a valid API key.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.stormglass.io/v2',
      authHeader: { value: config.token },
      timeout: 30_000
    });
  }

  private async get(path: string, params?: Record<string, unknown>) {
    let response = await requestAxiosData<StormglassResponse>(
      `GET ${path}`,
      () => this.http.get(path, { params }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Stormglass',
          reason: 'stormglass_api_error',
          operation,
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    );
    if (
      !response ||
      typeof response !== 'object' ||
      Array.isArray(response) ||
      !response.meta ||
      typeof response.meta !== 'object' ||
      Array.isArray(response.meta)
    ) {
      throw createApiServiceError(
        'Stormglass returned an invalid response: expected request metadata.'
      );
    }
    return response;
  }

  getWeather(params: WeatherParams) {
    return this.get('/weather/point', parameterQuery(params));
  }

  getMarineWeather(params: WeatherParams) {
    return this.getWeather(params);
  }

  getHistorical(params: WeatherParams) {
    if (params.start === undefined && params.end === undefined) {
      throw createApiServiceError('Historical data requires at least one of start or end.');
    }
    let { startTime, endTime } = validateTimeRange(params);
    if (
      startTime !== undefined &&
      endTime !== undefined &&
      endTime - startTime > 239 * 3_600_000
    ) {
      throw createApiServiceError(
        'Request at most 240 hourly historical data points (end no more than 239 hours after start). Split longer periods into separate requests.'
      );
    }
    return this.get('/historical/point', parameterQuery(params));
  }

  getTideExtremes(params: TideParams) {
    return this.get('/tide/extremes/point', {
      ...pointQuery(params),
      ...pickDefined({ datum: params.datum })
    });
  }

  getTideSeaLevel(params: TideParams) {
    return this.get('/tide/sea-level/point', {
      ...pointQuery(params),
      ...pickDefined({ datum: params.datum })
    });
  }

  getTideStations() {
    return this.get('/tide/stations');
  }

  getTideStationsArea(params: TideStationsAreaParams) {
    let corners = params.box.split(':');
    if (corners.length !== 2) {
      throw createApiServiceError(
        'Use bounding box format "topRightLat,topRightLng:bottomLeftLat,bottomLeftLng".'
      );
    }
    for (let corner of corners) {
      let parts = corner.split(',');
      if (parts.length !== 2 || parts.some(value => !value.trim())) {
        throw createApiServiceError(
          'Each bounding box corner must contain a latitude and longitude.'
        );
      }
      validateCoordinates({ lat: Number(parts[0]), lng: Number(parts[1]) });
    }
    return this.get('/tide/stations/area', { box: params.box });
  }

  getAstronomy(params: AstronomyParams) {
    return this.get('/astronomy/point', pointQuery(params));
  }

  getSolar(params: SolarParams) {
    return this.get('/solar/point', parameterQuery(params));
  }

  getBio(params: BioParams) {
    return this.get('/bio/point', parameterQuery(params));
  }

  getElevation(params: ElevationParams) {
    validateCoordinates(params);
    return this.get('/elevation/point', { lat: params.lat, lng: params.lng });
  }
}
