import { badRequestError, ServiceError } from '@lowerdeck/error';

export let linearServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let linearApiError = (message: string) =>
  linearServiceError(`Linear API request failed: ${message}`);
