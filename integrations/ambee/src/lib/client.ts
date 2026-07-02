import { createAxios } from 'slates';

let BASE_URL = 'https://api.ambeedata.com';

export interface ClientConfig {
  token: string;
  language?: string;
  units?: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.http = createAxios({
      baseURL: BASE_URL
    });
    this.http.defaults.headers.common['x-api-key'] = config.token;
    this.http.defaults.headers.common['Content-Type'] = 'application/json';
    if (config.language) {
      this.http.defaults.headers.common['Accept-Language'] = config.language;
    }
  }

  // ─── Air Quality ───────────────────────────────────────────────

  async getAirQualityByLatLng(lat: number, lng: number) {
    let res = await this.http.get('/latest/by-lat-lng', { params: { lat, lng } });
    return res.data;
  }

  async getAirQualityByCity(city: string, limit?: number) {
    let res = await this.http.get('/latest/by-city', { params: { city, limit } });
    return res.data;
  }

  async getAirQualityByPostalCode(postalCode: string, countryCode: string) {
    let res = await this.http.get('/latest/by-postal-code', {
      params: { postalCode, countryCode }
    });
    return res.data;
  }

  async getAirQualityByCountryCode(countryCode: string, limit?: number) {
    let res = await this.http.get('/latest/by-country-code', {
      params: { countryCode, limit }
    });
    return res.data;
  }

  async getAirQualityHistoryByLatLng(lat: number, lng: number, from: string, to: string) {
    let res = await this.http.get('/history/by-lat-lng', { params: { lat, lng, from, to } });
    return res.data;
  }

  async getAirQualityHistoryByPostalCode(
    postalCode: string,
    countryCode: string,
    from: string,
    to: string
  ) {
    let res = await this.http.get('/history/by-postal-code', {
      params: { postalCode, countryCode, from, to }
    });
    return res.data;
  }

  async getAirQualityForecast(lat: number, lng: number) {
    let res = await this.http.get('/forecast/aq/by-lat-lng', { params: { lat, lng } });
    return res.data;
  }

  // ─── Weather ───────────────────────────────────────────────────

  async getWeatherLatest(lat: number, lng: number, units?: string) {
    let res = await this.http.get('/weather/latest/by-lat-lng', {
      params: { lat, lng, units }
    });
    return res.data;
  }

  async getWeatherHistory(lat: number, lng: number, from: string, to: string, units?: string) {
    let res = await this.http.get('/weather/history/by-lat-lng', {
      params: { lat, lng, from, to, units }
    });
    return res.data;
  }

  async getWeatherForecast(lat: number, lng: number, units?: string, filter?: string) {
    let res = await this.http.get('/weather/forecast/by-lat-lng', {
      params: { lat, lng, units, filter }
    });
    return res.data;
  }

  // ─── Pollen ────────────────────────────────────────────────────

  async getPollenByLatLng(lat: number, lng: number, speciesRisk?: boolean) {
    let res = await this.http.get('/latest/pollen/by-lat-lng', {
      params: { lat, lng, speciesRisk }
    });
    return res.data;
  }

  async getPollenByPlace(place: string, speciesRisk?: boolean) {
    let res = await this.http.get('/latest/pollen/by-place', {
      params: { place, speciesRisk }
    });
    return res.data;
  }

  async getPollenHistoryByLatLng(
    lat: number,
    lng: number,
    from: string,
    to: string,
    speciesRisk?: boolean
  ) {
    let res = await this.http.get('/history/pollen/by-lat-lng', {
      params: { lat, lng, from, to, speciesRisk }
    });
    return res.data;
  }

  async getPollenHistoryByPlace(
    place: string,
    from: string,
    to: string,
    speciesRisk?: boolean
  ) {
    let res = await this.http.get('/history/pollen/by-place', {
      params: { place, from, to, speciesRisk }
    });
    return res.data;
  }

  async getPollenForecastByLatLng(lat: number, lng: number, speciesRisk?: boolean) {
    let res = await this.http.get('/forecast/pollen/by-lat-lng', {
      params: { lat, lng, speciesRisk }
    });
    return res.data;
  }

  async getPollenForecastByPlace(place: string, speciesRisk?: boolean) {
    let res = await this.http.get('/forecast/pollen/by-place', {
      params: { place, speciesRisk }
    });
    return res.data;
  }

  // ─── Wildfire ──────────────────────────────────────────────────

  async getWildfireByLatLng(lat: number, lng: number) {
    let res = await this.http.get('/fire/latest/by-lat-lng', { params: { lat, lng } });
    return res.data;
  }

  async getWildfireByPlace(place: string) {
    let res = await this.http.get('/fire/latest/by-place', { params: { place } });
    return res.data;
  }

  async getWildfireRiskByLatLng(lat: number, lng: number) {
    let res = await this.http.get('/fire/risk/by-lat-lng', { params: { lat, lng } });
    return res.data;
  }

  async getWildfireRiskByPlace(place: string) {
    let res = await this.http.get('/fire/risk/by-place', { params: { place } });
    return res.data;
  }

  // ─── Natural Disasters ────────────────────────────────────────

  async getDisastersByLatLng(
    lat: number,
    lng: number,
    params?: { eventType?: string; limit?: number; page?: number }
  ) {
    let res = await this.http.get('/disasters/latest/by-lat-lng', {
      params: { lat, lng, ...params }
    });
    return res.data;
  }

  async getDisastersByContinent(
    continent: string,
    params?: { eventType?: string; limit?: number; page?: number }
  ) {
    let res = await this.http.get('/disasters/latest/by-continent', {
      params: { continent, ...params }
    });
    return res.data;
  }

  async getDisastersByCountryCode(
    countryCode: string,
    params?: { eventType?: string; limit?: number; page?: number }
  ) {
    let res = await this.http.get('/disasters/latest/by-country-code', {
      params: { countryCode, ...params }
    });
    return res.data;
  }

  async getDisastersHistoryByLatLng(
    lat: number,
    lng: number,
    from: string,
    to: string,
    params?: { eventType?: string; limit?: number; page?: number }
  ) {
    let res = await this.http.get('/disasters/history/by-lat-lng', {
      params: { lat, lng, from, to, ...params }
    });
    return res.data;
  }

  async getDisastersHistoryByContinent(
    continent: string,
    from: string,
    to: string,
    params?: { eventType?: string; limit?: number; page?: number }
  ) {
    let res = await this.http.get('/disasters/history/by-continent', {
      params: { continent, from, to, ...params }
    });
    return res.data;
  }

  async getDisastersHistoryByCountryCode(
    countryCode: string,
    from: string,
    to: string,
    params?: { eventType?: string; limit?: number; page?: number }
  ) {
    let res = await this.http.get('/disasters/history/by-country-code', {
      params: { countryCode, from, to, ...params }
    });
    return res.data;
  }

  async getDisasterByEventId(eventId: string, geometry?: boolean) {
    let res = await this.http.get('/disasters/by-eventId', { params: { eventId, geometry } });
    return res.data;
  }

  // ─── Soil ──────────────────────────────────────────────────────

  async getSoilLatest(lat: number, lng: number) {
    let res = await this.http.get('/soil/latest/by-lat-lng', { params: { lat, lng } });
    return res.data;
  }

  async getSoilHistory(lat: number, lng: number, from: string, to: string) {
    let res = await this.http.get('/soil/history/by-lat-lng', {
      params: { lat, lng, from, to }
    });
    return res.data;
  }

  // ─── Water Vapor ───────────────────────────────────────────────

  async getWaterVaporLatest(lat: number, lng: number) {
    let res = await this.http.get('/waterVapor/latest/by-lat-lng', { params: { lat, lng } });
    return res.data;
  }

  async getWaterVaporHistory(lat: number, lng: number, from: string, to: string) {
    let res = await this.http.get('/waterVapor/history/by-lat-lng', {
      params: { lat, lng, from, to }
    });
    return res.data;
  }

  // ─── NDVI / EVI ────────────────────────────────────────────────

  async getNdviLatest(lat: number, lng: number) {
    let res = await this.http.get('/ndvi/latest/by-lat-lng', { params: { lat, lng } });
    return res.data;
  }

  async getNdviHistory(lat: number, lng: number, from: string, to: string) {
    let res = await this.http.get('/ndvi/history/by-lat-lng', {
      params: { lat, lng, from, to }
    });
    return res.data;
  }

  // ─── Elevation ─────────────────────────────────────────────────

  async getElevationByLatLng(lat: number, lng: number) {
    let res = await this.http.get('/elevation/latest/by-lat-lng', { params: { lat, lng } });
    return res.data;
  }

  async getElevationByPlace(place: string) {
    let res = await this.http.get('/elevation/latest/by-place', { params: { place } });
    return res.data;
  }

  // ─── Geocoding ─────────────────────────────────────────────────

  async geocodeByPlace(place: string) {
    let res = await this.http.get('/geocode/by-place', { params: { place } });
    return res.data;
  }

  async reverseGeocodeByLatLng(lat: number, lng: number) {
    let res = await this.http.get('/geocode/reverse/by-lat-lng', { params: { lat, lng } });
    return res.data;
  }
}
