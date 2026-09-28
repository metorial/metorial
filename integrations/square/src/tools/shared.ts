import { z } from 'zod';
import type { SquareCustomer, SquareLocation } from '../lib/types';

export let customerOutputSchema = z.object({
  customerId: z.string().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  companyName: z.string().optional(),
  nickname: z.string().optional(),
  emailAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.record(z.string(), z.any()).optional(),
  note: z.string().optional(),
  referenceId: z.string().optional(),
  birthday: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
  segmentIds: z.array(z.string()).optional(),
  preferences: z.record(z.string(), z.any()).optional(),
  creationSource: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().optional()
});

export let locationOutputSchema = z.object({
  locationId: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  businessName: z.string().optional(),
  phoneNumber: z.string().optional(),
  websiteUrl: z.string().optional(),
  businessEmail: z.string().optional(),
  description: z.string().optional(),
  address: z.record(z.string(), z.any()).optional(),
  capabilities: z.array(z.string()).optional(),
  merchantId: z.string().optional(),
  createdAt: z.string().optional()
});

export let mapCustomer = (customer: SquareCustomer) => ({
  customerId: customer.id,
  givenName: customer.given_name,
  familyName: customer.family_name,
  companyName: customer.company_name,
  nickname: customer.nickname,
  emailAddress: customer.email_address,
  phoneNumber: customer.phone_number,
  address: customer.address,
  note: customer.note,
  referenceId: customer.reference_id,
  birthday: customer.birthday,
  groupIds: customer.group_ids,
  segmentIds: customer.segment_ids,
  preferences: customer.preferences,
  creationSource: customer.creation_source,
  createdAt: customer.created_at,
  updatedAt: customer.updated_at,
  version: customer.version
});

export let mapLocation = (location: SquareLocation) => ({
  locationId: location.id,
  name: location.name,
  status: location.status,
  type: location.type,
  country: location.country,
  currency: location.currency,
  timezone: location.timezone,
  businessName: location.business_name,
  phoneNumber: location.phone_number,
  websiteUrl: location.website_url,
  businessEmail: location.business_email,
  description: location.description,
  address: location.address,
  capabilities: location.capabilities,
  merchantId: location.merchant_id,
  createdAt: location.created_at
});
