import { createAxios } from 'slates';

export class CensusDataClient {
  private apiKey: string;
  private http;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.http = createAxios({
      baseURL: 'https://api.census.gov/data'
    });
  }

  async queryData(params: {
    dataset: string;
    vintage?: string;
    variables: string[];
    forGeo: string;
    inGeo?: string;
    predicates?: Record<string, string>;
  }): Promise<string[][]> {
    let basePath = params.vintage
      ? `/${params.vintage}/${params.dataset}`
      : `/${params.dataset}`;

    let queryParams: Record<string, string> = {
      get: params.variables.join(','),
      for: params.forGeo
    };

    if (params.inGeo) {
      queryParams.in = params.inGeo;
    }

    if (this.apiKey) {
      queryParams.key = this.apiKey;
    }

    if (params.predicates) {
      for (let [key, value] of Object.entries(params.predicates)) {
        queryParams[key] = value;
      }
    }

    let response = await this.http.get(basePath, { params: queryParams });
    return response.data;
  }

  async listDatasets(params?: { vintage?: string; keyword?: string }): Promise<any> {
    let path = params?.vintage ? `/${params.vintage}.json` : '.json';
    let response = await this.http.get(path);
    let datasets = response.data?.dataset || [];

    if (params?.keyword) {
      let keyword = params.keyword.toLowerCase();
      datasets = datasets.filter(
        (ds: any) =>
          (ds.title || '').toLowerCase().includes(keyword) ||
          (ds.description || '').toLowerCase().includes(keyword)
      );
    }

    return datasets;
  }

  async getDatasetVariables(params: { dataset: string; vintage?: string }): Promise<any> {
    let basePath = params.vintage
      ? `/${params.vintage}/${params.dataset}/variables.json`
      : `/${params.dataset}/variables.json`;

    let response = await this.http.get(basePath);
    return response.data?.variables || {};
  }

  async getDatasetGroups(params: { dataset: string; vintage?: string }): Promise<any> {
    let basePath = params.vintage
      ? `/${params.vintage}/${params.dataset}/groups.json`
      : `/${params.dataset}/groups.json`;

    let response = await this.http.get(basePath);
    return response.data?.groups || [];
  }

  async getGroupVariables(params: {
    dataset: string;
    vintage?: string;
    groupId: string;
  }): Promise<any> {
    let basePath = params.vintage
      ? `/${params.vintage}/${params.dataset}/groups/${params.groupId}.json`
      : `/${params.dataset}/groups/${params.groupId}.json`;

    let response = await this.http.get(basePath);
    return response.data?.variables || {};
  }

  async getDatasetGeography(params: { dataset: string; vintage?: string }): Promise<any> {
    let basePath = params.vintage
      ? `/${params.vintage}/${params.dataset}/geography.json`
      : `/${params.dataset}/geography.json`;

    let response = await this.http.get(basePath);
    return response.data?.fips || [];
  }
}

export class GeocoderClient {
  private http;

  constructor() {
    this.http = createAxios({
      baseURL: 'https://geocoding.geo.census.gov/geocoder'
    });
  }

  async geocodeAddress(params: {
    street: string;
    city?: string;
    state?: string;
    zip?: string;
    benchmark?: string;
    vintage?: string;
    returnType?: 'locations' | 'geographies';
  }): Promise<any> {
    let endpoint =
      params.returnType === 'geographies' ? '/geographies/address' : '/locations/address';

    let queryParams: Record<string, string> = {
      street: params.street,
      benchmark: params.benchmark || 'Public_AR_Current',
      format: 'json'
    };

    if (params.city) queryParams.city = params.city;
    if (params.state) queryParams.state = params.state;
    if (params.zip) queryParams.zip = params.zip;

    if (params.returnType === 'geographies') {
      queryParams.vintage = params.vintage || 'Current_Current';
    }

    let response = await this.http.get(endpoint, { params: queryParams });
    return response.data?.result || response.data;
  }

  async geocodeOneLineAddress(params: {
    address: string;
    benchmark?: string;
    vintage?: string;
    returnType?: 'locations' | 'geographies';
  }): Promise<any> {
    let endpoint =
      params.returnType === 'geographies'
        ? '/geographies/onelineaddress'
        : '/locations/onelineaddress';

    let queryParams: Record<string, string> = {
      address: params.address,
      benchmark: params.benchmark || 'Public_AR_Current',
      format: 'json'
    };

    if (params.returnType === 'geographies') {
      queryParams.vintage = params.vintage || 'Current_Current';
    }

    let response = await this.http.get(endpoint, { params: queryParams });
    return response.data?.result || response.data;
  }

  async reverseGeocode(params: {
    longitude: number;
    latitude: number;
    benchmark?: string;
    vintage?: string;
    returnType?: 'locations' | 'geographies';
  }): Promise<any> {
    let endpoint =
      params.returnType === 'geographies'
        ? '/geographies/coordinates'
        : '/locations/coordinates';

    let queryParams: Record<string, string> = {
      x: params.longitude.toString(),
      y: params.latitude.toString(),
      benchmark: params.benchmark || 'Public_AR_Current',
      format: 'json'
    };

    if (params.returnType === 'geographies') {
      queryParams.vintage = params.vintage || 'Current_Current';
    }

    let response = await this.http.get(endpoint, { params: queryParams });
    return response.data?.result || response.data;
  }

  async getBenchmarks(): Promise<any> {
    let response = await this.http.get('/benchmarks', { params: { format: 'json' } });
    return response.data?.benchmarks || response.data;
  }

  async getVintages(benchmark: string): Promise<any> {
    let response = await this.http.get('/vintages', {
      params: { benchmark, format: 'json' }
    });
    return response.data?.vintages || response.data;
  }
}

export class TigerwebClient {
  private http;

  constructor() {
    this.http = createAxios({
      baseURL: 'https://tigerweb.geo.census.gov/arcgis/rest/services'
    });
  }

  async queryLayer(params: {
    serviceName: string;
    layerId: number;
    where?: string;
    geometry?: string;
    geometryType?: string;
    spatialRel?: string;
    outFields?: string;
    returnGeometry?: boolean;
    resultRecordCount?: number;
  }): Promise<any> {
    let queryParams: Record<string, string> = {
      where: params.where || '1=1',
      outFields: params.outFields || '*',
      returnGeometry: (params.returnGeometry !== false).toString(),
      f: 'json'
    };

    if (params.geometry) {
      queryParams.geometry = params.geometry;
      queryParams.geometryType = params.geometryType || 'esriGeometryPoint';
      queryParams.spatialRel = params.spatialRel || 'esriSpatialRelIntersects';
    }

    if (params.resultRecordCount) {
      queryParams.resultRecordCount = params.resultRecordCount.toString();
    }

    let response = await this.http.get(
      `/${params.serviceName}/MapServer/${params.layerId}/query`,
      { params: queryParams }
    );
    return response.data;
  }

  async getServiceInfo(serviceName: string): Promise<any> {
    let response = await this.http.get(`/${serviceName}/MapServer`, {
      params: { f: 'json' }
    });
    return response.data;
  }

  async getLayerInfo(serviceName: string, layerId: number): Promise<any> {
    let response = await this.http.get(`/${serviceName}/MapServer/${layerId}`, {
      params: { f: 'json' }
    });
    return response.data;
  }
}
