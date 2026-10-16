import { createApiServiceError, pickDefined } from 'slates';

export let recordResponse = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createApiServiceError(
      'Cloudlayer returned an unexpected response. Try again or contact Cloudlayer support.'
    );
  }
  return value as Record<string, unknown>;
};

export let textValue = (...values: unknown[]) =>
  values.find((value): value is string => typeof value === 'string');
export let numberValue = (...values: unknown[]) =>
  values.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
export let requiredText = (label: string, ...values: unknown[]) => {
  let value = values.find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  if (value === undefined)
    throw createApiServiceError(
      `Cloudlayer did not return the ${label}. Try again or contact Cloudlayer support.`
    );
  return value;
};
export let timestampValue = (...values: unknown[]) => {
  for (let value of values) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) {
      let date = new Date(value);
      if (Number.isFinite(date.getTime())) return date.toISOString();
    }
  }
  return undefined;
};

// Job responses can contain apiKeyUsed and credentials in params. Preserve other
// provider details, including nulls, without publishing those credentials.
let privateField =
  /^(apiKeyUsed|apiKey|token|accessToken|refreshToken|password|secretAccessKey|accessKeyId|authentication|cookies|authorization)$/i;
let publicDetails = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(publicDetails);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !privateField.test(key))
        .map(([key, child]) => [key, publicDetails(child)])
    );
  return value;
};
export let rawResponse = (value: Record<string, unknown>) =>
  recordResponse(publicDetails(value));

export let responseItems = (value: unknown, key: string) => {
  if (Array.isArray(value)) return value.map(recordResponse);
  let record = recordResponse(value);
  let items = record[key] ?? record.data;
  if (!Array.isArray(items))
    throw createApiServiceError(
      `Cloudlayer did not return a ${key} list. Try again or contact Cloudlayer support.`
    );
  return items.map(recordResponse);
};

export let generationOutput = (result: Record<string, unknown>) => ({
  jobId: requiredText('job ID', result.jobId, result.id),
  status: requiredText('job status', result.status),
  ...pickDefined({
    assetUrl: textValue(result.assetUrl, result.url),
    previewUrl: textValue(result.previewUrl),
    timestamp: timestampValue(result.timestamp),
    raw: rawResponse(result)
  })
});
export let jobOutput = (result: Record<string, unknown>) => ({
  jobId: requiredText('job ID', result.id, result.jobId),
  status: requiredText('job status', result.status),
  ...pickDefined({
    jobType: textValue(result.type, result.jobType),
    fileSize: numberValue(result.size, result.fileSize),
    processingTime: numberValue(result.processTime, result.processingTime, result.duration),
    creditsUsed: numberValue(result.apiCreditCost, result.creditsUsed, result.credits),
    assetUrl: textValue(result.assetUrl, result.url),
    createdAt: timestampValue(result.timestamp, result.createdAt),
    raw: rawResponse(result)
  })
});
export let assetOutput = (result: Record<string, unknown>) => ({
  assetId: requiredText('asset ID', result.id, result.assetId),
  ...pickDefined({
    jobId: textValue(result.jobId),
    ext: textValue(result.ext),
    type: textValue(result.type),
    size: numberValue(result.size),
    url: textValue(result.url),
    timestamp: timestampValue(result.timestamp),
    raw: rawResponse(result)
  })
});
