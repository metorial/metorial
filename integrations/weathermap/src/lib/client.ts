import { createAxios } from 'slates';

export class OpenWeatherClient {
  private apiKey: string;
  private units: string;
  private lang: string;
  private axios;

  constructor(config: { apiKey: string; units?: string; lang?: string }) {
    this.apiKey = config.apiKey;
    this.units = config.units || 'metric';
    this.lang = config.lang || 'en';
    this.axios = createAxios({
      baseURL: 'https://api.openweathermap.org'
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
    let params: Record<string, any> = {
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
    let params: Record<string, any> = {
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
    let params: Record<string, any> = {
      lat,
      lon,
      ...this.baseParams()
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
    let response = await this.axios.get('/data/2.5/air_pollution/history', {
      params: { lat, lon, start, end, appid: this.apiKey }
    });
    return response.data;
  }

  // --- Geocoding ---

  async geocodeDirect(query: string, limit?: number) {
    let response = await this.axios.get('/geo/1.0/direct', {
      params: {
        q: query,
        limit: limit || 5,
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
    let response = await this.axios.get('/geo/1.0/reverse', {
      params: {
        lat,
        lon,
        limit: limit || 5,
        appid: this.apiKey
      }
    });
    return response.data;
  }

  // --- Weather Maps ---

  getWeatherMapTileUrl(layer: string, z: number, x: number, y: number) {
    return `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${this.apiKey}`;
  }
}
