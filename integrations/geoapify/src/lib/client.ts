import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.geoapify.com'
});

export class GeoapifyClient {
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
  }

  // ── Geocoding ──

  async geocodeForward(params: {
    text?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
    lang?: string;
    limit?: number;
    filter?: string;
    bias?: string;
  }) {
    let response = await http.get('/v1/geocode/search', {
      params: {
        ...params,
        format: 'json',
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  async geocodeReverse(params: {
    lat: number;
    lon: number;
    type?: string;
    lang?: string;
    limit?: number;
  }) {
    let response = await http.get('/v1/geocode/reverse', {
      params: {
        ...params,
        format: 'json',
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  async autocomplete(params: {
    text: string;
    type?: string;
    lang?: string;
    limit?: number;
    filter?: string;
    bias?: string;
  }) {
    let response = await http.get('/v1/geocode/autocomplete', {
      params: {
        ...params,
        format: 'json',
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  // ── Routing ──

  async calculateRoute(params: {
    waypoints: string;
    mode: string;
    type?: string;
    units?: string;
    lang?: string;
    avoid?: string;
    details?: string;
    traffic?: string;
    maxSpeed?: number;
  }) {
    let response = await http.get('/v1/routing', {
      params: {
        waypoints: params.waypoints,
        mode: params.mode,
        type: params.type,
        units: params.units,
        lang: params.lang,
        avoid: params.avoid,
        details: params.details,
        traffic: params.traffic,
        max_speed: params.maxSpeed,
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  // ── Route Matrix ──

  async calculateRouteMatrix(body: {
    mode: string;
    sources: Array<{ location: [number, number] }>;
    targets: Array<{ location: [number, number] }>;
    type?: string;
    traffic?: string;
    maxSpeed?: number;
    units?: string;
  }) {
    let response = await http.post(
      '/v1/routematrix',
      {
        mode: body.mode,
        sources: body.sources,
        targets: body.targets,
        type: body.type,
        traffic: body.traffic,
        max_speed: body.maxSpeed,
        units: body.units
      },
      {
        params: {
          apiKey: this.apiKey
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  // ── Places ──

  async searchPlaces(params: {
    categories: string;
    filter?: string;
    bias?: string;
    conditions?: string;
    limit?: number;
    offset?: number;
    lang?: string;
    name?: string;
  }) {
    let response = await http.get('/v2/places', {
      params: {
        ...params,
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  // ── Place Details ──

  async getPlaceDetails(params: {
    placeId?: string;
    lat?: number;
    lon?: number;
    features?: string;
    lang?: string;
  }) {
    let response = await http.get('/v2/place-details', {
      params: {
        id: params.placeId,
        lat: params.lat,
        lon: params.lon,
        features: params.features,
        lang: params.lang,
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  // ── Isolines ──

  async calculateIsoline(params: {
    lat: number;
    lon: number;
    type: string;
    mode: string;
    range: string;
    avoid?: string;
    traffic?: string;
    routeType?: string;
    maxSpeed?: number;
    units?: string;
  }) {
    let response = await http.get('/v1/isoline', {
      params: {
        lat: params.lat,
        lon: params.lon,
        type: params.type,
        mode: params.mode,
        range: params.range,
        avoid: params.avoid,
        traffic: params.traffic,
        route_type: params.routeType,
        max_speed: params.maxSpeed,
        units: params.units,
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  // ── IP Geolocation ──

  async ipGeolocation(params: { ip?: string }) {
    let response = await http.get('/v1/ipinfo', {
      params: {
        ip: params.ip,
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  // ── Boundaries ──

  async getBoundariesPartOf(params: {
    lat?: number;
    lon?: number;
    placeId?: string;
    geometry?: string;
  }) {
    let response = await http.get('/v1/boundaries/part-of', {
      params: {
        lat: params.lat,
        lon: params.lon,
        id: params.placeId,
        geometry: params.geometry,
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  async getBoundariesConsistsOf(params: {
    placeId: string;
    geometry?: string;
    level?: string;
  }) {
    let response = await http.get('/v1/boundaries/consists-of', {
      params: {
        id: params.placeId,
        geometry: params.geometry,
        level: params.level,
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  // ── Postcodes ──

  async searchPostcodes(params: {
    postcode?: string;
    countryCode?: string;
    geometry?: string;
  }) {
    let response = await http.get('/v1/postcode/search', {
      params: {
        postcode: params.postcode,
        countrycode: params.countryCode,
        geometry: params.geometry,
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  async listPostcodes(params: {
    countryCode?: string;
    filter?: string;
    limit?: number;
    offset?: number;
    geometry?: string;
  }) {
    let response = await http.get('/v1/postcode/list', {
      params: {
        countrycode: params.countryCode,
        filter: params.filter,
        limit: params.limit,
        offset: params.offset,
        geometry: params.geometry,
        apiKey: this.apiKey
      }
    });
    return response.data;
  }

  // ── Map Matching ──

  async mapMatch(body: {
    mode: string;
    waypoints: Array<{
      location: [number, number];
      timestamp?: string;
      bearing?: number;
    }>;
  }) {
    let response = await http.post('/v1/mapmatching', body, {
      params: {
        apiKey: this.apiKey
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  // ── Batch Geocoding ──

  async batchGeocodeSubmit(params: {
    addresses: string[];
    type?: string;
    lang?: string;
    limit?: number;
    filter?: string;
    bias?: string;
  }) {
    let response = await http.post('/v1/batch/geocode/search', params.addresses, {
      params: {
        type: params.type,
        lang: params.lang,
        limit: params.limit,
        filter: params.filter,
        bias: params.bias,
        apiKey: this.apiKey
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async batchGeocodeResults(jobId: string) {
    let response = await http.get('/v1/batch/geocode/search', {
      params: {
        id: jobId,
        apiKey: this.apiKey
      }
    });
    return { data: response.data, status: response.status };
  }

  async batchReverseGeocodeSubmit(params: {
    coordinates: [number, number][];
    type?: string;
    lang?: string;
    limit?: number;
  }) {
    let response = await http.post('/v1/batch/geocode/reverse', params.coordinates, {
      params: {
        type: params.type,
        lang: params.lang,
        limit: params.limit,
        apiKey: this.apiKey
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async batchReverseGeocodeResults(jobId: string) {
    let response = await http.get('/v1/batch/geocode/reverse', {
      params: {
        id: jobId,
        apiKey: this.apiKey
      }
    });
    return { data: response.data, status: response.status };
  }
}
