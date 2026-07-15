import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';

let placesGet = vi.fn();
let placesPost = vi.fn();
let downloadGet = vi.fn();

let createAxiosMock = vi.fn((config?: { baseURL?: string }) => {
  if (config?.baseURL === 'https://places.googleapis.com') {
    return { get: placesGet, post: placesPost };
  }
  if (!config?.baseURL) {
    return { get: downloadGet };
  }
  return { get: vi.fn(), post: vi.fn() };
});

let loadClient = async () => {
  vi.resetModules();
  placesGet.mockReset();
  placesPost.mockReset();
  downloadGet.mockReset();
  createAxiosMock.mockClear();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');
    return { ...actual, createAxios: createAxiosMock };
  });

  return await import('./client');
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('GoogleMapsClient Places API (New)', () => {
  it('sends autocomplete fields, session state, and a bounded response field mask', async () => {
    let { GoogleMapsClient, PLACE_AUTOCOMPLETE_FIELD_MASK } = await loadClient();
    placesPost.mockResolvedValueOnce({ data: { suggestions: [] } });

    await new GoogleMapsClient({ token: 'maps-secret' }).autocompletePlaces({
      input: 'pizza',
      sessionToken: '123e4567-e89b-12d3-a456-426614174000',
      includedPrimaryTypes: ['restaurant'],
      includedRegionCodes: ['US'],
      languageCode: 'en',
      regionCode: 'US',
      inputOffset: 5,
      includeQueryPredictions: true,
      includePureServiceAreaBusinesses: false,
      includeFutureOpeningBusinesses: true,
      locationBias: { latitude: 37.7937, longitude: -122.3965, radiusMeters: 500 },
      origin: { latitude: 37.7937, longitude: -122.3965 }
    });

    expect(placesPost).toHaveBeenCalledWith(
      '/v1/places:autocomplete',
      {
        input: 'pizza',
        sessionToken: '123e4567-e89b-12d3-a456-426614174000',
        includedPrimaryTypes: ['restaurant'],
        includedRegionCodes: ['US'],
        languageCode: 'en',
        regionCode: 'US',
        inputOffset: 5,
        includeQueryPredictions: true,
        includePureServiceAreaBusinesses: false,
        includeFutureOpeningBusinesses: true,
        locationBias: {
          circle: {
            center: { latitude: 37.7937, longitude: -122.3965 },
            radius: 500
          }
        },
        origin: { latitude: 37.7937, longitude: -122.3965 }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': 'maps-secret',
          'X-Goog-FieldMask': PLACE_AUTOCOMPLETE_FIELD_MASK
        }
      }
    );
  });

  it('requests photo metadata and passes an autocomplete session token to Place Details', async () => {
    let { GoogleMapsClient, PLACE_DETAILS_FIELD_MASK } = await loadClient();
    placesGet.mockResolvedValueOnce({ data: { id: 'place-1', photos: [] } });

    await new GoogleMapsClient({ token: 'maps-secret' }).getPlaceDetails({
      placeId: 'place-1',
      languageCode: 'en',
      sessionToken: '123e4567-e89b-12d3-a456-426614174000'
    });

    expect(placesGet).toHaveBeenCalledWith('/v1/places/place-1', {
      headers: {
        'X-Goog-Api-Key': 'maps-secret',
        'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK
      },
      params: {
        languageCode: 'en',
        sessionToken: '123e4567-e89b-12d3-a456-426614174000'
      }
    });
    expect(PLACE_DETAILS_FIELD_MASK.split(',')).toContain('photos');
  });

  it('maps autocomplete API failures to ServiceError without exposing the API key', async () => {
    let { GoogleMapsClient } = await loadClient();
    placesPost.mockRejectedValueOnce({
      response: {
        status: 403,
        statusText: 'Forbidden',
        data: { error: { message: 'Places API is not enabled' } }
      }
    });

    let error = await new GoogleMapsClient({ token: 'maps-secret' })
      .autocompletePlaces({ input: 'pizza' })
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({
      reason: 'google_maps_autocomplete_api_error',
      upstreamStatus: 403
    });
    expect(error.message).not.toContain('maps-secret');
  });
});

describe('GoogleMapsClient getPlacePhoto', () => {
  it('gets a redirect-free media URL, then downloads bytes without forwarding the API key', async () => {
    let { GoogleMapsClient, MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES } = await loadClient();
    let jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    placesGet.mockResolvedValueOnce({
      data: {
        name: 'places/place-1/photos/photo-1/media',
        photoUri: 'https://lh3.googleusercontent.com/place-photo?token=signed'
      }
    });
    downloadGet.mockResolvedValueOnce({
      data: jpeg,
      headers: { 'content-type': 'image/jpeg; charset=binary', 'content-length': '4' }
    });

    let result = await new GoogleMapsClient({ token: 'maps-secret' }).getPlacePhoto({
      photoName: 'places/place-1/photos/photo-1',
      maxWidthPx: 800,
      maxHeightPx: 600
    });

    expect(placesGet).toHaveBeenCalledWith('/v1/places/place-1/photos/photo-1/media', {
      headers: { 'X-Goog-Api-Key': 'maps-secret' },
      params: { maxWidthPx: 800, maxHeightPx: 600, skipHttpRedirect: true }
    });
    expect(downloadGet).toHaveBeenCalledWith(
      'https://lh3.googleusercontent.com/place-photo?token=signed',
      {
        responseType: 'arraybuffer',
        maxRedirects: 0,
        maxBodyLength: MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES,
        maxContentLength: MAX_GOOGLE_MAPS_PLACE_PHOTO_BYTES
      }
    );
    expect(downloadGet.mock.calls[0]?.[1]).not.toHaveProperty('headers');
    expect(JSON.stringify(downloadGet.mock.calls)).not.toContain('maps-secret');
    expect(result).toEqual({
      photoName: 'places/place-1/photos/photo-1',
      placeId: 'place-1',
      mimeType: 'image/jpeg',
      content: jpeg
    });
  });

  it.each([
    'https://attacker.example/place-photo',
    'http://lh3.googleusercontent.com/place-photo',
    'https://user:password@lh3.googleusercontent.com/place-photo',
    'https://lh3.googleusercontent.com:8443/place-photo',
    'https://lh3.googleusercontent.com/place-photo?token=maps-secret'
  ])('rejects the unsafe photo media URL %s without downloading it', async photoUri => {
    let { GoogleMapsClient } = await loadClient();
    placesGet.mockResolvedValueOnce({
      data: { name: 'places/place-1/photos/photo-1/media', photoUri }
    });

    let error = await new GoogleMapsClient({ token: 'maps-secret' })
      .getPlacePhoto({ photoName: 'places/place-1/photos/photo-1', maxWidthPx: 400 })
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({ reason: 'google_maps_place_photo_uri_invalid' });
    expect(downloadGet).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'a non-image MIME type',
      data: Buffer.from('<html>error</html>'),
      headers: { 'content-type': 'text/html' },
      reason: 'google_maps_place_photo_mime_type_invalid'
    },
    {
      name: 'a non-binary response',
      data: '<html>error</html>',
      headers: { 'content-type': 'image/jpeg' },
      reason: 'google_maps_place_photo_content_invalid'
    },
    {
      name: 'bytes without the declared JPEG signature',
      data: Buffer.from('not a jpeg'),
      headers: { 'content-type': 'image/jpeg' },
      reason: 'google_maps_place_photo_content_invalid'
    },
    {
      name: 'a generic ISO media container mislabeled as AVIF',
      data: Buffer.from([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00,
        0x00, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x32
      ]),
      headers: { 'content-type': 'image/avif' },
      reason: 'google_maps_place_photo_content_invalid'
    },
    {
      name: 'a declared body above the size limit',
      data: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      headers: {
        'content-type': 'image/jpeg',
        'content-length': String(50 * 1024 * 1024 + 1)
      },
      reason: 'google_maps_place_photo_content_too_large'
    }
  ])('rejects $name', async ({ data, headers, reason }) => {
    let { GoogleMapsClient } = await loadClient();
    placesGet.mockResolvedValueOnce({
      data: {
        name: 'places/place-1/photos/photo-1/media',
        photoUri: 'https://lh3.googleusercontent.com/place-photo'
      }
    });
    downloadGet.mockResolvedValueOnce({ data, headers });

    let error = await new GoogleMapsClient({ token: 'maps-secret' })
      .getPlacePhoto({ photoName: 'places/place-1/photos/photo-1', maxHeightPx: 400 })
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({ reason });
  });

  it('accepts Google-emitted photo references with URL-safe base64 padding', async () => {
    let { GoogleMapsClient } = await loadClient();
    let paddedPhotoName = 'places/place-1/photos/AZLasVh8w_9tZWRpYQ==';
    let jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    placesGet.mockResolvedValueOnce({
      data: {
        name: `${paddedPhotoName}/media`,
        photoUri: 'https://lh3.googleusercontent.com/place-photo'
      }
    });
    downloadGet.mockResolvedValueOnce({
      data: jpeg,
      headers: { 'content-type': 'image/jpeg', 'content-length': '4' }
    });

    let result = await new GoogleMapsClient({ token: 'maps-secret' }).getPlacePhoto({
      photoName: paddedPhotoName,
      maxWidthPx: 400
    });

    expect(placesGet).toHaveBeenCalledWith(`/v1/${paddedPhotoName}/media`, {
      headers: { 'X-Goog-Api-Key': 'maps-secret' },
      params: { maxWidthPx: 400, maxHeightPx: undefined, skipHttpRedirect: true }
    });
    expect(result.photoName).toBe(paddedPhotoName);
    expect(result.placeId).toBe('place-1');
  });

  it('rejects invalid photo names and missing dimensions before calling Google', async () => {
    let { GoogleMapsClient } = await loadClient();
    let client = new GoogleMapsClient({ token: 'maps-secret' });

    let invalidName = await client
      .getPlacePhoto({ photoName: 'https://attacker.example/photo', maxWidthPx: 400 })
      .catch(error => error);
    let missingDimensions = await client
      .getPlacePhoto({ photoName: 'places/place-1/photos/photo-1' })
      .catch(error => error);

    expect(invalidName).toBeInstanceOf(ServiceError);
    expect(invalidName.data).toMatchObject({ reason: 'google_maps_place_photo_name_invalid' });
    expect(missingDimensions).toBeInstanceOf(ServiceError);
    expect(missingDimensions.data).toMatchObject({
      reason: 'google_maps_place_photo_dimensions_required'
    });
    expect(placesGet).not.toHaveBeenCalled();
  });

  it('maps Google media metadata and byte download failures to ServiceError', async () => {
    let { GoogleMapsClient } = await loadClient();
    let client = new GoogleMapsClient({ token: 'maps-secret' });
    placesGet.mockRejectedValueOnce({
      response: {
        status: 404,
        statusText: 'Not Found',
        data: { error: { message: 'Photo name expired' } }
      }
    });

    let metadataError = await client
      .getPlacePhoto({ photoName: 'places/place-1/photos/photo-1', maxWidthPx: 400 })
      .catch(error => error);
    expect(metadataError).toBeInstanceOf(ServiceError);
    expect(metadataError.data).toMatchObject({
      reason: 'google_maps_place_photo_api_error',
      upstreamStatus: 404
    });

    placesGet.mockResolvedValueOnce({
      data: {
        name: 'places/place-1/photos/photo-1/media',
        photoUri: 'https://lh3.googleusercontent.com/place-photo'
      }
    });
    downloadGet.mockRejectedValueOnce({
      response: { status: 403, statusText: 'Forbidden', data: 'Expired media URI' }
    });

    let downloadError = await client
      .getPlacePhoto({ photoName: 'places/place-1/photos/photo-1', maxWidthPx: 400 })
      .catch(error => error);
    expect(downloadError).toBeInstanceOf(ServiceError);
    expect(downloadError.data).toMatchObject({
      reason: 'google_maps_place_photo_download_error',
      upstreamStatus: 403
    });
  });
});
