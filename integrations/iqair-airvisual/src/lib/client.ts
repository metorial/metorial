import { createAxios } from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://api.airvisual.com/v2'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number | undefined> = {}
  ): Promise<T> {
    let filteredParams: Record<string, string | number> = { key: this.token };
    for (let [k, v] of Object.entries(params)) {
      if (v !== undefined) {
        filteredParams[k] = v;
      }
    }

    let response = await apiAxios.get(path, { params: filteredParams });
    let body = response.data as { status: string; data: T };

    if (body.status !== 'success') {
      let errorData = body.data as any;
      let message = errorData?.message || 'Unknown API error';
      throw new Error(`IQAir API error: ${message}`);
    }

    return body.data;
  }

  async listCountries(): Promise<Array<{ country: string }>> {
    return this.get('/countries');
  }

  async listStates(country: string): Promise<Array<{ state: string }>> {
    return this.get('/states', { country });
  }

  async listCities(country: string, state: string): Promise<Array<{ city: string }>> {
    return this.get('/cities', { state, country });
  }

  async listStations(
    country: string,
    state: string,
    city: string
  ): Promise<Array<{ station: string }>> {
    return this.get('/stations', { city, state, country });
  }

  async getCityData(country: string, state: string, city: string): Promise<CityData> {
    return this.get('/city', { city, state, country });
  }

  async getNearestCity(lat?: number, lon?: number): Promise<CityData> {
    return this.get('/nearest_city', {
      lat: lat !== undefined ? lat : undefined,
      lon: lon !== undefined ? lon : undefined
    });
  }

  async getNearestStation(lat?: number, lon?: number): Promise<StationData> {
    return this.get('/nearest_station', {
      lat: lat !== undefined ? lat : undefined,
      lon: lon !== undefined ? lon : undefined
    });
  }

  async getStationData(
    country: string,
    state: string,
    city: string,
    station: string
  ): Promise<StationData> {
    return this.get('/station', { station, city, state, country });
  }

  async getCityRanking(): Promise<CityRankingEntry[]> {
    return this.get('/city_ranking');
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
  forecasts?: Record<string, any>[];
  history?: {
    weather?: Record<string, any>[];
    pollution?: Record<string, any>[];
  };
}

export interface StationData extends CityData {
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
