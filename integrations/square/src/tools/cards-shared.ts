import { z } from 'zod';

export let cardBillingAddressInput = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  locality: z.string().optional(),
  administrativeDistrictLevel1: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().length(2).optional()
});

export let cardBillingAddressOutput = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  locality: z.string().optional(),
  administrativeDistrictLevel1: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
});

export let cardOutputSchema = z.object({
  cardId: z.string(),
  customerId: z.string().optional(),
  merchantId: z.string().optional(),
  enabled: z.boolean().optional(),
  cardBrand: z.string().optional(),
  cardType: z.string().optional(),
  prepaidType: z.string().optional(),
  lastFour: z.string().optional(),
  expMonth: z.number().optional(),
  expYear: z.number().optional(),
  cardholderName: z.string().optional(),
  billingAddress: cardBillingAddressOutput.optional(),
  referenceId: z.string().optional(),
  version: z.number().optional(),
  createdAt: z.string().optional(),
  disabledAt: z.string().optional()
});

interface SquareAddress {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  administrative_district_level_1?: string;
  postal_code?: string;
  country?: string;
}

export interface SquareCard {
  id: string;
  customer_id?: string;
  merchant_id?: string;
  enabled?: boolean;
  card_brand?: string;
  card_type?: string;
  prepaid_type?: string;
  last_4?: string;
  exp_month?: number;
  exp_year?: number;
  cardholder_name?: string;
  billing_address?: SquareAddress;
  reference_id?: string;
  version?: number;
  created_at?: string;
  disabled_at?: string;
}

export let mapCardBillingAddressInput = (
  address: z.infer<typeof cardBillingAddressInput>
) => ({
  address_line_1: address.addressLine1,
  address_line_2: address.addressLine2,
  locality: address.locality,
  administrative_district_level_1: address.administrativeDistrictLevel1,
  postal_code: address.postalCode,
  country: address.country
});

export let mapCard = (card: SquareCard) => ({
  cardId: card.id,
  customerId: card.customer_id,
  merchantId: card.merchant_id,
  enabled: card.enabled,
  cardBrand: card.card_brand,
  cardType: card.card_type,
  prepaidType: card.prepaid_type,
  lastFour: card.last_4,
  expMonth: card.exp_month,
  expYear: card.exp_year,
  cardholderName: card.cardholder_name,
  billingAddress: card.billing_address
    ? {
        addressLine1: card.billing_address.address_line_1,
        addressLine2: card.billing_address.address_line_2,
        locality: card.billing_address.locality,
        administrativeDistrictLevel1: card.billing_address.administrative_district_level_1,
        postalCode: card.billing_address.postal_code,
        country: card.billing_address.country
      }
    : undefined,
  referenceId: card.reference_id,
  version: card.version,
  createdAt: card.created_at,
  disabledAt: card.disabled_at
});
