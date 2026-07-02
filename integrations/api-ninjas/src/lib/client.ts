import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.api-ninjas.com'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return { 'X-Api-Key': this.token };
  }

  // ── Finance ──

  async getStockPrice(ticker: string) {
    let res = await api.get('/v1/stockprice', {
      params: { ticker },
      headers: this.headers()
    });
    return res.data;
  }

  async getExchangeRate(pair: string) {
    let res = await api.get('/v1/exchangerate', {
      params: { pair },
      headers: this.headers()
    });
    return res.data;
  }

  async getCommodityPrice(name: string) {
    let res = await api.get('/v1/commodityprice', {
      params: { name },
      headers: this.headers()
    });
    return res.data;
  }

  async getCryptoPrice(symbol: string) {
    let res = await api.get('/v1/cryptoprice', {
      params: { symbol },
      headers: this.headers()
    });
    return res.data;
  }

  // ── Weather & Places ──

  async getWeather(params: Record<string, string | number>) {
    let res = await api.get('/v1/weather', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async getAirQuality(params: Record<string, string | number>) {
    let res = await api.get('/v1/airquality', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async geocode(params: Record<string, string>) {
    let res = await api.get('/v1/geocoding', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async reverseGeocode(params: { lat: number; lon: number }) {
    let res = await api.get('/v1/reversegeocoding', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async getCountry(params: Record<string, string | number>) {
    let res = await api.get('/v1/country', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async getCity(params: Record<string, string | number>) {
    let res = await api.get('/v1/city', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async getWorldTime(params: Record<string, string | number>) {
    let res = await api.get('/v1/worldtime', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  // ── Text Processing ──

  async getDictionary(word: string) {
    let res = await api.get('/v1/dictionary', {
      params: { word },
      headers: this.headers()
    });
    return res.data;
  }

  async getThesaurus(word: string) {
    let res = await api.get('/v1/thesaurus', {
      params: { word },
      headers: this.headers()
    });
    return res.data;
  }

  async getSentiment(text: string) {
    let res = await api.get('/v1/sentiment', {
      params: { text },
      headers: this.headers()
    });
    return res.data;
  }

  async getTextSimilarity(text1: string, text2: string) {
    let res = await api.post(
      '/v1/textsimilarity',
      {
        text_1: text1,
        text_2: text2
      },
      {
        headers: { ...this.headers(), 'Content-Type': 'application/json' }
      }
    );
    return res.data;
  }

  // ── Health & Nutrition ──

  async getNutrition(query: string) {
    let res = await api.get('/v1/nutrition', {
      params: { query },
      headers: this.headers()
    });
    return res.data;
  }

  async getExercises(params: Record<string, string | number>) {
    let res = await api.get('/v1/exercises', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  // ── Entertainment ──

  async getQuotes(params: Record<string, string | number>) {
    let res = await api.get('/v2/quotes', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async getJokes(params?: Record<string, string | number>) {
    let res = await api.get('/v1/jokes', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async getTrivia(params?: Record<string, string | number>) {
    let res = await api.get('/v1/trivia', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async getHistoricalEvents(params: Record<string, string | number>) {
    let res = await api.get('/v1/historicalevents', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async getFacts(params?: Record<string, string | number>) {
    let res = await api.get('/v1/facts', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  // ── Animals ──

  async getAnimals(name: string) {
    let res = await api.get('/v1/animals', {
      params: { name },
      headers: this.headers()
    });
    return res.data;
  }

  // ── Internet & Tech ──

  async getIpLookup(address: string) {
    let res = await api.get('/v1/iplookup', {
      params: { address },
      headers: this.headers()
    });
    return res.data;
  }

  async getDnsLookup(domain: string) {
    let res = await api.get('/v1/dnslookup', {
      params: { domain },
      headers: this.headers()
    });
    return res.data;
  }

  async getWhois(domain: string) {
    let res = await api.get('/v1/whois', {
      params: { domain },
      headers: this.headers()
    });
    return res.data;
  }

  async validateEmail(email: string) {
    let res = await api.get('/v1/emailvalidation', {
      params: { email },
      headers: this.headers()
    });
    return res.data;
  }

  async validatePhone(number: string) {
    let res = await api.get('/v1/validatephone', {
      params: { number },
      headers: this.headers()
    });
    return res.data;
  }

  async urlLookup(url: string) {
    let res = await api.get('/v1/urllookup', {
      params: { url },
      headers: this.headers()
    });
    return res.data;
  }

  // ── Transportation ──

  async getCars(params: Record<string, string | number>) {
    let res = await api.get('/v1/cars', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async getAircraft(params: Record<string, string | number>) {
    let res = await api.get('/v1/aircraft', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  // ── Miscellaneous ──

  async getHolidays(params: Record<string, string | number>) {
    let res = await api.get('/v1/holidays', {
      params,
      headers: this.headers()
    });
    return res.data;
  }

  async convertUnits(params: Record<string, string | number>) {
    let res = await api.get('/v1/convertcurrency', {
      params,
      headers: this.headers()
    });
    return res.data;
  }
}
