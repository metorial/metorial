import { createAxios } from 'slates';

let nasaApi = createAxios({
  baseURL: 'https://api.nasa.gov'
});

let nasaImageApi = createAxios({
  baseURL: 'https://images-api.nasa.gov'
});

let eonetApi = createAxios({
  baseURL: 'https://eonet.gsfc.nasa.gov/api/v3'
});

let tleApi = createAxios({
  baseURL: 'https://tle.ivanstanojevic.me/api/tle'
});

export class NasaClient {
  private token: string;

  constructor(opts: { token: string }) {
    this.token = opts.token;
  }

  private params(
    extra: Record<string, string | number | boolean | undefined> = {}
  ): Record<string, string | number | boolean | undefined> {
    return { api_key: this.token, ...extra };
  }

  // ── APOD ──────────────────────────────────────────────────

  async getApod(
    opts: {
      date?: string;
      startDate?: string;
      endDate?: string;
      count?: number;
      thumbs?: boolean;
    } = {}
  ) {
    let { data } = await nasaApi.get('/planetary/apod', {
      params: this.params({
        date: opts.date,
        start_date: opts.startDate,
        end_date: opts.endDate,
        count: opts.count,
        thumbs: opts.thumbs
      })
    });
    return data;
  }

  // ── NeoWs ─────────────────────────────────────────────────

  async getNeoFeed(opts: { startDate: string; endDate?: string }) {
    let { data } = await nasaApi.get('/neo/rest/v1/feed', {
      params: this.params({
        start_date: opts.startDate,
        end_date: opts.endDate
      })
    });
    return data;
  }

  async getNeoLookup(asteroidId: string) {
    let { data } = await nasaApi.get(`/neo/rest/v1/neo/${asteroidId}`, {
      params: this.params()
    });
    return data;
  }

  async getNeoBrowse(opts: { page?: number; size?: number } = {}) {
    let { data } = await nasaApi.get('/neo/rest/v1/neo/browse', {
      params: this.params({
        page: opts.page,
        size: opts.size
      })
    });
    return data;
  }

  // ── Mars Rover Photos ─────────────────────────────────────

  async getMarsRoverPhotos(opts: {
    rover: string;
    sol?: number;
    earthDate?: string;
    camera?: string;
    page?: number;
  }) {
    let { data } = await nasaApi.get(`/mars-photos/api/v1/rovers/${opts.rover}/photos`, {
      params: this.params({
        sol: opts.sol,
        earth_date: opts.earthDate,
        camera: opts.camera,
        page: opts.page
      })
    });
    return data;
  }

  async getMarsRoverManifest(rover: string) {
    let { data } = await nasaApi.get(`/mars-photos/api/v1/manifests/${rover}`, {
      params: this.params()
    });
    return data;
  }

  // ── EPIC ──────────────────────────────────────────────────

  async getEpicImages(opts: { collection?: string; date?: string } = {}) {
    let collection = opts.collection || 'natural';
    let path = opts.date
      ? `/EPIC/api/${collection}/date/${opts.date}`
      : `/EPIC/api/${collection}`;
    let { data } = await nasaApi.get(path, {
      params: this.params()
    });
    return data;
  }

  async getEpicAvailableDates(collection?: string) {
    let col = collection || 'natural';
    let { data } = await nasaApi.get(`/EPIC/api/${col}/all`, {
      params: this.params()
    });
    return data;
  }

  // ── EONET ─────────────────────────────────────────────────

  async getEonetEvents(
    opts: {
      status?: string;
      limit?: number;
      source?: string;
      category?: string;
      start?: string;
      end?: string;
    } = {}
  ) {
    let { data } = await eonetApi.get('/events', {
      params: {
        status: opts.status,
        limit: opts.limit,
        source: opts.source,
        category: opts.category,
        start: opts.start,
        end: opts.end
      }
    });
    return data;
  }

  async getEonetCategories() {
    let { data } = await eonetApi.get('/categories');
    return data;
  }

  // ── DONKI ─────────────────────────────────────────────────

  async getDonkiEvents(
    eventType: string,
    opts: { startDate?: string; endDate?: string } = {}
  ) {
    let { data } = await nasaApi.get(`/DONKI/${eventType}`, {
      params: this.params({
        startDate: opts.startDate,
        endDate: opts.endDate
      })
    });
    return data;
  }

  // ── Earth Imagery ─────────────────────────────────────────

  async getEarthImagery(opts: { lat: number; lon: number; date?: string; dim?: number }) {
    let { data } = await nasaApi.get('/planetary/earth/imagery', {
      params: this.params({
        lat: opts.lat,
        lon: opts.lon,
        date: opts.date,
        dim: opts.dim
      })
    });
    return data;
  }

  async getEarthAssets(opts: { lat: number; lon: number; date: string; dim?: number }) {
    let { data } = await nasaApi.get('/planetary/earth/assets', {
      params: this.params({
        lat: opts.lat,
        lon: opts.lon,
        date: opts.date,
        dim: opts.dim
      })
    });
    return data;
  }

  // ── NASA Image and Video Library ──────────────────────────

  async searchNasaImages(opts: {
    q?: string;
    center?: string;
    mediaType?: string;
    yearStart?: string;
    yearEnd?: string;
    keywords?: string;
    nasaId?: string;
    page?: number;
  }) {
    let { data } = await nasaImageApi.get('/search', {
      params: {
        q: opts.q,
        center: opts.center,
        media_type: opts.mediaType,
        year_start: opts.yearStart,
        year_end: opts.yearEnd,
        keywords: opts.keywords,
        nasa_id: opts.nasaId,
        page: opts.page
      }
    });
    return data;
  }

  async getNasaImageAsset(nasaId: string) {
    let { data } = await nasaImageApi.get(`/asset/${nasaId}`);
    return data;
  }

  async getNasaImageMetadata(nasaId: string) {
    let { data } = await nasaImageApi.get(`/metadata/${nasaId}`);
    return data;
  }

  // ── TLE ───────────────────────────────────────────────────

  async searchTle(
    opts: { search?: string; satelliteNumber?: number; page?: number; pageSize?: number } = {}
  ) {
    let { data } = await tleApi.get('/', {
      params: {
        search: opts.search,
        'page-size': opts.pageSize,
        page: opts.page
      }
    });
    return data;
  }

  async getTleByNumber(satelliteNumber: number) {
    let { data } = await tleApi.get(`/${satelliteNumber}`);
    return data;
  }

  // ── TechPort ──────────────────────────────────────────────

  async getTechPortProject(projectId: number) {
    let { data } = await nasaApi.get(`/techport/api/projects/${projectId}`, {
      params: this.params()
    });
    return data;
  }

  async searchTechPortProjects(opts: { updatedSince?: string } = {}) {
    let { data } = await nasaApi.get('/techport/api/projects', {
      params: this.params({
        updatedSince: opts.updatedSince
      })
    });
    return data;
  }

  // ── Exoplanet Archive ─────────────────────────────────────

  async queryExoplanetArchive(opts: {
    table: string;
    select?: string;
    where?: string;
    orderBy?: string;
    format?: string;
  }) {
    let { data } = await createAxios({
      baseURL: 'https://exoplanetarchive.ipac.caltech.edu'
    }).get('/TAP/sync', {
      params: {
        query: `SELECT ${opts.select || '*'} FROM ${opts.table}${opts.where ? ` WHERE ${opts.where}` : ''}${opts.orderBy ? ` ORDER BY ${opts.orderBy}` : ''}`,
        format: opts.format || 'json'
      }
    });
    return data;
  }

  // ── SSD/CNEOS ─────────────────────────────────────────────

  async getSsdCloseApproach(
    opts: { dateMin?: string; dateMax?: string; distMax?: string; body?: string } = {}
  ) {
    let { data } = await createAxios({ baseURL: 'https://ssd-api.jpl.nasa.gov' }).get(
      '/cad.api',
      {
        params: {
          'date-min': opts.dateMin,
          'date-max': opts.dateMax,
          'dist-max': opts.distMax,
          body: opts.body
        }
      }
    );
    return data;
  }

  async getSsdFireballs(
    opts: { dateMin?: string; dateMax?: string; minEnergy?: number; reqLoc?: boolean } = {}
  ) {
    let { data } = await createAxios({ baseURL: 'https://ssd-api.jpl.nasa.gov' }).get(
      '/fireball.api',
      {
        params: {
          'date-min': opts.dateMin,
          'date-max': opts.dateMax,
          'min-energy': opts.minEnergy,
          'req-loc': opts.reqLoc
        }
      }
    );
    return data;
  }

  async getSsdSmallBody(opts: { designation?: string; spkId?: number; searchName?: string }) {
    let { data } = await createAxios({ baseURL: 'https://ssd-api.jpl.nasa.gov' }).get(
      '/sbdb.api',
      {
        params: {
          des: opts.designation,
          spk: opts.spkId,
          sstr: opts.searchName
        }
      }
    );
    return data;
  }
}
