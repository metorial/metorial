import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getResponseHeaderValue,
  setIfDefined
} from 'slates';

export let PLACE_AUTOCOMPLETE_FIELD_MASK = [
  'suggestions.placePrediction.place',
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.text.text',
  'suggestions.placePrediction.structuredFormat.mainText.text',
  'suggestions.placePrediction.structuredFormat.secondaryText.text',
  'suggestions.placePrediction.types',
  'suggestions.placePrediction.distanceMeters',
  'suggestions.queryPrediction.text.text',
  'suggestions.queryPrediction.structuredFormat.mainText.text',
  'suggestions.queryPrediction.structuredFormat.secondaryText.text'
].join(',');

export let PLACE_DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'types',
  'primaryType',
  'businessStatus',
  'priceLevel',
  'websiteUri',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'regularOpeningHours',
  'reviews',
  'editorialSummary',
  'shortFormattedAddress',
  'addressComponents',
  'adrFormatAddress',
  'googleMapsUri',
  'photos'
].join(',');

export let MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES = 50 * 1024 * 1024;

// The photo segment comes verbatim from get_place_details output; Google emits
// URL-safe base64 references, so allow '=' padding alongside [A-Za-z0-9_-].
let PLACE_PHOTO_NAME_PATTERN = /^places\/([A-Za-z0-9_-]+)\/photos\/([A-Za-z0-9_=-]+)$/;
let PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
let JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
let GIF87A_SIGNATURE = Buffer.from('GIF87a', 'ascii');
let GIF89A_SIGNATURE = Buffer.from('GIF89a', 'ascii');
let RIFF_SIGNATURE = Buffer.from('RIFF', 'ascii');
let WEBP_SIGNATURE = Buffer.from('WEBP', 'ascii');
let ISO_BASE_MEDIA_FILE_SIGNATURE = Buffer.from('ftyp', 'ascii');

let readIsoBaseMediaBrands = (content: Buffer) => {
  if (!startsWith(content, ISO_BASE_MEDIA_FILE_SIGNATURE, 4) || content.length < 12) {
    return [];
  }

  let boxSize = content.readUInt32BE(0);
  if (boxSize < 16 || boxSize > content.length) return [];

  let brands = [content.subarray(8, 12).toString('ascii')];
  for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
    brands.push(content.subarray(offset, offset + 4).toString('ascii'));
  }
  return brands;
};

let hasIsoBaseMediaBrand = (content: Buffer, acceptedBrands: Set<string>) =>
  readIsoBaseMediaBrands(content).some(brand => acceptedBrands.has(brand));

let startsWith = (content: Buffer, signature: Buffer, offset = 0) =>
  content.length >= offset + signature.length &&
  content.subarray(offset, offset + signature.length).equals(signature);

let hasKnownImageSignature = (mimeType: string, content: Buffer) => {
  switch (mimeType) {
    case 'image/jpeg':
      return startsWith(content, JPEG_SIGNATURE);
    case 'image/png':
      return startsWith(content, PNG_SIGNATURE);
    case 'image/gif':
      return startsWith(content, GIF87A_SIGNATURE) || startsWith(content, GIF89A_SIGNATURE);
    case 'image/webp':
      return startsWith(content, RIFF_SIGNATURE) && startsWith(content, WEBP_SIGNATURE, 8);
    case 'image/avif':
      return hasIsoBaseMediaBrand(content, new Set(['avif', 'avis']));
    case 'image/heic':
      return hasIsoBaseMediaBrand(
        content,
        new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'])
      );
    case 'image/heif':
      return hasIsoBaseMediaBrand(
        content,
        new Set(['mif1', 'msf1', 'heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'])
      );
    default:
      return false;
  }
};

let binaryResponseToBuffer = (value: unknown): Buffer | undefined => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return undefined;
};

let mapsAxios = createAxios({
  baseURL: 'https://maps.googleapis.com'
});

let placesAxios = createAxios({
  baseURL: 'https://places.googleapis.com'
});

// Place Photos returns a temporary googleusercontent.com URL. Use a separate
// requester so the Maps API key is never forwarded to that media host.
let placePhotoDownloadAxios = createAxios();

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

  async autocompletePlaces(params: {
    input: string;
    locationBias?: { latitude: number; longitude: number; radiusMeters: number };
    locationRestriction?: { latitude: number; longitude: number; radiusMeters: number };
    includedPrimaryTypes?: string[];
    includedRegionCodes?: string[];
    languageCode?: string;
    regionCode?: string;
    origin?: { latitude: number; longitude: number };
    inputOffset?: number;
    includeQueryPredictions?: boolean;
    sessionToken?: string;
    includePureServiceAreaBusinesses?: boolean;
    includeFutureOpeningBusinesses?: boolean;
  }) {
    let body: Record<string, unknown> = { input: params.input };
    setIfDefined(body, 'includedPrimaryTypes', params.includedPrimaryTypes);
    setIfDefined(body, 'includedRegionCodes', params.includedRegionCodes);
    setIfDefined(body, 'languageCode', params.languageCode);
    setIfDefined(body, 'regionCode', params.regionCode);
    setIfDefined(body, 'origin', params.origin);
    setIfDefined(body, 'inputOffset', params.inputOffset);
    setIfDefined(body, 'includeQueryPredictions', params.includeQueryPredictions);
    setIfDefined(body, 'sessionToken', params.sessionToken);
    setIfDefined(
      body,
      'includePureServiceAreaBusinesses',
      params.includePureServiceAreaBusinesses
    );
    setIfDefined(
      body,
      'includeFutureOpeningBusinesses',
      params.includeFutureOpeningBusinesses
    );

    if (params.locationBias) {
      body.locationBias = {
        circle: {
          center: {
            latitude: params.locationBias.latitude,
            longitude: params.locationBias.longitude
          },
          radius: params.locationBias.radiusMeters
        }
      };
    }
    if (params.locationRestriction) {
      body.locationRestriction = {
        circle: {
          center: {
            latitude: params.locationRestriction.latitude,
            longitude: params.locationRestriction.longitude
          },
          radius: params.locationRestriction.radiusMeters
        }
      };
    }

    try {
      let response = await placesAxios.post('/v1/places:autocomplete', body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.token,
          'X-Goog-FieldMask': PLACE_AUTOCOMPLETE_FIELD_MASK
        }
      });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Maps',
        operation: 'retrieve place autocomplete suggestions',
        reason: 'google_maps_autocomplete_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  }

  async getPlaceDetails(params: {
    placeId: string;
    languageCode?: string;
    sessionToken?: string;
  }) {
    let response = await placesAxios.get(`/v1/places/${params.placeId}`, {
      headers: {
        'X-Goog-Api-Key': this.token,
        'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK
      },
      params: {
        languageCode: params.languageCode,
        sessionToken: params.sessionToken
      }
    });
    return response.data;
  }

  async getPlacePhoto(params: {
    photoName: string;
    maxWidthPx?: number;
    maxHeightPx?: number;
  }): Promise<{ photoName: string; placeId: string; mimeType: string; content: Buffer }> {
    let photoNameMatch = PLACE_PHOTO_NAME_PATTERN.exec(params.photoName);
    if (!photoNameMatch) {
      throw createApiServiceError(
        'Provide a current Places API photo resource name in the format places/{placeId}/photos/{photoReference}.',
        { reason: 'google_maps_place_photo_name_invalid' }
      );
    }

    if (params.maxWidthPx === undefined && params.maxHeightPx === undefined) {
      throw createApiServiceError(
        'Provide maxWidthPx, maxHeightPx, or both when requesting a place photo.',
        { reason: 'google_maps_place_photo_dimensions_required' }
      );
    }
    for (let dimension of [params.maxWidthPx, params.maxHeightPx]) {
      if (
        dimension !== undefined &&
        (!Number.isInteger(dimension) || dimension < 1 || dimension > 4800)
      ) {
        throw createApiServiceError(
          'Place photo dimensions must be whole numbers from 1 through 4800 pixels.',
          { reason: 'google_maps_place_photo_dimensions_invalid' }
        );
      }
    }

    let mediaResponse: any;
    try {
      mediaResponse = await placesAxios.get(`/v1/${params.photoName}/media`, {
        headers: { 'X-Goog-Api-Key': this.token },
        params: {
          maxWidthPx: params.maxWidthPx,
          maxHeightPx: params.maxHeightPx,
          skipHttpRedirect: true
        }
      });
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Maps',
        operation: 'request place photo media',
        reason: 'google_maps_place_photo_api_error',
        nestedKeys: ['error', 'errors']
      });
    }

    let expectedMediaName = `${params.photoName}/media`;
    let mediaName = mediaResponse?.data?.name;
    let photoUri = mediaResponse?.data?.photoUri;
    if (
      mediaName !== expectedMediaName ||
      typeof photoUri !== 'string' ||
      photoUri.trim().length === 0
    ) {
      throw createApiServiceError(
        'Google Maps returned invalid place photo media metadata. Request a current photo name and retry.',
        { reason: 'google_maps_place_photo_metadata_invalid' }
      );
    }

    let parsedPhotoUri: URL;
    try {
      parsedPhotoUri = new URL(photoUri);
    } catch {
      throw createApiServiceError(
        'Google Maps returned an invalid place photo media URL, so no download was attempted.',
        { reason: 'google_maps_place_photo_uri_invalid' }
      );
    }
    let hostname = parsedPhotoUri.hostname.toLowerCase();
    if (
      parsedPhotoUri.protocol !== 'https:' ||
      parsedPhotoUri.username.length > 0 ||
      parsedPhotoUri.password.length > 0 ||
      parsedPhotoUri.port.length > 0 ||
      parsedPhotoUri.hash.length > 0 ||
      !hostname.endsWith('.googleusercontent.com') ||
      (this.token.length > 0 && parsedPhotoUri.toString().includes(this.token))
    ) {
      throw createApiServiceError(
        'Google Maps returned an unsafe place photo media URL, so no download was attempted.',
        { reason: 'google_maps_place_photo_uri_invalid' }
      );
    }

    let downloadResponse: any;
    try {
      downloadResponse = await placePhotoDownloadAxios.get(parsedPhotoUri.toString(), {
        responseType: 'arraybuffer',
        maxRedirects: 0,
        maxBodyLength: MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES,
        maxContentLength: MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES
      });
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Maps',
        operation: 'download place photo bytes',
        reason: 'google_maps_place_photo_download_error',
        nestedKeys: ['error', 'errors']
      });
    }

    let declaredContentLength = getResponseHeaderValue(
      downloadResponse?.headers,
      'content-length'
    );
    if (/^\d+$/.test(declaredContentLength ?? '')) {
      let contentLength = Number(declaredContentLength);
      if (contentLength > MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES) {
        throw createApiServiceError(
          `Google Maps returned a place photo larger than the ${MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES}-byte attachment limit.`,
          { reason: 'google_maps_place_photo_content_too_large' }
        );
      }
    }

    let content = binaryResponseToBuffer(downloadResponse?.data);
    if (!content || content.length === 0) {
      throw createApiServiceError(
        'Google Maps returned an empty or invalid place photo download response.',
        { reason: 'google_maps_place_photo_content_invalid' }
      );
    }
    if (content.length > MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES) {
      throw createApiServiceError(
        `Google Maps returned a place photo larger than the ${MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES}-byte attachment limit.`,
        { reason: 'google_maps_place_photo_content_too_large' }
      );
    }

    let downloadedMimeType = getResponseHeaderValue(downloadResponse.headers, 'content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase();
    if (downloadedMimeType === 'image/jpg') downloadedMimeType = 'image/jpeg';
    if (!downloadedMimeType || !hasKnownImageSignature(downloadedMimeType, content)) {
      let supportedMimeTypes = new Set([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
        'image/heic',
        'image/heif'
      ]);
      throw createApiServiceError(
        downloadedMimeType && supportedMimeTypes.has(downloadedMimeType)
          ? `Google Maps returned content that does not match the ${downloadedMimeType} file signature.`
          : downloadedMimeType
            ? `Google Maps returned place photo content with unexpected MIME type "${downloadedMimeType}".`
            : 'Google Maps returned place photo content without an image MIME type.',
        {
          reason:
            downloadedMimeType && supportedMimeTypes.has(downloadedMimeType)
              ? 'google_maps_place_photo_content_invalid'
              : 'google_maps_place_photo_mime_type_invalid'
        }
      );
    }

    return {
      photoName: params.photoName,
      placeId: photoNameMatch[1]!,
      mimeType: downloadedMimeType,
      content
    };
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
