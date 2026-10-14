import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://graphhopper.com/api/1';

export class GraphHopperClient {
  private token: string;
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Connect a GraphHopper API key before making requests.');
    }
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'GraphHopper',
          reason: 'graphhopper_api_error'
        })
    });
  }

  // ─── Routing ───────────────────────────────────────────────────────

  async calculateRoute(params: {
    points: [number, number][];
    profile: string;
    locale?: string;
    elevation?: boolean;
    instructions?: boolean;
    calcPoints?: boolean;
    pointsEncoded?: boolean;
    pointHints?: string[];
    snapPreventions?: string[];
    curbsides?: string[];
    headings?: number[];
    details?: string[];
    optimize?: boolean;
    algorithm?: string;
    alternativeRouteMaxPaths?: number;
    alternativeRouteMaxWeightFactor?: number;
    alternativeRouteMaxShareFactor?: number;
    roundTripDistance?: number;
    roundTripSeed?: number;
    customModel?: Record<string, unknown>;
  }) {
    if (params.algorithm !== 'round_trip' && params.points.length < 2) {
      throw createApiServiceError(
        'Provide at least two points for a standard or alternative route.'
      );
    }
    if (params.algorithm === 'round_trip' && params.points.length !== 1) {
      throw createApiServiceError('Provide exactly one starting point for a round trip.');
    }
    let body: Record<string, unknown> = {
      points: params.points,
      profile: params.profile,
      points_encoded: params.pointsEncoded ?? false
    };

    if (params.locale) body.locale = params.locale;
    if (params.elevation !== undefined) body.elevation = params.elevation;
    if (params.instructions !== undefined) body.instructions = params.instructions;
    if (params.calcPoints !== undefined) body.calc_points = params.calcPoints;
    if (params.pointHints) body.point_hints = params.pointHints;
    if (params.snapPreventions) body.snap_preventions = params.snapPreventions;
    if (params.curbsides) body.curbsides = params.curbsides;
    if (params.headings) body.headings = params.headings;
    if (params.details) body.details = params.details;
    if (params.optimize !== undefined) body.optimize = String(params.optimize);
    if (params.algorithm) body.algorithm = params.algorithm;
    if (params.customModel) {
      body['ch.disable'] = true;
      body.custom_model = params.customModel;
    }
    if (params.algorithm) {
      body['ch.disable'] = true;
    }

    if (params.alternativeRouteMaxPaths !== undefined) {
      body['alternative_route.max_paths'] = params.alternativeRouteMaxPaths;
    }
    if (params.alternativeRouteMaxWeightFactor !== undefined) {
      body['alternative_route.max_weight_factor'] = params.alternativeRouteMaxWeightFactor;
    }
    if (params.alternativeRouteMaxShareFactor !== undefined) {
      body['alternative_route.max_share_factor'] = params.alternativeRouteMaxShareFactor;
    }
    if (params.roundTripDistance !== undefined) {
      body['round_trip.distance'] = params.roundTripDistance;
    }
    if (params.roundTripSeed !== undefined) {
      body['round_trip.seed'] = params.roundTripSeed;
    }

    let response = await this.axios.post('/route', body, {
      params: { key: this.token }
    });
    return response.data;
  }

  // ─── Matrix ────────────────────────────────────────────────────────

  async calculateMatrix(params: {
    profile: string;
    fromPoints?: [number, number][];
    toPoints?: [number, number][];
    points?: [number, number][];
    outArrays?: string[];
    failFast?: boolean;
  }) {
    if (params.points) {
      if (!params.points.length || params.fromPoints || params.toPoints) {
        throw createApiServiceError(
          'Provide non-empty points alone, or fromPoints and toPoints together.'
        );
      }
    } else if (!params.fromPoints?.length || !params.toPoints?.length) {
      throw createApiServiceError(
        'Provide non-empty points, or both fromPoints and toPoints.'
      );
    }
    let body: Record<string, unknown> = {
      profile: params.profile,
      fail_fast: params.failFast ?? false
    };

    if (params.points) {
      body.points = params.points;
    } else {
      if (params.fromPoints) body.from_points = params.fromPoints;
      if (params.toPoints) body.to_points = params.toPoints;
    }

    if (params.outArrays) body.out_arrays = params.outArrays;

    let response = await this.axios.post('/matrix', body, {
      params: { key: this.token }
    });
    return response.data;
  }

  // ─── Geocoding ─────────────────────────────────────────────────────

  async geocode(params: {
    query?: string;
    reverse?: boolean;
    point?: string;
    locale?: string;
    limit?: number;
    provider?: string;
    countryCode?: string;
    bounds?: string;
    osmTag?: string[];
  }) {
    if (params.reverse ? !params.point?.trim() : !params.query?.trim()) {
      throw createApiServiceError(
        params.reverse
          ? 'Provide a latitude,longitude point for reverse geocoding.'
          : 'Provide a query for forward geocoding.'
      );
    }
    let queryParams: Record<string, unknown> = {
      key: this.token
    };

    if (params.query) queryParams.q = params.query;
    if (params.reverse !== undefined) queryParams.reverse = params.reverse;
    if (params.point) queryParams.point = params.point;
    if (params.locale) queryParams.locale = params.locale;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.provider) queryParams.provider = params.provider;
    if (params.countryCode) queryParams.countrycode = params.countryCode;
    if (params.bounds) queryParams.bounds = params.bounds;

    let response = await this.axios.get('/geocode', {
      params: queryParams,
      paramsSerializer: (p: Record<string, unknown>) => {
        let parts: string[] = [];
        for (let [k, v] of Object.entries(p)) {
          if (v === undefined || v === null) continue;
          parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }
        if (params.osmTag) {
          for (let tag of params.osmTag) {
            parts.push(`osm_tag=${encodeURIComponent(tag)}`);
          }
        }
        return parts.join('&');
      }
    });
    return response.data;
  }

  // ─── Isochrone ─────────────────────────────────────────────────────

  async calculateIsochrone(params: {
    point: string;
    profile: string;
    timeLimit?: number;
    distanceLimit?: number;
    buckets?: number;
    reverseFlow?: boolean;
  }) {
    let queryParams: Record<string, unknown> = {
      key: this.token,
      point: params.point,
      profile: params.profile
    };

    if (params.timeLimit !== undefined) queryParams.time_limit = params.timeLimit;
    if (params.distanceLimit !== undefined) queryParams.distance_limit = params.distanceLimit;
    if (params.buckets !== undefined) queryParams.buckets = params.buckets;
    if (params.reverseFlow !== undefined) queryParams.reverse_flow = params.reverseFlow;

    let response = await this.axios.get('/isochrone', { params: queryParams });
    return response.data;
  }

  // ─── Map Matching ──────────────────────────────────────────────────

  async matchRoute(params: {
    gpxContent: string;
    profile: string;
    locale?: string;
    elevation?: boolean;
    instructions?: boolean;
    calcPoints?: boolean;
    pointsEncoded?: boolean;
    gpsAccuracy?: number;
  }) {
    let queryParams: Record<string, unknown> = {
      key: this.token,
      profile: params.profile
    };

    if (params.locale) queryParams.locale = params.locale;
    if (params.elevation !== undefined) queryParams.elevation = params.elevation;
    if (params.instructions !== undefined) queryParams.instructions = params.instructions;
    if (params.calcPoints !== undefined) queryParams.calc_points = params.calcPoints;
    if (params.pointsEncoded !== undefined) queryParams.points_encoded = params.pointsEncoded;
    if (params.gpsAccuracy !== undefined) queryParams.gps_accuracy = params.gpsAccuracy;

    let response = await this.axios.post('/match', params.gpxContent, {
      params: queryParams,
      headers: {
        'Content-Type': 'application/gpx+xml'
      }
    });
    return response.data;
  }

  // ─── Route Optimization (VRP) ─────────────────────────────────────

  async optimizeRoute(params: {
    vehicles: Record<string, unknown>[];
    vehicleTypes?: Record<string, unknown>[];
    services?: Record<string, unknown>[];
    shipments?: Record<string, unknown>[];
    objectives?: Record<string, unknown>[];
    relations?: Record<string, unknown>[];
    configuration?: Record<string, unknown>;
  }) {
    let body: Record<string, unknown> = {
      vehicles: params.vehicles
    };

    if (params.vehicleTypes) body.vehicle_types = params.vehicleTypes;
    if (params.services) body.services = params.services;
    if (params.shipments) body.shipments = params.shipments;
    if (params.objectives) body.objectives = params.objectives;
    if (params.relations) body.relations = params.relations;
    if (params.configuration) body.configuration = params.configuration;

    let response = await this.axios.post('/vrp', body, {
      params: { key: this.token }
    });
    return response.data;
  }

  async optimizeRouteAsync(params: {
    vehicles: Record<string, unknown>[];
    vehicleTypes?: Record<string, unknown>[];
    services?: Record<string, unknown>[];
    shipments?: Record<string, unknown>[];
    objectives?: Record<string, unknown>[];
    relations?: Record<string, unknown>[];
    configuration?: Record<string, unknown>;
  }) {
    let body: Record<string, unknown> = {
      vehicles: params.vehicles
    };

    if (params.vehicleTypes) body.vehicle_types = params.vehicleTypes;
    if (params.services) body.services = params.services;
    if (params.shipments) body.shipments = params.shipments;
    if (params.objectives) body.objectives = params.objectives;
    if (params.relations) body.relations = params.relations;
    if (params.configuration) body.configuration = params.configuration;

    let response = await this.axios.post('/vrp/optimize', body, {
      params: { key: this.token }
    });
    return response.data;
  }

  async getOptimizationSolution(jobId: string) {
    if (!jobId.trim()) {
      throw createApiServiceError('Provide a GraphHopper optimization job ID.');
    }
    let response = await this.axios.get(`/vrp/solution/${encodeURIComponent(jobId)}`, {
      params: { key: this.token }
    });
    return response.data;
  }

  async pollOptimizationSolution(
    jobId: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<Record<string, unknown>> {
    let status: string | undefined;
    for (let i = 0; i < maxAttempts; i++) {
      let result = await this.getOptimizationSolution(jobId);
      status = typeof result.status === 'string' ? result.status : undefined;
      if (result.status === 'finished') {
        return result;
      }
      if (status !== 'waiting_in_queue' && status !== 'processing') {
        throw createApiServiceError(
          `GraphHopper optimization job ${jobId} returned an unexpected status.`,
          { upstreamStatus: status, reason: 'unexpected_optimization_status' }
        );
      }
      if (i + 1 < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    throw createApiServiceError(
      `Optimization job ${jobId} is still running. Use get_optimization_solution with this job ID to retrieve its result.`,
      { upstreamStatus: status, reason: 'optimization_poll_timeout' }
    );
  }

  // ─── Clustering ────────────────────────────────────────────────────

  async calculateClusters(params: {
    customers: Array<{
      customerId: string;
      longitude: number;
      latitude: number;
      quantity?: number;
    }>;
    numClusters?: number;
    minQuantity?: number;
    maxQuantity?: number;
    profile?: string;
    clusters?: Array<{
      centerLongitude: number;
      centerLatitude: number;
      minQuantity?: number;
      maxQuantity?: number;
    }>;
  }) {
    let body: Record<string, unknown> = {
      customers: params.customers.map(c => ({
        id: c.customerId,
        address: {
          lon: c.longitude,
          lat: c.latitude
        },
        ...(c.quantity !== undefined ? { quantity: c.quantity } : {})
      })),
      configuration: {
        response_type: 'json',
        routing: {
          profile: params.profile || 'car'
        },
        ...(params.numClusters
          ? {
              clustering: {
                num_clusters: params.numClusters,
                ...(params.minQuantity !== undefined
                  ? { min_quantity: params.minQuantity }
                  : {}),
                ...(params.maxQuantity !== undefined
                  ? { max_quantity: params.maxQuantity }
                  : {})
              }
            }
          : {})
      }
    };

    if (params.clusters) {
      (body as Record<string, unknown>).clusters = params.clusters.map(c => ({
        center: {
          lon: c.centerLongitude,
          lat: c.centerLatitude
        },
        ...(c.minQuantity !== undefined ? { min_quantity: c.minQuantity } : {}),
        ...(c.maxQuantity !== undefined ? { max_quantity: c.maxQuantity } : {})
      }));
    }

    let response = await this.axios.post('/cluster', body, {
      params: { key: this.token }
    });
    return response.data;
  }
}
