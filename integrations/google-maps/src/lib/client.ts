import { createAxios } from 'slates';

let mapsAxios = createAxios({
  baseURL: 'https://maps.googleapis.com'
});

let placesAxios = createAxios({
  baseURL: 'https://places.googleapis.com'
});

let routesAxios = createAxios({
  baseURL: 'https://routes.googleapis.com'
});

let addressValidationAxios = createAxios({
  baseURL: 'https://addressvalidation.googleapis.com'
});

let airQualityAxios = createAxios({
  baseURL: 'https://airquality.googleapis.com'
});

let roadsAxios = createAxios({
  baseURL: 'https://roads.googleapis.com'
});

let geolocationAxios = createAxios({
  baseURL: 'https://www.googleapis.com'
});

export class GoogleMapsClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  // ── Geocoding ──

  async geocodeAddress(params: {
    address: string;
    components?: string;
    bounds?: string;
    language?: string;
    region?: string;
  }) {
    let response = await mapsAxios.get('/maps/api/geocode/json', {
      params: {
        address: params.address,
        components: params.components,
        bounds: params.bounds,
        language: params.language,
        region: params.region,
        key: this.token
      }
    });
    return response.data;
  }

  async reverseGeocode(params: {
    latitude: number;
    longitude: number;
    resultType?: string;
    locationType?: string;
    language?: string;
  }) {
    let response = await mapsAxios.get('/maps/api/geocode/json', {
      params: {
        latlng: `${params.latitude},${params.longitude}`,
        result_type: params.resultType,
        location_type: params.locationType,
        language: params.language,
        key: this.token
      }
    });
    return response.data;
  }

  // ── Address Validation ──

  async validateAddress(params: {
    regionCode?: string;
    locality?: string;
    addressLines: string[];
    enableUspsCass?: boolean;
  }) {
    let response = await addressValidationAxios.post(
      '/v1:validateAddress',
      {
        address: {
          regionCode: params.regionCode,
          locality: params.locality,
          addressLines: params.addressLines
        },
        enableUspsCass: params.enableUspsCass
      },
      {
        params: { key: this.token }
      }
    );
    return response.data;
  }

  // ── Places ──

  async searchPlacesText(params: {
    textQuery: string;
    languageCode?: string;
    regionCode?: string;
    rankPreference?: string;
    includedType?: string;
    openNow?: boolean;
    minRating?: number;
    maxResultCount?: number;
    locationBias?: {
      latitude: number;
      longitude: number;
      radius: number;
    };
    priceLevels?: string[];
  }) {
    let body: Record<string, unknown> = {
      textQuery: params.textQuery,
      languageCode: params.languageCode,
      regionCode: params.regionCode,
      rankPreference: params.rankPreference,
      includedType: params.includedType,
      openNow: params.openNow,
      minRating: params.minRating,
      pageSize: params.maxResultCount,
      priceLevels: params.priceLevels
    };

    if (params.locationBias) {
      body.locationBias = {
        circle: {
          center: {
            latitude: params.locationBias.latitude,
            longitude: params.locationBias.longitude
          },
          radius: params.locationBias.radius
        }
      };
    }

    let response = await placesAxios.post('/v1/places:searchText', body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.token,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.businessStatus,places.priceLevel,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours'
      }
    });
    return response.data;
  }

  async searchPlacesNearby(params: {
    latitude: number;
    longitude: number;
    radius: number;
    includedTypes?: string[];
    excludedTypes?: string[];
    maxResultCount?: number;
    languageCode?: string;
    rankPreference?: string;
  }) {
    let body: Record<string, unknown> = {
      includedTypes: params.includedTypes,
      excludedTypes: params.excludedTypes,
      maxResultCount: params.maxResultCount || 20,
      languageCode: params.languageCode,
      rankPreference: params.rankPreference,
      locationRestriction: {
        circle: {
          center: {
            latitude: params.latitude,
            longitude: params.longitude
          },
          radius: params.radius
        }
      }
    };

    let response = await placesAxios.post('/v1/places:searchNearby', body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.token,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.businessStatus,places.priceLevel,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours'
      }
    });
    return response.data;
  }

  async getPlaceDetails(params: { placeId: string; languageCode?: string }) {
    let response = await placesAxios.get(`/v1/places/${params.placeId}`, {
      headers: {
        'X-Goog-Api-Key': this.token,
        'X-Goog-FieldMask':
          'id,displayName,formattedAddress,location,rating,userRatingCount,types,primaryType,businessStatus,priceLevel,websiteUri,nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours,reviews,editorialSummary,shortFormattedAddress,addressComponents,adrFormatAddress,googleMapsUri'
      },
      params: {
        languageCode: params.languageCode
      }
    });
    return response.data;
  }

  // ── Directions (Legacy) ──

  async getDirections(params: {
    origin: string;
    destination: string;
    mode?: string;
    waypoints?: string[];
    alternatives?: boolean;
    avoid?: string[];
    units?: string;
    departureTime?: string;
    arrivalTime?: string;
    language?: string;
    region?: string;
  }) {
    let waypoints = params.waypoints?.join('|');

    let response = await mapsAxios.get('/maps/api/directions/json', {
      params: {
        origin: params.origin,
        destination: params.destination,
        mode: params.mode,
        waypoints: waypoints,
        alternatives: params.alternatives,
        avoid: params.avoid?.join('|'),
        units: params.units,
        departure_time: params.departureTime,
        arrival_time: params.arrivalTime,
        language: params.language,
        region: params.region,
        key: this.token
      }
    });
    return response.data;
  }

  // ── Routes API ──

  async computeRoutes(params: {
    origin:
      | { latitude: number; longitude: number }
      | { placeId: string }
      | { address: string };
    destination:
      | { latitude: number; longitude: number }
      | { placeId: string }
      | { address: string };
    intermediates?: Array<
      { latitude: number; longitude: number } | { placeId: string } | { address: string }
    >;
    travelMode?: string;
    routingPreference?: string;
    computeAlternativeRoutes?: boolean;
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
    departureTime?: string;
    languageCode?: string;
    units?: string;
  }) {
    let toWaypoint = (
      wp: { latitude: number; longitude: number } | { placeId: string } | { address: string }
    ) => {
      if ('placeId' in wp) {
        return { placeId: wp.placeId };
      }
      if ('address' in wp) {
        return { address: wp.address };
      }
      return { location: { latLng: { latitude: wp.latitude, longitude: wp.longitude } } };
    };

    let body: Record<string, unknown> = {
      origin: toWaypoint(params.origin),
      destination: toWaypoint(params.destination),
      travelMode: params.travelMode || 'DRIVE',
      routingPreference: params.routingPreference,
      computeAlternativeRoutes: params.computeAlternativeRoutes,
      departureTime: params.departureTime,
      languageCode: params.languageCode,
      units: params.units,
      routeModifiers: {
        avoidTolls: params.avoidTolls || false,
        avoidHighways: params.avoidHighways || false,
        avoidFerries: params.avoidFerries || false
      }
    };

    if (params.intermediates && params.intermediates.length > 0) {
      body.intermediates = params.intermediates.map(toWaypoint);
    }

    let response = await routesAxios.post('/directions/v2:computeRoutes', body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.token,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.description,routes.travelAdvisory,routes.routeLabels'
      }
    });
    return response.data;
  }

  async computeRouteMatrix(params: {
    origins: Array<{ latitude: number; longitude: number } | { placeId: string }>;
    destinations: Array<{ latitude: number; longitude: number } | { placeId: string }>;
    travelMode?: string;
    routingPreference?: string;
  }) {
    let toWaypoint = (wp: { latitude: number; longitude: number } | { placeId: string }) => {
      if ('placeId' in wp) {
        return { waypoint: { placeId: wp.placeId } };
      }
      return {
        waypoint: { location: { latLng: { latitude: wp.latitude, longitude: wp.longitude } } }
      };
    };

    let response = await routesAxios.post(
      '/distanceMatrix/v2:computeRouteMatrix',
      {
        origins: params.origins.map(toWaypoint),
        destinations: params.destinations.map(toWaypoint),
        travelMode: params.travelMode || 'DRIVE',
        routingPreference: params.routingPreference
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.token,
          'X-Goog-FieldMask':
            'originIndex,destinationIndex,duration,distanceMeters,status,condition'
        }
      }
    );
    return response.data;
  }

  // ── Elevation ──

  async getElevation(params: { locations: Array<{ latitude: number; longitude: number }> }) {
    let locString = params.locations.map(loc => `${loc.latitude},${loc.longitude}`).join('|');

    let response = await mapsAxios.get('/maps/api/elevation/json', {
      params: {
        locations: locString,
        key: this.token
      }
    });
    return response.data;
  }

  async getElevationAlongPath(params: {
    path: Array<{ latitude: number; longitude: number }>;
    samples: number;
  }) {
    let pathString = params.path.map(loc => `${loc.latitude},${loc.longitude}`).join('|');

    let response = await mapsAxios.get('/maps/api/elevation/json', {
      params: {
        path: pathString,
        samples: params.samples,
        key: this.token
      }
    });
    return response.data;
  }

  // ── Time Zone ──

  async getTimeZone(params: {
    latitude: number;
    longitude: number;
    timestamp?: number;
    language?: string;
  }) {
    let response = await mapsAxios.get('/maps/api/timezone/json', {
      params: {
        location: `${params.latitude},${params.longitude}`,
        timestamp: params.timestamp || Math.floor(Date.now() / 1000),
        language: params.language,
        key: this.token
      }
    });
    return response.data;
  }

  // ── Air Quality ──

  async getAirQuality(params: {
    latitude: number;
    longitude: number;
    languageCode?: string;
    extraComputations?: string[];
  }) {
    let response = await airQualityAxios.post(
      '/v1/currentConditions:lookup',
      {
        location: {
          latitude: params.latitude,
          longitude: params.longitude
        },
        universalAqi: true,
        extraComputations: params.extraComputations || [
          'HEALTH_RECOMMENDATIONS',
          'DOMINANT_POLLUTANT_CONCENTRATION',
          'POLLUTANT_CONCENTRATION',
          'LOCAL_AQI',
          'POLLUTANT_ADDITIONAL_INFO'
        ],
        languageCode: params.languageCode || 'en'
      },
      {
        params: { key: this.token }
      }
    );
    return response.data;
  }

  // ── Roads ──

  async snapToRoads(params: {
    path: Array<{ latitude: number; longitude: number }>;
    interpolate?: boolean;
  }) {
    let pathString = params.path.map(p => `${p.latitude},${p.longitude}`).join('|');

    let response = await roadsAxios.get('/v1/snapToRoads', {
      params: {
        path: pathString,
        interpolate: params.interpolate,
        key: this.token
      }
    });
    return response.data;
  }

  // ── Static Maps ──

  getStaticMapUrl(params: {
    center?: string;
    zoom?: number;
    size: string;
    scale?: number;
    format?: string;
    maptype?: string;
    markers?: string[];
    path?: string;
    language?: string;
  }) {
    let baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    let searchParams = new URLSearchParams();

    if (params.center) searchParams.append('center', params.center);
    if (params.zoom !== undefined) searchParams.append('zoom', String(params.zoom));
    searchParams.append('size', params.size);
    if (params.scale) searchParams.append('scale', String(params.scale));
    if (params.format) searchParams.append('format', params.format);
    if (params.maptype) searchParams.append('maptype', params.maptype);
    if (params.markers) {
      for (let marker of params.markers) {
        searchParams.append('markers', marker);
      }
    }
    if (params.path) searchParams.append('path', params.path);
    if (params.language) searchParams.append('language', params.language);
    searchParams.append('key', this.token);

    return `${baseUrl}?${searchParams.toString()}`;
  }

  // ── Street View ──

  getStreetViewUrl(params: {
    location: string;
    size: string;
    heading?: number;
    fov?: number;
    pitch?: number;
  }) {
    let baseUrl = 'https://maps.googleapis.com/maps/api/streetview';
    let searchParams = new URLSearchParams();

    searchParams.append('location', params.location);
    searchParams.append('size', params.size);
    if (params.heading !== undefined) searchParams.append('heading', String(params.heading));
    if (params.fov !== undefined) searchParams.append('fov', String(params.fov));
    if (params.pitch !== undefined) searchParams.append('pitch', String(params.pitch));
    searchParams.append('key', this.token);

    return `${baseUrl}?${searchParams.toString()}`;
  }

  async getStreetViewMetadata(params: { location: string }) {
    let response = await mapsAxios.get('/maps/api/streetview/metadata', {
      params: {
        location: params.location,
        key: this.token
      }
    });
    return response.data;
  }

  // ── Geolocation ──

  async geolocate(params: {
    considerIp?: boolean;
    cellTowers?: Array<{
      cellId: number;
      locationAreaCode: number;
      mobileCountryCode: number;
      mobileNetworkCode: number;
      signalStrength?: number;
    }>;
    wifiAccessPoints?: Array<{
      macAddress: string;
      signalStrength?: number;
      channel?: number;
    }>;
  }) {
    let response = await geolocationAxios.post(
      '/geolocation/v1/geolocate',
      {
        considerIp: params.considerIp,
        cellTowers: params.cellTowers,
        wifiAccessPoints: params.wifiAccessPoints
      },
      {
        params: { key: this.token }
      }
    );
    return response.data;
  }
}
