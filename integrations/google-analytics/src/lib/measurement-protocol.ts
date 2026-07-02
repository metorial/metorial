import { z } from 'zod';
import { googleAnalyticsServiceError } from './errors';

export let measurementIdSchema = z
  .string()
  .optional()
  .describe(
    'GA4 web data stream Measurement ID, e.g. "G-XXXXXXXXXX". Optional when integration config or Measurement Protocol auth provides measurementId. Otherwise, discover it with manage_data_streams action "list" or "get" and use webStreamData.measurementId.'
  );

export let apiSecretSchema = z
  .string()
  .optional()
  .describe(
    'Measurement Protocol API secret for the selected data stream. Discover an existing secret with manage_data_streams action "list_secrets" or create one with "create_secret".'
  );

type MeasurementProtocolCredentials = {
  measurementId?: string;
  apiSecret?: string;
};

let normalizeOptionalCredential = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  let trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export let resolveMeasurementProtocolCredentials = (
  input: MeasurementProtocolCredentials,
  config: Pick<MeasurementProtocolCredentials, 'measurementId'>,
  auth: MeasurementProtocolCredentials
) => {
  let measurementId =
    normalizeOptionalCredential(input.measurementId) ??
    normalizeOptionalCredential(config.measurementId) ??
    normalizeOptionalCredential(auth.measurementId);
  let apiSecret =
    normalizeOptionalCredential(input.apiSecret) ??
    normalizeOptionalCredential(auth.apiSecret);

  if (!measurementId || !apiSecret) {
    throw googleAnalyticsServiceError(
      'Measurement Protocol requires measurementId and apiSecret. Pass measurementId directly, configure measurementId for the integration, or list data streams with manage_data_streams action "list" to select webStreamData.measurementId. Pass apiSecret directly, or list/create a Measurement Protocol secret with action "list_secrets" or "create_secret". Measurement Protocol Only auth may also provide these values as auth credentials.'
    );
  }

  return {
    measurementId,
    apiSecret
  };
};
