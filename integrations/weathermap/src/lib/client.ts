import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { validateDate, validateInteger } from './validation';

export class OpenWeatherClient {
  private apiKey: string;
  private units: string;
  private lang: string;
  private axios;

  constructor(config: { apiKey: string; units?: string; lang?: string }) {
    if (typeof config.apiKey !== 'string' || !config.apiKey.trim()) {
      throw createApiServiceError(
        'An OpenWeather API key is required. Reconnect with a valid API key.'
      );
    }
    this.apiKey = config.apiKey;
    this.units = config.units || 'metric';
    this.lang = config.lang || 'en';
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.openweathermap.org',
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'OpenWeather',
          reason: 'openweather_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response, helpers) => {
            let body = response?.data;
            if (!helpers.isRecord(body)) return undefined;
            let code = body.cod;
            return typeof code === 'string' || typeof code === 'number'
              ? String(code)
              : undefined;
          }
        })
    });
  }

  private baseParams() {
    return {
      appid: this.apiKey,
      units: this.units,
      lang: this.lang
    };
  }

  // --- Current Weather ---

  async getCurrentWeather(lat: number, lon: number) {
    let response = await this.axios.get('/data/2.5/weather', {
      params: {
        lat,
        lon,
        ...this.baseParams()
      }
    });
    return response.data;
  }

  // --- 5-Day / 3-Hour Forecast ---

  async getForecast(lat: number, lon: number, count?: number) {
    if (count !== undefined) validateInteger(count, 'count', 1, 40);
    let params: Record<string, string | number> = {
      lat,
      lon,
      ...this.baseParams()
    };
    if (count !== undefined) {
      params.cnt = count;
    }
    let response = await this.axios.get('/data/2.5/forecast', { params });
    return response.data;
  }

  // --- One Call API 3.0 ---

  async getOneCall(lat: number, lon: number, exclude?: string[]) {
    let params: Record<string, string | number> = {
      lat,
      lon,
      ...this.baseParams()
    };
    if (exclude && exclude.length > 0) {
      params.exclude = exclude.join(',');
    }
    let response = await this.axios.get('/data/3.0/onecall', { params });
    return response.data;
  }

  async getOneCallTimemachine(lat: number, lon: number, dt: number) {
    validateInteger(
      dt,
      'unixTimestamp',
      283_996_800,
      Math.floor(Date.now() / 1000) + 4 * 86_400
    );
    let response = await this.axios.get('/data/3.0/onecall/timemachine', {
      params: {
        lat,
        lon,
        dt,
        ...this.baseParams()
      }
    });
    return response.data;
  }

  async getOneCallDaySummary(lat: number, lon: number, date: string) {
    validateDate(date, 'date');
    if (date < '1979-01-02') {
      throw createApiServiceError('Day summaries are available from 1979-01-02.');
    }
    let response = await this.axios.get('/data/3.0/onecall/day_summary', {
      params: {
        lat,
        lon,
        date,
        ...this.baseParams()
      }
    });
    return response.data;
  }

  async getOneCallOverview(lat: number, lon: number, date?: string) {
    if (date !== undefined) validateDate(date, 'date');
    let params: Record<string, string | number> = {
      lat,
      lon,
      appid: this.apiKey,
      units: this.units
    };
    if (date) {
      params.date = date;
    }
    let response = await this.axios.get('/data/3.0/onecall/overview', { params });
    return response.data;
  }

  // --- Air Pollution ---

  async getCurrentAirPollution(lat: number, lon: number) {
    let response = await this.axios.get('/data/2.5/air_pollution', {
      params: { lat, lon, appid: this.apiKey }
    });
    return response.data;
  }

  async getAirPollutionForecast(lat: number, lon: number) {
    let response = await this.axios.get('/data/2.5/air_pollution/forecast', {
      params: { lat, lon, appid: this.apiKey }
    });
    return response.data;
  }

  async getAirPollutionHistory(lat: number, lon: number, start: number, end: number) {
    validateInteger(start, 'startTimestamp', 1_606_435_200);
    validateInteger(end, 'endTimestamp', 1_606_435_200);
    if (start >= end) {
      throw createApiServiceError('startTimestamp must be earlier than endTimestamp.');
    }
    let response = await this.axios.get('/data/2.5/air_pollution/history', {
      params: { lat, lon, start, end, appid: this.apiKey }
    });
    return response.data;
  }

  // --- Geocoding ---

  async geocodeDirect(query: string, limit?: number) {
    if (limit !== undefined) validateInteger(limit, 'limit', 1, 5);
    let response = await this.axios.get('/geo/1.0/direct', {
      params: {
        q: query,
        limit: limit ?? 5,
        appid: this.apiKey
      }
    });
    return response.data;
  }

  async geocodeByZip(zipCode: string) {
    let response = await this.axios.get('/geo/1.0/zip', {
      params: {
        zip: zipCode,
        appid: this.apiKey
      }
    });
    return response.data;
  }

  async geocodeReverse(lat: number, lon: number, limit?: number) {
    if (limit !== undefined) validateInteger(limit, 'limit', 1, 5);
    let response = await this.axios.get('/geo/1.0/reverse', {
      params: {
        lat,
        lon,
        limit: limit ?? 5,
        appid: this.apiKey
      }
    });
    return response.data;
  }

  // --- Weather Maps ---

  getWeatherMapTileUrl(layer: string, z: number, x: number, y: number) {
    validateInteger(z, 'zoom', 0, 18);
    let maxCoordinate = 2 ** z - 1;
    validateInteger(x, 'tileX', 0, maxCoordinate);
    validateInteger(y, 'tileY', 0, maxCoordinate);
    return `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png`;
  }
}
