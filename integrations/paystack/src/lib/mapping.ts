import { createApiServiceError } from 'slates';
import type { ProviderRecord } from './transport';

export const customerOutput = (customer: ProviderRecord) => ({
  customerCode: customer.customer_code,
  email: customer.email,
  firstName: customer.first_name ?? null,
  lastName: customer.last_name ?? null,
  phone: customer.phone ?? null
});

export const paymentPageUrl = (slug: unknown) => {
  if (typeof slug !== 'string' || !/^[A-Za-z0-9_-]+$/.test(slug)) {
    throw createApiServiceError('Paystack returned an invalid payment-page slug.', {
      reason: 'paystack.invalid_response'
    });
  }
  return `https://paystack.com/pay/${slug}`;
};

export const isProviderIdentifier = (value: unknown): value is string | number =>
  typeof value === 'string' || typeof value === 'number';
