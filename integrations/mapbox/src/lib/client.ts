import { createAxios } from 'slates';

export class MapboxClient {
  private http: ReturnType<typeof createAxios>;
  private token: string;
  private username: string;

  constructor(config: { token: string; username: string }) {
    this.token = config.token;
    this.username = config.username;
    this.http = createAxios({
      baseURL: 'https://api.mapbox.com'
    });
  }

  private params(extra?: Record<string, any>): Record<string, any> {
    return { access_token: this.token, ...extra };
  }

  // ── Styles API ──

  async listStyles(options?: { sortby?: string; limit?: number }) {
    let response = await this.http.get(`/styles/v1/${this.username}`, {
      params: this.params({
        sortby: options?.sortby,
        limit: options?.limit
      })
    });
    return response.data;
  }

  async getStyle(styleId: string, options?: { draft?: boolean }) {
    let url = `/styles/v1/${this.username}/${styleId}`;
    if (options?.draft) url += '/draft';
    let response = await this.http.get(url, {
      params: this.params()
    });
    return response.data;
  }

  async createStyle(style: Record<string, any>) {
    let response = await this.http.post(`/styles/v1/${this.username}`, style, {
      params: this.params()
    });
    return response.data;
  }

  async updateStyle(styleId: string, style: Record<string, any>) {
    let response = await this.http.patch(`/styles/v1/${this.username}/${styleId}`, style, {
      params: this.params()
    });
    return response.data;
  }

  async deleteStyle(styleId: string) {
    await this.http.delete(`/styles/v1/${this.username}/${styleId}`, {
      params: this.params()
    });
  }

  // ── Datasets API ──

  async listDatasets(options?: { limit?: number }) {
    let response = await this.http.get(`/datasets/v1/${this.username}`, {
      params: this.params({ limit: options?.limit })
    });
    return response.data;
  }

  async getDataset(datasetId: string) {
    let response = await this.http.get(`/datasets/v1/${this.username}/${datasetId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createDataset(data: { name?: string; description?: string }) {
    let response = await this.http.post(`/datasets/v1/${this.username}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async updateDataset(datasetId: string, data: { name?: string; description?: string }) {
    let response = await this.http.patch(`/datasets/v1/${this.username}/${datasetId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteDataset(datasetId: string) {
    await this.http.delete(`/datasets/v1/${this.username}/${datasetId}`, {
      params: this.params()
    });
  }

  async listFeatures(datasetId: string, options?: { limit?: number; start?: string }) {
    let response = await this.http.get(`/datasets/v1/${this.username}/${datasetId}/features`, {
      params: this.params({ limit: options?.limit, start: options?.start })
    });
    return response.data;
  }

  async getFeature(datasetId: string, featureId: string) {
    let response = await this.http.get(
      `/datasets/v1/${this.username}/${datasetId}/features/${featureId}`,
      { params: this.params() }
    );
    return response.data;
  }

  async upsertFeature(datasetId: string, featureId: string, feature: Record<string, any>) {
    let response = await this.http.put(
      `/datasets/v1/${this.username}/${datasetId}/features/${featureId}`,
      feature,
      { params: this.params() }
    );
    return response.data;
  }

  async deleteFeature(datasetId: string, featureId: string) {
    await this.http.delete(
      `/datasets/v1/${this.username}/${datasetId}/features/${featureId}`,
      { params: this.params() }
    );
  }

  // ── Geocoding API ──

  async forwardGeocode(
    searchText: string,
    options?: {
      autocomplete?: boolean;
      bbox?: string;
      country?: string;
      language?: string;
      limit?: number;
      proximity?: string;
      types?: string;
      fuzzyMatch?: boolean;
      worldview?: string;
      endpoint?: string;
    }
  ) {
    let endpoint = options?.endpoint || 'mapbox.places';
    let response = await this.http.get(
      `/geocoding/v5/${endpoint}/${encodeURIComponent(searchText)}.json`,
      {
        params: this.params({
          autocomplete: options?.autocomplete,
          bbox: options?.bbox,
          country: options?.country,
          language: options?.language,
          limit: options?.limit,
          proximity: options?.proximity,
          types: options?.types,
          fuzzyMatch: options?.fuzzyMatch,
          worldview: options?.worldview
        })
      }
    );
    return response.data;
  }

  async reverseGeocode(
    longitude: number,
    latitude: number,
    options?: {
      country?: string;
      language?: string;
      limit?: number;
      types?: string;
      worldview?: string;
      endpoint?: string;
    }
  ) {
    let endpoint = options?.endpoint || 'mapbox.places';
    let response = await this.http.get(
      `/geocoding/v5/${endpoint}/${longitude},${latitude}.json`,
      {
        params: this.params({
          country: options?.country,
          language: options?.language,
          limit: options?.limit,
          types: options?.types,
          worldview: options?.worldview
        })
      }
    );
    return response.data;
  }

  // ── Directions API ──

  async getDirections(
    profile: string,
    coordinates: string,
    options?: {
      alternatives?: boolean;
      geometries?: string;
      overview?: string;
      steps?: boolean;
      language?: string;
      annotations?: string;
      bannerInstructions?: boolean;
      voiceInstructions?: boolean;
      exclude?: string;
      waypoints?: string;
    }
  ) {
    let response = await this.http.get(`/directions/v5/mapbox/${profile}/${coordinates}`, {
      params: this.params({
        alternatives: options?.alternatives,
        geometries: options?.geometries || 'geojson',
        overview: options?.overview || 'full',
        steps: options?.steps,
        language: options?.language,
        annotations: options?.annotations,
        banner_instructions: options?.bannerInstructions,
        voice_instructions: options?.voiceInstructions,
        exclude: options?.exclude,
        waypoints: options?.waypoints
      })
    });
    return response.data;
  }

  // ── Static Images API ──

  getStaticImageUrl(options: {
    styleId: string;
    longitude: number;
    latitude: number;
    zoom: number;
    width: number;
    height: number;
    bearing?: number;
    pitch?: number;
    retina?: boolean;
    overlay?: string;
    styleOwner?: string;
    padding?: string;
    attribution?: boolean;
    logo?: boolean;
  }): string {
    let owner = options.styleOwner || this.username;
    let bearing = options.bearing ?? 0;
    let pitch = options.pitch ?? 0;
    let retinaStr = options.retina ? '@2x' : '';
    let overlayPart = options.overlay || '';
    let overlaySegment = overlayPart ? `${overlayPart}/` : '';
    let params = new URLSearchParams();
    params.set('access_token', this.token);
    if (options.attribution === false) params.set('attribution', 'false');
    if (options.logo === false) params.set('logo', 'false');
    if (options.padding) params.set('padding', options.padding);
    return `https://api.mapbox.com/styles/v1/${owner}/${options.styleId}/static/${overlaySegment}${options.longitude},${options.latitude},${options.zoom},${bearing},${pitch}/${options.width}x${options.height}${retinaStr}?${params.toString()}`;
  }

  // ── Isochrone API ──

  async getIsochrone(
    profile: string,
    longitude: number,
    latitude: number,
    options: {
      contoursMinutes?: string;
      contoursMeters?: string;
      contoursColors?: string;
      polygons?: boolean;
      denoise?: number;
      generalize?: number;
    }
  ) {
    let response = await this.http.get(
      `/isochrone/v1/mapbox/${profile}/${longitude},${latitude}`,
      {
        params: this.params({
          contours_minutes: options.contoursMinutes,
          contours_meters: options.contoursMeters,
          contours_colors: options.contoursColors,
          polygons: options.polygons,
          denoise: options.denoise,
          generalize: options.generalize
        })
      }
    );
    return response.data;
  }

  // ── Matrix API ──

  async getMatrix(
    profile: string,
    coordinates: string,
    options?: {
      sources?: string;
      destinations?: string;
      annotations?: string;
      fallbackSpeed?: number;
    }
  ) {
    let response = await this.http.get(
      `/directions-matrix/v1/mapbox/${profile}/${coordinates}`,
      {
        params: this.params({
          sources: options?.sources,
          destinations: options?.destinations,
          annotations: options?.annotations || 'duration,distance',
          fallback_speed: options?.fallbackSpeed
        })
      }
    );
    return response.data;
  }

  // ── Map Matching API ──

  async matchTrace(
    profile: string,
    coordinates: string,
    options?: {
      geometries?: string;
      overview?: string;
      steps?: boolean;
      annotations?: string;
      timestamps?: string;
      radiuses?: string;
      tidy?: boolean;
      language?: string;
    }
  ) {
    let response = await this.http.get(`/matching/v5/mapbox/${profile}/${coordinates}`, {
      params: this.params({
        geometries: options?.geometries || 'geojson',
        overview: options?.overview || 'full',
        steps: options?.steps,
        annotations: options?.annotations,
        timestamps: options?.timestamps,
        radiuses: options?.radiuses,
        tidy: options?.tidy,
        language: options?.language
      })
    });
    return response.data;
  }

  // ── Optimization API ──

  async getOptimizedTrip(
    profile: string,
    coordinates: string,
    options?: {
      geometries?: string;
      overview?: string;
      steps?: boolean;
      annotations?: string;
      language?: string;
      source?: string;
      destination?: string;
      roundtrip?: boolean;
      distributions?: string;
    }
  ) {
    let response = await this.http.get(
      `/optimized-trips/v1/mapbox/${profile}/${coordinates}`,
      {
        params: this.params({
          geometries: options?.geometries || 'geojson',
          overview: options?.overview || 'full',
          steps: options?.steps,
          annotations: options?.annotations,
          language: options?.language,
          source: options?.source,
          destination: options?.destination,
          roundtrip: options?.roundtrip,
          distributions: options?.distributions
        })
      }
    );
    return response.data;
  }

  // ── Tilequery API ──

  async tilequery(
    tilesetId: string,
    longitude: number,
    latitude: number,
    options?: {
      radius?: number;
      limit?: number;
      layers?: string;
      dedupe?: boolean;
      geometry?: string;
    }
  ) {
    let response = await this.http.get(
      `/v4/${tilesetId}/tilequery/${longitude},${latitude}.json`,
      {
        params: this.params({
          radius: options?.radius,
          limit: options?.limit,
          layers: options?.layers,
          dedupe: options?.dedupe,
          geometry: options?.geometry
        })
      }
    );
    return response.data;
  }

  // ── Tokens API ──

  async listTokens() {
    let response = await this.http.get(`/tokens/v2/${this.username}`, {
      params: this.params()
    });
    return response.data;
  }

  async createToken(data: { note?: string; scopes: string[]; allowedUrls?: string[] }) {
    let response = await this.http.post(`/tokens/v2/${this.username}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async updateToken(
    tokenId: string,
    data: {
      note?: string;
      scopes?: string[];
      allowedUrls?: string[];
    }
  ) {
    let response = await this.http.patch(`/tokens/v2/${this.username}/${tokenId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteToken(tokenId: string) {
    await this.http.delete(`/tokens/v2/${this.username}/${tokenId}`, {
      params: this.params()
    });
  }

  async validateToken(tokenToValidate?: string) {
    let response = await this.http.get('/tokens/v2', {
      params: { access_token: tokenToValidate || this.token }
    });
    return response.data;
  }

  async listScopes() {
    let response = await this.http.get(`/scopes/v1/${this.username}`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Uploads API ──

  async listUploads(options?: { reverse?: boolean; limit?: number }) {
    let response = await this.http.get(`/uploads/v1/${this.username}`, {
      params: this.params({
        reverse: options?.reverse,
        limit: options?.limit
      })
    });
    return response.data;
  }

  async getUpload(uploadId: string) {
    let response = await this.http.get(`/uploads/v1/${this.username}/${uploadId}`, {
      params: this.params()
    });
    return response.data;
  }

  async getUploadCredentials() {
    let response = await this.http.post(`/uploads/v1/${this.username}/credentials`, null, {
      params: this.params()
    });
    return response.data;
  }

  async createUpload(data: { tileset: string; url: string; name?: string }) {
    let response = await this.http.post(`/uploads/v1/${this.username}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteUpload(uploadId: string) {
    await this.http.delete(`/uploads/v1/${this.username}/${uploadId}`, {
      params: this.params()
    });
  }

  // ── Tilesets API ──

  async listTilesets(options?: {
    type?: string;
    visibility?: string;
    sortby?: string;
    limit?: number;
  }) {
    let response = await this.http.get(`/tilesets/v1/${this.username}`, {
      params: this.params({
        type: options?.type,
        visibility: options?.visibility,
        sortby: options?.sortby,
        limit: options?.limit
      })
    });
    return response.data;
  }

  async getTilesetMetadata(tilesetId: string) {
    let response = await this.http.get(`/v4/${tilesetId}.json`, {
      params: this.params()
    });
    return response.data;
  }

  async deleteTileset(tilesetId: string) {
    await this.http.delete(`/tilesets/v1/${tilesetId}`, {
      params: this.params()
    });
  }

  async getTilesetRecipe(tilesetId: string) {
    let response = await this.http.get(`/tilesets/v1/${tilesetId}/recipe`, {
      params: this.params()
    });
    return response.data;
  }

  async publishTileset(tilesetId: string) {
    let response = await this.http.post(`/tilesets/v1/${tilesetId}/publish`, null, {
      params: this.params()
    });
    return response.data;
  }

  async listTilesetJobs(tilesetId: string, options?: { stage?: string; limit?: number }) {
    let response = await this.http.get(`/tilesets/v1/${tilesetId}/jobs`, {
      params: this.params({
        stage: options?.stage,
        limit: options?.limit
      })
    });
    return response.data;
  }

  // ── Fonts API ──

  async listFonts() {
    let response = await this.http.get(`/fonts/v1/${this.username}`, {
      params: this.params()
    });
    return response.data;
  }
}
