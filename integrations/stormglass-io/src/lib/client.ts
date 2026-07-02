import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.stormglass.io/v2'
});

export interface WeatherParams {
  lat: number;
  lng: number;
  params: string[];
  start?: string;
  end?: string;
  source?: string[];
}

export interface TideParams {
  lat: number;
  lng: number;
  start?: string;
  end?: string;
  datum?: string;
}

export interface AstronomyParams {
  lat: number;
  lng: number;
  start?: string;
  end?: string;
}

export interface SolarParams {
  lat: number;
  lng: number;
  params: string[];
  start?: string;
  end?: string;
  source?: string[];
}

export interface BioParams {
  lat: number;
  lng: number;
  params: string[];
  start?: string;
  end?: string;
  source?: string[];
}

export interface ElevationParams {
  lat: number;
  lng: number;
}

export interface TideStationsAreaParams {
  box: string;
}

export class Client {
  constructor(private config: { token: string }) {}

  private get headers() {
    return {
      Authorization: this.config.token
    };
  }

  async getWeather(params: WeatherParams) {
    let response = await http.get('/weather/point', {
      headers: this.headers,
      params: {
        lat: params.lat,
        lng: params.lng,
        params: params.params.join(','),
        ...(params.start ? { start: params.start } : {}),
        ...(params.end ? { end: params.end } : {}),
        ...(params.source && params.source.length > 0
          ? { source: params.source.join(',') }
          : {})
      }
    });
    return response.data;
  }

  async getMarineWeather(params: WeatherParams) {
    let response = await http.get('/weather/point', {
      headers: this.headers,
      params: {
        lat: params.lat,
        lng: params.lng,
        params: params.params.join(','),
        ...(params.start ? { start: params.start } : {}),
        ...(params.end ? { end: params.end } : {}),
        ...(params.source && params.source.length > 0
          ? { source: params.source.join(',') }
          : {})
      }
    });
    return response.data;
  }

  async getTideExtremes(params: TideParams) {
    let response = await http.get('/tide/extremes/point', {
      headers: this.headers,
      params: {
        lat: params.lat,
        lng: params.lng,
        ...(params.start ? { start: params.start } : {}),
        ...(params.end ? { end: params.end } : {}),
        ...(params.datum ? { datum: params.datum } : {})
      }
    });
    return response.data;
  }

  async getTideSeaLevel(params: TideParams) {
    let response = await http.get('/tide/sea-level/point', {
      headers: this.headers,
      params: {
        lat: params.lat,
        lng: params.lng,
        ...(params.start ? { start: params.start } : {}),
        ...(params.end ? { end: params.end } : {}),
        ...(params.datum ? { datum: params.datum } : {})
      }
    });
    return response.data;
  }

  async getTideStations() {
    let response = await http.get('/tide/stations', {
      headers: this.headers
    });
    return response.data;
  }

  async getTideStationsArea(params: TideStationsAreaParams) {
    let response = await http.get('/tide/stations/area', {
      headers: this.headers,
      params: {
        box: params.box
      }
    });
    return response.data;
  }

  async getAstronomy(params: AstronomyParams) {
    let response = await http.get('/astronomy/point', {
      headers: this.headers,
      params: {
        lat: params.lat,
        lng: params.lng,
        ...(params.start ? { start: params.start } : {}),
        ...(params.end ? { end: params.end } : {})
      }
    });
    return response.data;
  }

  async getSolar(params: SolarParams) {
    let response = await http.get('/solar/point', {
      headers: this.headers,
      params: {
        lat: params.lat,
        lng: params.lng,
        params: params.params.join(','),
        ...(params.start ? { start: params.start } : {}),
        ...(params.end ? { end: params.end } : {}),
        ...(params.source && params.source.length > 0
          ? { source: params.source.join(',') }
          : {})
      }
    });
    return response.data;
  }

  async getBio(params: BioParams) {
    let response = await http.get('/bio/point', {
      headers: this.headers,
      params: {
        lat: params.lat,
        lng: params.lng,
        params: params.params.join(','),
        ...(params.start ? { start: params.start } : {}),
        ...(params.end ? { end: params.end } : {}),
        ...(params.source && params.source.length > 0
          ? { source: params.source.join(',') }
          : {})
      }
    });
    return response.data;
  }

  async getElevation(params: ElevationParams) {
    let response = await http.get('/elevation/point', {
      headers: this.headers,
      params: {
        lat: params.lat,
        lng: params.lng
      }
    });
    return response.data;
  }
}
