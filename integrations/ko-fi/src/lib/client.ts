import { createHash, timingSafeEqual } from 'node:crypto';
import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { paymentEnvelopeSchema } from '../triggers/event-schemas';

export interface KofiShopItem {
  direct_link_code: string;
  variation_name?: string | null;
  quantity?: number;
}

export interface KofiShipping {
  full_name: string;
  street_address: string;
  city: string;
  state_or_province: string;
  postal_code: string;
  country: string;
  country_code: string;
  telephone: string;
}

export interface KofiWebhookPayload {
  verification_token: string;
  message_id: string;
  timestamp: string;
  type: 'Donation' | 'Subscription' | 'Shop Order' | 'Commission';
  is_public: boolean;
  from_name: string;
  message: string | null;
  amount: string;
  url: string;
  email: string;
  currency: string;
  is_subscription_payment: boolean;
  is_first_subscription_payment: boolean;
  kofi_transaction_id: string;
  shop_items: KofiShopItem[] | null;
  tier_name: string | null;
  shipping: KofiShipping | null;
}

export let verifyWebhookToken = (
  payload: Pick<KofiWebhookPayload, 'verification_token'>,
  expectedToken: string
): boolean => {
  if (!payload.verification_token || !expectedToken.trim()) return false;
  return timingSafeEqual(
    createHash('sha256').update(payload.verification_token, 'utf8').digest(),
    createHash('sha256').update(expectedToken, 'utf8').digest()
  );
};

export let parseWebhookPayload = (data: Record<string, unknown>): KofiWebhookPayload => {
  try {
    return paymentEnvelopeSchema
      .extend({
        type: z.enum(['Donation', 'Subscription', 'Shop Order', 'Commission']),
        shop_items: z
          .array(
            z
              .object({
                direct_link_code: z.string(),
                variation_name: z.string().nullable().optional(),
                quantity: z.number().optional()
              })
              .loose()
          )
          .nullable(),
        shipping: z
          .object({
            full_name: z.string(),
            street_address: z.string(),
            city: z.string(),
            state_or_province: z.string(),
            postal_code: z.string(),
            country: z.string(),
            country_code: z.string(),
            telephone: z.string()
          })
          .loose()
          .nullable(),
        message: z.string().nullable(),
        tier_name: z.string().nullable()
      })
      .parse({
        ...data,
        message: data.message ?? null,
        tier_name: data.tier_name ?? null,
        shop_items:
          typeof data.shop_items === 'string'
            ? JSON.parse(data.shop_items)
            : (data.shop_items ?? null),
        shipping:
          typeof data.shipping === 'string'
            ? JSON.parse(data.shipping)
            : (data.shipping ?? null)
      });
  } catch {
    // Do not attach parse errors: they can contain webhook credentials or PII.
    throw createApiServiceError('Invalid Ko-fi payment notification.');
  }
};
