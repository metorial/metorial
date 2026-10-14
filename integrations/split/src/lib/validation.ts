import { createApiServiceError } from 'slates';
import type { Bucket } from './client';

export let validatePagination = (
  offset: number | undefined,
  limit: number | undefined,
  maximum: number
) => {
  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
    throw createApiServiceError('offset must be a non-negative whole number.');
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > maximum)) {
    throw createApiServiceError(`limit must be a whole number between 1 and ${maximum}.`);
  }
};

export let validateBuckets = (buckets: Bucket[] | undefined, field: string) => {
  if (buckets === undefined) return;
  if (
    buckets.length === 0 ||
    buckets.some(
      bucket => !Number.isFinite(bucket.size) || bucket.size < 0 || bucket.size > 100
    ) ||
    Math.abs(buckets.reduce((sum, bucket) => sum + bucket.size, 0) - 100) > 0.000001
  ) {
    throw createApiServiceError(
      `${field} must contain buckets with sizes between 0 and 100 that sum to 100.`
    );
  }
};

export let validateTrafficAllocation = (value: number | undefined) => {
  if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 100)) {
    throw createApiServiceError('trafficAllocation must be between 0 and 100.');
  }
};
