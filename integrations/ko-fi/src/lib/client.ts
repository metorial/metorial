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
  payload: KofiWebhookPayload,
  expectedToken: string
): boolean => {
  return payload.verification_token === expectedToken;
};

export let parseWebhookPayload = (data: Record<string, unknown>): KofiWebhookPayload => {
  let shopItems: KofiShopItem[] | null = null;
  if (data.shop_items) {
    if (typeof data.shop_items === 'string') {
      shopItems = JSON.parse(data.shop_items);
    } else {
      shopItems = data.shop_items as KofiShopItem[];
    }
  }

  let shipping: KofiShipping | null = null;
  if (data.shipping) {
    if (typeof data.shipping === 'string') {
      shipping = JSON.parse(data.shipping);
    } else {
      shipping = data.shipping as KofiShipping;
    }
  }

  return {
    verification_token: data.verification_token as string,
    message_id: data.message_id as string,
    timestamp: data.timestamp as string,
    type: data.type as KofiWebhookPayload['type'],
    is_public: data.is_public as boolean,
    from_name: data.from_name as string,
    message: (data.message as string | null) ?? null,
    amount: data.amount as string,
    url: data.url as string,
    email: data.email as string,
    currency: data.currency as string,
    is_subscription_payment: data.is_subscription_payment as boolean,
    is_first_subscription_payment: data.is_first_subscription_payment as boolean,
    kofi_transaction_id: data.kofi_transaction_id as string,
    shop_items: shopItems,
    tier_name: (data.tier_name as string | null) ?? null,
    shipping
  };
};
