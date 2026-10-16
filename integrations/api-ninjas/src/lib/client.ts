import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

type Query = Record<string, unknown>;

export class Client {
  private api;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('Connect an API Ninjas API key before making a request.');
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.api-ninjas.com',
      authHeader: { name: 'X-Api-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'API Ninjas',
          reason: 'api_ninjas_request_failed',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
  }

  private async get(path: string, params?: Query) {
    let response = await this.api.get(path, { params });
    let data: unknown = response.data;
    if (
      Array.isArray(data)
        ? data.some(item => !isApiErrorRecord(item))
        : !isApiErrorRecord(data)
    ) {
      throw createApiServiceError(
        'API Ninjas returned an unexpected response. Retry the request.'
      );
    }
    return response.data;
  }

  getStockPrice(ticker: string) {
    return this.get('/v1/stockprice', { ticker });
  }
  getExchangeRate(pair: string) {
    return this.get('/v1/exchangerate', { pair });
  }
  getCommodityPrice(name: string, params?: Query) {
    return this.get('/v1/commodityprice', { ...params, name });
  }
  getCryptoPrice(symbol: string) {
    return this.get('/v1/cryptoprice', { symbol });
  }
  getWeather(params: Query) {
    return this.get('/v1/weather', params);
  }
  getWeatherForecast(params: Query) {
    return this.get('/v1/weatherforecast', params);
  }
  getAirQuality(params: Query) {
    return this.get('/v1/airquality', params);
  }
  geocode(params: Query) {
    return this.get('/v1/geocoding', params);
  }
  reverseGeocode(params: { lat: number; lon: number }) {
    return this.get('/v1/reversegeocoding', params);
  }
  getCountry(params: Query) {
    return this.get('/v1/country', params);
  }
  getCity(params: Query) {
    return this.get('/v1/city', params);
  }
  getWorldTime(params: Query) {
    return this.get('/v1/worldtime', params);
  }
  getDictionary(word: string) {
    return this.get('/v1/dictionary', { word });
  }
  getThesaurus(word: string) {
    return this.get('/v1/thesaurus', { word });
  }
  getSentiment(text: string) {
    return this.get('/v1/sentiment', { text });
  }

  async getTextSimilarity(text1: string, text2: string) {
    let response = await this.api.post('/v1/textsimilarity', { text_1: text1, text_2: text2 });
    return response.data;
  }

  getNutrition(query: string) {
    return this.get('/v1/nutrition', { query });
  }
  getExercises(params: Query) {
    return this.get('/v1/exercises', params);
  }
  getQuotes(params: Query) {
    return this.get('/v2/quotes', params);
  }
  getJokes(params?: Query) {
    return this.get('/v1/jokes', params);
  }
  getTrivia(params?: Query) {
    return this.get('/v1/trivia', params);
  }
  getHistoricalEvents(params: Query) {
    return this.get('/v1/historicalevents', params);
  }
  getFacts(params?: Query) {
    return this.get('/v1/facts', params);
  }
  getAnimals(name: string) {
    return this.get('/v1/animals', { name });
  }
  getIpLookup(address: string) {
    return this.get('/v1/iplookup', { address });
  }
  getDnsLookup(domain: string) {
    return this.get('/v1/dnslookup', { domain });
  }
  getWhois(domain: string) {
    return this.get('/v1/whois', { domain });
  }
  validateEmail(email: string) {
    return this.get('/v1/validateemail', { email });
  }
  validatePhone(number: string, country?: string) {
    return this.get('/v1/validatephone', { number, country });
  }
  urlLookup(url: string) {
    return this.get('/v1/urllookup', { url });
  }
  getCars(params: Query) {
    return this.get('/v1/cars', params);
  }
  getAircraft(params: Query) {
    return this.get('/v1/aircraft', params);
  }
  getHolidays(params: Query) {
    return this.get('/v2/holidays', params);
  }
  convertCurrency(params: Query) {
    return this.get('/v1/convertcurrency', params);
  }
}
