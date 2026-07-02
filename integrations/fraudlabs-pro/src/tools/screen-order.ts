import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ipGeolocationSchema = z
  .object({
    ip: z.string().optional(),
    continent: z.string().optional(),
    country_code: z.string().optional(),
    country_name: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    zip_code: z.string().optional(),
    timezone: z.string().optional(),
    isp_name: z.string().optional(),
    domain: z.string().optional(),
    netspeed: z.string().optional(),
    mobile_mnc: z.string().optional(),
    mobile_mcc: z.string().optional(),
    mobile_brand: z.string().optional(),
    elevation: z.number().optional(),
    usage_type: z.string().optional(),
    is_proxy: z.boolean().optional(),
    is_in_blacklist: z.boolean().optional()
  })
  .optional();

let billingAddressSchema = z
  .object({
    ip_distance_in_km: z.number().optional(),
    ip_distance_in_mile: z.number().optional(),
    is_ip_country_match: z.boolean().optional()
  })
  .optional();

let shippingAddressSchema = z
  .object({
    is_address_ship_forward: z.boolean().optional(),
    is_bill_city_match: z.boolean().optional(),
    is_bill_state_match: z.boolean().optional(),
    is_bill_country_match: z.boolean().optional(),
    is_bill_postcode_match: z.boolean().optional(),
    is_export_controlled_country: z.boolean().optional(),
    is_in_blacklist: z.boolean().optional()
  })
  .optional();

let emailAddressSchema = z
  .object({
    is_free: z.boolean().optional(),
    is_disposable: z.boolean().optional(),
    is_domain_exist: z.boolean().optional(),
    is_new_domain_name: z.boolean().optional(),
    is_in_blacklist: z.boolean().optional()
  })
  .optional();

let phoneNumberSchema = z
  .object({
    is_disposable: z.boolean().optional(),
    is_in_blacklist: z.boolean().optional()
  })
  .optional();

let usernameSchema = z
  .object({
    is_high_risk: z.boolean().optional(),
    is_in_blacklist: z.boolean().optional()
  })
  .optional();

let creditCardSchema = z
  .object({
    card_brand: z.string().optional(),
    card_type: z.string().optional(),
    card_issuing_bank: z.string().optional(),
    card_issuing_country: z.string().optional(),
    is_prepaid: z.boolean().optional(),
    is_bin_exist: z.boolean().optional(),
    is_bin_country_match: z.boolean().optional(),
    is_in_blacklist: z.boolean().optional()
  })
  .optional();

let deviceSchema = z
  .object({
    is_malware_exploit: z.boolean().optional(),
    is_in_blacklist: z.boolean().optional()
  })
  .optional();

export let screenOrder = SlateTool.create(spec, {
  name: 'Screen Order',
  key: 'screen_order',
  description: `Screens an online transaction for payment fraud by analyzing IP geolocation, email, billing/shipping addresses, credit card details, device fingerprints, and blacklist data. Returns a fraud score (0-100) with a recommended action (APPROVE, REJECT, or REVIEW). Supply more input parameters for higher accuracy.`,
  instructions: [
    'The IP address is required. All other fields are optional but improve detection accuracy.',
    'For credit cards, provide the first 6-8 digits (BIN) rather than the full card number.',
    'Use ISO 3166 alpha-2 country codes (e.g., US, GB, DE) for country fields.',
    'Use ISO 4217 currency codes (e.g., USD, EUR, GBP) for currency.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      ip: z.string().describe('IP address of the online transaction (IPv4 or IPv6)'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      billCompany: z.string().optional().describe('Billing company name'),
      billAddress: z.string().optional().describe('Billing street address'),
      billCity: z.string().optional().describe('Billing city'),
      billState: z.string().optional().describe('Billing state or province code'),
      billCountry: z.string().optional().describe('Billing country code (ISO 3166 alpha-2)'),
      billZipCode: z.string().optional().describe('Billing ZIP or postal code'),
      shipFirstName: z.string().optional().describe('Shipping recipient first name'),
      shipLastName: z.string().optional().describe('Shipping recipient last name'),
      shipAddress: z.string().optional().describe('Shipping street address'),
      shipCity: z.string().optional().describe('Shipping city'),
      shipState: z.string().optional().describe('Shipping state or province code'),
      shipCountry: z.string().optional().describe('Shipping country code (ISO 3166 alpha-2)'),
      shipZipCode: z.string().optional().describe('Shipping ZIP or postal code'),
      userPhone: z.string().optional().describe('Customer phone number'),
      email: z.string().optional().describe('Customer email address'),
      emailHash: z
        .string()
        .optional()
        .describe('SHA-256 hash of customer email (alternative to email)'),
      emailDomain: z.string().optional().describe('Domain of customer email address'),
      username: z.string().optional().describe('Customer account username'),
      binNo: z
        .string()
        .optional()
        .describe('First 6 or 8 digits of the credit card (BIN number)'),
      cardHash: z.string().optional().describe('SHA-256 hash of the full credit card number'),
      avsResult: z.string().optional().describe('AVS result code from the payment processor'),
      cvvResult: z.string().optional().describe('CVV2 result code from the payment processor'),
      userOrderId: z
        .string()
        .optional()
        .describe('Your own order/transaction identifier (max 15 characters)'),
      amount: z.number().optional().describe('Transaction amount'),
      quantity: z.number().optional().describe('Total quantity of items in the order'),
      currency: z.string().optional().describe('Currency code (ISO 4217, e.g., USD, EUR)'),
      department: z.string().optional().describe('Product or service department'),
      paymentGateway: z.string().optional().describe('Payment gateway name'),
      paymentMode: z
        .enum([
          'creditcard',
          'paypal',
          'cod',
          'bankdeposit',
          'giftcard',
          'crypto',
          'wired',
          'others'
        ])
        .optional()
        .describe('Payment method used'),
      couponCode: z.string().optional().describe('Coupon code applied to the order'),
      flpChecksum: z
        .string()
        .optional()
        .describe('FraudLabs Pro device validation checksum from the JavaScript agent')
    })
  )
  .output(
    z.object({
      fraudlabsproId: z.string().describe('Unique transaction ID assigned by FraudLabs Pro'),
      fraudScore: z.number().describe('Fraud risk score from 0 (low risk) to 100 (high risk)'),
      fraudStatus: z.string().describe('Recommended action: APPROVE, REJECT, or REVIEW'),
      userOrderId: z.string().optional().describe('Your order ID if provided'),
      triggeredRules: z
        .array(z.any())
        .optional()
        .describe('List of fraud rules triggered by this transaction'),
      ipGeolocation: ipGeolocationSchema.describe(
        'IP geolocation and proxy detection details'
      ),
      billingAddress: billingAddressSchema.describe('Billing address validation results'),
      shippingAddress: shippingAddressSchema.describe('Shipping address validation results'),
      emailAddress: emailAddressSchema.describe('Email address validation results'),
      phoneNumber: phoneNumberSchema.describe('Phone number validation results'),
      username: usernameSchema.describe('Username risk assessment results'),
      creditCard: creditCardSchema.describe('Credit card validation results'),
      device: deviceSchema.describe('Device fingerprint validation results'),
      remainingCredits: z.number().optional().describe('Remaining API credits in your account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    ctx.info('Screening order for fraud...');

    let result = await client.screenOrder(ctx.input);

    let output = {
      fraudlabsproId: result.fraudlabspro_id,
      fraudScore: result.fraudlabspro_score,
      fraudStatus: result.fraudlabspro_status,
      userOrderId: result.user_order_id || undefined,
      triggeredRules: result.fraudlabspro_rules || undefined,
      ipGeolocation: result.ip_geolocation || undefined,
      billingAddress: result.billing_address || undefined,
      shippingAddress: result.shipping_address || undefined,
      emailAddress: result.email_address || undefined,
      phoneNumber: result.phone_number || undefined,
      username: result.username || undefined,
      creditCard: result.credit_card || undefined,
      device: result.device || undefined,
      remainingCredits: result.remaining_credits
    };

    let statusEmoji =
      output.fraudStatus === 'APPROVE' ? '✅' : output.fraudStatus === 'REJECT' ? '❌' : '⚠️';

    return {
      output,
      message: `${statusEmoji} Fraud screening complete. **Score: ${output.fraudScore}/100** — Status: **${output.fraudStatus}**. Transaction ID: \`${output.fraudlabsproId}\`.`
    };
  })
  .build();
