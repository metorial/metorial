import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  autocompletePlaces: vi.fn(),
  getPlaceDetails: vi.fn(),
  getPlacePhoto: vi.fn()
}));

vi.mock('./lib/client', async importOriginal => {
  let actual = await importOriginal<typeof import('./lib/client')>();
  return {
    ...actual,
    GoogleMapsClient: class {
      autocompletePlaces(...args: unknown[]) {
        return clientMocks.autocompletePlaces(...args);
      }

      getPlaceDetails(...args: unknown[]) {
        return clientMocks.getPlaceDetails(...args);
      }

      getPlacePhoto(...args: unknown[]) {
        return clientMocks.getPlacePhoto(...args);
      }
    }
  };
});

import { provider } from './index';

let createToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'api_key',
        output: { token: 'maps-secret' }
      }
    }
  });

describe('Google Maps Places tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes place and query predictions from autocomplete', async () => {
    clientMocks.autocompletePlaces.mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            place: 'places/place-1',
            placeId: 'place-1',
            text: { text: 'Pizza One, San Francisco, CA' },
            structuredFormat: {
              mainText: { text: 'Pizza One' },
              secondaryText: { text: 'San Francisco, CA' }
            },
            types: ['pizza_restaurant', 'restaurant'],
            distanceMeters: 125
          }
        },
        {
          queryPrediction: {
            text: { text: 'pizza near San Francisco' },
            structuredFormat: {
              mainText: { text: 'pizza' },
              secondaryText: { text: 'near San Francisco' }
            }
          }
        }
      ]
    });

    let result = await createToolTestClient().invokeTool('autocomplete', {
      input: 'pizza',
      sessionToken: '123e4567-e89b-12d3-a456-426614174000',
      includeQueryPredictions: true,
      locationBias: { latitude: 37.7937, longitude: -122.3965, radiusMeters: 500 },
      origin: { latitude: 37.7937, longitude: -122.3965 }
    });

    expect(clientMocks.autocompletePlaces).toHaveBeenCalledWith({
      input: 'pizza',
      sessionToken: '123e4567-e89b-12d3-a456-426614174000',
      includedPrimaryTypes: undefined,
      includedRegionCodes: undefined,
      languageCode: undefined,
      regionCode: undefined,
      inputOffset: undefined,
      includeQueryPredictions: true,
      includePureServiceAreaBusinesses: undefined,
      includeFutureOpeningBusinesses: undefined,
      locationBias: { latitude: 37.7937, longitude: -122.3965, radiusMeters: 500 },
      locationRestriction: undefined,
      origin: { latitude: 37.7937, longitude: -122.3965 }
    });
    expect(result.output).toEqual({
      suggestions: [
        {
          kind: 'place',
          text: 'Pizza One, San Francisco, CA',
          mainText: 'Pizza One',
          secondaryText: 'San Francisco, CA',
          placeId: 'place-1',
          placeResourceName: 'places/place-1',
          types: ['pizza_restaurant', 'restaurant'],
          distanceMeters: 125
        },
        {
          kind: 'query',
          text: 'pizza near San Francisco',
          mainText: 'pizza',
          secondaryText: 'near San Francisco'
        }
      ],
      totalCount: 2
    });
  });

  it('rejects simultaneous location bias and restriction with ServiceError', async () => {
    let error = await createToolTestClient()
      .invokeTool('autocomplete', {
        input: 'pizza',
        locationBias: { latitude: 37.7, longitude: -122.4, radiusMeters: 500 },
        locationRestriction: { latitude: 37.7, longitude: -122.4, radiusMeters: 500 }
      })
      .catch(error => error);

    expect(error.message).toContain('Provide either locationBias or locationRestriction');
    expect(clientMocks.autocompletePlaces).not.toHaveBeenCalled();
  });

  it.each([
    {
      input: {
        input: 'pizza',
        includedPrimaryTypes: ['(cities)', 'restaurant']
      },
      message: 'Use (cities) or (regions) by itself'
    },
    {
      input: {
        input: 'pizza',
        includedRegionCodes: ['US'],
        includeQueryPredictions: true
      },
      message: 'Remove includedRegionCodes when requesting query predictions'
    },
    {
      input: { input: '🍕', inputOffset: 2 },
      message: 'inputOffset must be between 0 and the 1-character input length'
    }
  ])('rejects incompatible autocomplete input: $message', async ({ input, message }) => {
    let error = await createToolTestClient()
      .invokeTool('autocomplete', input)
      .catch(error => error);

    expect(error.message).toContain(message);
    expect(clientMocks.autocompletePlaces).not.toHaveBeenCalled();
  });

  it('returns place photo bytes only through one Slate attachment', async () => {
    let jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    clientMocks.getPlacePhoto.mockResolvedValue({
      photoName: 'places/place-1/photos/photo/../1',
      placeId: 'place-1',
      mimeType: 'image/jpeg',
      content: jpeg
    });

    let result = await createToolTestClient().invokeTool('get_place_photo', {
      photoName: 'places/place-1/photos/photo-1',
      maxWidthPx: 800
    });

    expect(clientMocks.getPlacePhoto).toHaveBeenCalledWith({
      photoName: 'places/place-1/photos/photo-1',
      maxWidthPx: 800,
      maxHeightPx: undefined
    });
    expect(result.output).toEqual({
      placeId: 'place-1',
      fileName: 'google-maps-place-1-place-photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 4,
      maxWidthPx: 800,
      attachmentCount: 1
    });
    expect(result.attachments).toEqual([
      {
        mimeType: 'image/jpeg',
        content: { type: 'content', encoding: 'base64', content: jpeg.toString('base64') }
      }
    ]);
    expect(result.output).not.toHaveProperty('photoUri');
    expect(result.output).not.toHaveProperty('contentBase64');
    expect(JSON.stringify(result.output)).not.toContain(jpeg.toString('base64'));
  });

  it('exposes current photo resource names and attribution metadata from Place Details', async () => {
    clientMocks.getPlaceDetails.mockResolvedValue({
      id: 'place-1',
      displayName: { text: 'Pizza One' },
      photos: [
        {
          name: 'places/place-1/photos/photo-1',
          widthPx: 1200,
          heightPx: 800,
          authorAttributions: [
            {
              displayName: 'Example Photographer',
              uri: 'https://maps.google.com/maps/contrib/example',
              photoUri: 'https://lh3.googleusercontent.com/profile'
            }
          ]
        }
      ]
    });

    let result = await createToolTestClient().invokeTool('get_place_details', {
      placeId: 'place-1',
      sessionToken: '123e4567-e89b-12d3-a456-426614174000'
    });

    expect(clientMocks.getPlaceDetails).toHaveBeenCalledWith({
      placeId: 'place-1',
      languageCode: undefined,
      sessionToken: '123e4567-e89b-12d3-a456-426614174000'
    });
    expect(result.output.photos).toEqual([
      {
        name: 'places/place-1/photos/photo-1',
        widthPx: 1200,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: 'Example Photographer',
            uri: 'https://maps.google.com/maps/contrib/example',
            photoUri: 'https://lh3.googleusercontent.com/profile'
          }
        ]
      }
    ]);
  });
});
