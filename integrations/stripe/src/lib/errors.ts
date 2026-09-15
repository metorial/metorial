import { buildApiServiceError } from '@slates/provider';

export { createApiServiceError as stripeServiceError } from '@slates/provider';

export let stripeApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Stripe',
    reason: 'stripe_api_error',
    operation,
    detailKeys: ['message', 'type', 'code', 'decline_code', 'error_description', 'error'],
    nestedKeys: ['error', 'errors']
  });
