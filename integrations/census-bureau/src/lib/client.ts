import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  extractApiErrorMessage,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let errorDetails = {
  detailKeys: ['message', 'detail', 'error_description', 'code'],
  nestedKeys: ['error', 'errors', 'details']
};

let createCensusHttp = (baseURL: string) =>
  createAxios({
    baseURL,
    timeout: 30000,
    errorMapping: {
      mapAxiosError: (error, inferred) => ({
        ...inferred,
        message: extractApiErrorMessage(error, errorDetails)
      })
    }
  });

let requestJson = async <T>(
  http: ReturnType<typeof createAxios>,
  path: string,
  schema: z.ZodType<T>,
  providerLabel: string,
  params?: Record<string, string>
): Promise<T> => {
  let data = await requestAxiosData<unknown>(
    path,
    () => http.get(path, { params }),
    (error, operation) =>
      buildApiServiceError(error, {
        providerLabel,
        operation,
        reason: 'provider_request_failed',
        ...errorDetails
      })
  );

  if (
    isApiErrorRecord(data) &&
    (data.error || (Array.isArray(data.errors) && data.errors.length > 0))
  ) {
    throw buildApiServiceError(
      { response: { status: 200, data } },
      { providerLabel, operation: path, reason: 'provider_request_failed', ...errorDetails }
    );
  }

  let parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw createApiServiceError(`${providerLabel} returned an unexpected response.`, {
      reason: 'invalid_provider_response'
    });
  }
  return parsed.data;
};

let datasetSchema = z.looseObject({
  title: z.string().optional(),
  description: z.string().optional(),
  c_dataset: z.array(z.string()).optional(),
  c_vintage: z.union([z.string(), z.number()]).optional(),
  modified: z.string().optional(),
  distribution: z
    .array(
      z.looseObject({
        accessURL: z.string().optional(),
        format: z.string().optional(),
        '@type': z.string().optional()
      })
    )
    .optional()
});
let variableSchema = z.looseObject({
  label: z.string().optional(),
  concept: z.string().optional(),
  predicateType: z.string().optional(),
  group: z.string().optional(),
  required: z.string().optional(),
  predicateOnly: z.boolean().optional(),
  attributes: z.string().optional()
});
let variablesSchema = z.object({ variables: z.record(z.string(), variableSchema) });
let groupSchema = z.looseObject({
  name: z.string(),
  description: z.string().optional(),
  variables: z.union([z.string(), z.record(z.string(), z.unknown())]).optional()
});
let geographySchema = z.looseObject({
  name: z.string(),
  geoLevelDisplay: z.string().optional(),
  referenceDate: z.string().optional(),
  requires: z.array(z.string()).optional(),
  wildcard: z.union([z.string(), z.array(z.string())]).optional(),
  optionalWithWCFor: z.union([z.string(), z.array(z.string())]).optional()
});

let datasetPath = (dataset: string, vintage?: string) => {
  let parts = dataset.split('/');
  if (
    parts.some(part => !part || !/^[A-Za-z0-9_-]+$/.test(part)) ||
    (vintage !== undefined && !/^\d{4}$/.test(vintage))
  ) {
    throw createApiServiceError(
      'Use a dataset path from Discover Datasets and a four-digit vintage year when needed.'
    );
  }
  return `/${vintage ? `${vintage}/` : ''}${parts.join('/')}`;
};

export class CensusDataClient {
  private http = createCensusHttp('https://api.census.gov');

  constructor(private apiKey?: string) {}

  async queryData(params: {
    dataset: string;
    vintage?: string;
    variables: string[];
    forGeo: string;
    inGeo?: string;
    predicates?: Record<string, string>;
  }): Promise<(string | null)[][]> {
    if (!this.apiKey?.trim()) {
      throw createApiServiceError(
        'Connect a Census Bureau API key to query statistical data. Keys are available free of charge at https://api.census.gov/data/key_signup.html.'
      );
    }
    if (
      params.variables.length === 0 ||
      params.variables.some(variable => !variable.trim()) ||
      params.variables.join(',').split(',').length > 50
    ) {
      throw createApiServiceError(
        'Request between 1 and 50 variable names. Use group(TABLE_ID) to retrieve an entire table.'
      );
    }
    if (!params.forGeo.trim()) {
      throw createApiServiceError('Provide a forGeography clause, such as state:* or us:1.');
    }
    let reserved = ['get', 'for', 'in', 'key', 'outputFormat'];
    if (Object.keys(params.predicates ?? {}).some(key => reserved.includes(key))) {
      throw createApiServiceError(
        'Use the dedicated variables and geography fields. Predicates cannot override get, for, in, key, or outputFormat.'
      );
    }
    let queryParams: Record<string, string> = {
      ...params.predicates,
      get: params.variables.join(','),
      for: params.forGeo,
      key: this.apiKey
    };
    if (params.inGeo) queryParams.in = params.inGeo;
    let path = `/data${datasetPath(params.dataset, params.vintage)}`;
    let response = await requestJson(
      this.http,
      path,
      z.union([z.array(z.array(z.string().nullable())), z.literal('')]),
      'Census Data',
      queryParams
    );
    if (response === '') return [];
    if (response[0]?.some(header => header === null)) {
      throw createApiServiceError('Census Data returned an invalid header row.', {
        reason: 'invalid_provider_response'
      });
    }
    return response;
  }

  async listDatasets(params?: { vintage?: string; keyword?: string }) {
    if (params?.vintage !== undefined && !/^\d{4}$/.test(params.vintage)) {
      throw createApiServiceError('Use a four-digit vintage year.');
    }
    let path = params?.vintage ? `/data/${params.vintage}.json` : '/data.json';
    let response = await requestJson(
      this.http,
      path,
      z.object({ dataset: z.array(datasetSchema) }),
      'Census Data'
    );
    let datasets = response.dataset;
    if (params?.keyword) {
      let keyword = params.keyword.toLowerCase();
      datasets = datasets.filter(
        ds =>
          (ds.title || '').toLowerCase().includes(keyword) ||
          (ds.description || '').toLowerCase().includes(keyword)
      );
    }
    return datasets;
  }

  async getDatasetVariables(params: { dataset: string; vintage?: string }) {
    let response = await requestJson(
      this.http,
      `/data${datasetPath(params.dataset, params.vintage)}/variables.json`,
      variablesSchema,
      'Census Data'
    );
    return response.variables;
  }

  async getDatasetGroups(params: { dataset: string; vintage?: string }) {
    let response = await requestJson(
      this.http,
      `/data${datasetPath(params.dataset, params.vintage)}/groups.json`,
      z.object({ groups: z.array(groupSchema) }),
      'Census Data'
    );
    return response.groups;
  }

  async getGroupVariables(params: { dataset: string; vintage?: string; groupId: string }) {
    if (!/^[A-Za-z0-9_-]+$/.test(params.groupId)) {
      throw createApiServiceError('Use a group ID returned by Lookup Variables.');
    }
    let response = await requestJson(
      this.http,
      `/data${datasetPath(params.dataset, params.vintage)}/groups/${params.groupId}.json`,
      variablesSchema,
      'Census Data'
    );
    return response.variables;
  }

  async getDatasetGeography(params: { dataset: string; vintage?: string }) {
    let response = await requestJson(
      this.http,
      `/data${datasetPath(params.dataset, params.vintage)}/geography.json`,
      z.object({ fips: z.array(geographySchema) }),
      'Census Data'
    );
    return response.fips;
  }
}

let geographiesSchema = z.record(z.string(), z.array(z.record(z.string(), z.unknown())));
let coordinateSchema = z.object({ x: z.number(), y: z.number() });
let matchSchema = z.looseObject({
  matchedAddress: z.string().optional(),
  coordinates: coordinateSchema.optional(),
  tigerLine: z
    .object({ tigerLineId: z.string().optional(), side: z.string().optional() })
    .optional(),
  addressComponents: z.record(z.string(), z.string()).optional(),
  geographies: geographiesSchema.optional()
});
let geocoderResultSchema = z.looseObject({
  input: z
    .looseObject({
      address: z.record(z.string(), z.string()).optional(),
      location: coordinateSchema.optional()
    })
    .optional(),
  addressMatches: z.array(matchSchema).optional(),
  geographies: geographiesSchema.optional()
});
let benchmarkSchema = z.object({
  id: z.string(),
  benchmarkName: z.string(),
  benchmarkDescription: z.string().optional(),
  isDefault: z.boolean().optional()
});
let vintageSchema = z.object({
  id: z.string(),
  vintageName: z.string(),
  vintageDescription: z.string().optional(),
  isDefault: z.boolean().optional()
});

export class GeocoderClient {
  private http = createCensusHttp('https://geocoding.geo.census.gov/geocoder');

  private async resolveVintage(benchmark: string | undefined, vintage: string | undefined) {
    if (vintage) return vintage;
    if (!benchmark || benchmark === 'Public_AR_Current') return 'Current_Current';
    let vintages = await this.getVintages(benchmark);
    let defaultVintage = vintages.find(vintage => vintage.isDefault);
    if (!defaultVintage) {
      throw createApiServiceError(
        'Choose a compatible vintage from Get Geocoder Options for the selected benchmark.'
      );
    }
    return defaultVintage.vintageName;
  }

  private async geocode(endpoint: string, params: Record<string, string>) {
    let response = await requestJson(
      this.http,
      endpoint,
      z.object({ result: geocoderResultSchema }),
      'Census Geocoder',
      params
    );
    return response.result;
  }

  async geocodeAddress(params: {
    street: string;
    city?: string;
    state?: string;
    zip?: string;
    benchmark?: string;
    vintage?: string;
    returnType?: 'locations' | 'geographies';
  }) {
    if (!params.zip?.trim() && !(params.city?.trim() && params.state?.trim())) {
      throw createApiServiceError(
        'Provide a street and ZIP code, or a street, city, and state.'
      );
    }
    let queryParams: Record<string, string> = {
      street: params.street,
      benchmark: params.benchmark || 'Public_AR_Current',
      format: 'json'
    };
    if (params.city) queryParams.city = params.city;
    if (params.state) queryParams.state = params.state;
    if (params.zip) queryParams.zip = params.zip;
    if (params.returnType === 'geographies')
      queryParams.vintage = await this.resolveVintage(params.benchmark, params.vintage);
    return this.geocode(`/${params.returnType || 'locations'}/address`, queryParams);
  }

  async geocodeOneLineAddress(params: {
    address: string;
    benchmark?: string;
    vintage?: string;
    returnType?: 'locations' | 'geographies';
  }) {
    let queryParams: Record<string, string> = {
      address: params.address,
      benchmark: params.benchmark || 'Public_AR_Current',
      format: 'json'
    };
    if (params.returnType === 'geographies')
      queryParams.vintage = await this.resolveVintage(params.benchmark, params.vintage);
    return this.geocode(`/${params.returnType || 'locations'}/onelineaddress`, queryParams);
  }

  async reverseGeocode(params: {
    longitude: number;
    latitude: number;
    benchmark?: string;
    vintage?: string;
  }) {
    return this.geocode('/geographies/coordinates', {
      x: params.longitude.toString(),
      y: params.latitude.toString(),
      benchmark: params.benchmark || 'Public_AR_Current',
      vintage: await this.resolveVintage(params.benchmark, params.vintage),
      format: 'json'
    });
  }

  async getBenchmarks() {
    let response = await requestJson(
      this.http,
      '/benchmarks',
      z.object({ benchmarks: z.array(benchmarkSchema) }),
      'Census Geocoder',
      { format: 'json' }
    );
    return response.benchmarks;
  }

  async getVintages(benchmark: string) {
    let benchmarkId = benchmark;
    if (!/^\d+$/.test(benchmark)) {
      let benchmarks = await this.getBenchmarks();
      let selected = benchmarks.find(option => option.benchmarkName === benchmark);
      if (!selected) {
        throw createApiServiceError(
          'Choose a benchmark ID or name returned by Get Geocoder Options.'
        );
      }
      benchmarkId = selected.id;
    }
    let response = await requestJson(
      this.http,
      '/vintages',
      z.object({ vintages: z.array(vintageSchema) }),
      'Census Geocoder',
      { benchmark: benchmarkId, format: 'json' }
    );
    return response.vintages;
  }
}

let featureSchema = z.looseObject({
  attributes: z.record(z.string(), z.unknown()),
  geometry: z.unknown().optional()
});
let layerSchema = z.looseObject({
  id: z.number(),
  name: z.string(),
  parentLayerId: z.number().optional(),
  subLayerIds: z.array(z.number()).nullable().optional(),
  defaultVisibility: z.boolean().optional()
});
let layerInfoSchema = layerSchema.extend({
  type: z.string().optional(),
  description: z.string().optional(),
  geometryType: z.string().optional(),
  maxRecordCount: z.number().optional(),
  objectIdField: z.string().optional(),
  advancedQueryCapabilities: z
    .object({ supportsPagination: z.boolean().optional() })
    .optional(),
  fields: z
    .array(z.looseObject({ name: z.string(), type: z.string(), alias: z.string().optional() }))
    .optional()
});

let servicePath = (serviceName: string) => {
  let parts = serviceName.split('/');
  if (parts.some(part => !part || !/^[A-Za-z0-9_-]+$/.test(part))) {
    throw createApiServiceError(
      'Use a TIGERweb service path, such as TIGERweb/tigerWMS_Current.'
    );
  }
  return `/${parts.join('/')}/MapServer`;
};

export class TigerwebClient {
  private http = createCensusHttp('https://tigerweb.geo.census.gov/arcgis/rest/services');

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
    resultOffset?: number;
  }) {
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
      queryParams.inSR = '4326';
    }
    if (params.resultRecordCount !== undefined)
      queryParams.resultRecordCount = params.resultRecordCount.toString();
    if (params.resultOffset !== undefined)
      queryParams.resultOffset = params.resultOffset.toString();
    return requestJson(
      this.http,
      `${servicePath(params.serviceName)}/${params.layerId}/query`,
      z.object({
        features: z.array(featureSchema),
        geometryType: z.string().optional(),
        spatialReference: z.record(z.string(), z.unknown()).optional(),
        exceededTransferLimit: z.boolean().optional()
      }),
      'TIGERweb',
      queryParams
    );
  }

  async getServiceInfo(serviceName: string) {
    return requestJson(
      this.http,
      servicePath(serviceName),
      z.object({
        serviceDescription: z.string().optional(),
        description: z.string().optional(),
        maxRecordCount: z.number().optional(),
        layers: z.array(layerSchema)
      }),
      'TIGERweb',
      { f: 'json' }
    );
  }

  async getLayerInfo(serviceName: string, layerId: number) {
    return requestJson(
      this.http,
      `${servicePath(serviceName)}/${layerId}`,
      layerInfoSchema,
      'TIGERweb',
      { f: 'json' }
    );
  }
}
