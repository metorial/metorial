// Mapping of Planyo notification event codes to trigger categories

export let RESERVATION_EVENTS = [
  'new_verified_reservation',
  'reservation_confirmed',
  'reservation_admin_canceled',
  'reservation_user_canceled',
  'reservation_auto_canceled',
  'reservation_admin_modified',
  'reservation_user_modified',
  'reservation_products_user_modified',
  'reservation_price_updated',
  'reservation_removed',
  'checked_in',
  'checked_out',
  'noshow',
  'confirmed_cleared',
  'added_to_waitlist',
  'new_price_quotation'
] as const;

export let PAYMENT_EVENTS = [
  'reservation_payment_received',
  'reservation_payment_removed',
  'coupon_payment_received',
  'coupon_payment_removed'
] as const;

export let USER_EVENTS = ['user_updated'] as const;

export let RESOURCE_EVENTS = [
  'resource_settings_changed',
  'resource_removed',
  'vacation_modified'
] as const;

export let ALL_EVENTS = [
  ...RESERVATION_EVENTS,
  ...PAYMENT_EVENTS,
  ...USER_EVENTS,
  ...RESOURCE_EVENTS
] as const;

export type ReservationEventCode = (typeof RESERVATION_EVENTS)[number];
export type PaymentEventCode = (typeof PAYMENT_EVENTS)[number];
export type UserEventCode = (typeof USER_EVENTS)[number];
export type ResourceEventCode = (typeof RESOURCE_EVENTS)[number];
