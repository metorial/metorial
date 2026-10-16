import { createApiServiceError, pickDefined } from 'slates';

type Location = {
  lat?: number;
  lon?: number;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

export let locationParams = (input: Location, allowZip = false) => {
  if (input.lat !== undefined && input.lon !== undefined) {
    if (input.lat < -90 || input.lat > 90 || input.lon < -180 || input.lon > 180) {
      throw createApiServiceError(
        'Latitude must be between -90 and 90, and longitude between -180 and 180.'
      );
    }
    return { lat: input.lat, lon: input.lon };
  }
  if (input.city?.trim()) {
    return pickDefined({ city: input.city, state: input.state, country: input.country });
  }
  if (allowZip && input.zip?.trim()) return { zip: input.zip };
  throw createApiServiceError(
    `Provide both lat and lon, a city${allowZip ? ', or a US ZIP code' : ''}.`
  );
};
