import { AuthConfigSecretRedactor, createAuthenticatedAxios, pickDefined } from 'slates';
import {
  enumValue,
  id,
  integer,
  invalid,
  ORIGIN,
  type RedditAuth,
  type Row,
  row,
  safeApiError,
  sanitize,
  text,
  timestamp,
  unexpected
} from './contracts';

const trackingTypes: Record<string, string> = {
  Purchase: 'PURCHASE',
  AddToCart: 'ADD_TO_CART',
  SignUp: 'SIGN_UP',
  Lead: 'LEAD',
  ViewContent: 'VIEW_CONTENT',
  Search: 'SEARCH',
  AddToWishlist: 'ADD_TO_WISHLIST',
  PageVisit: 'PAGE_VISIT',
  Custom: 'CUSTOM'
};
export class ConversionsClient {
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  private readonly redactor: AuthConfigSecretRedactor;
  readonly version: 'v2' | 'v3';
  constructor(
    auth: RedditAuth,
    private readonly pixelId: string,
    version?: 'v2' | 'v3'
  ) {
    text(auth.token, 'Credential');
    id(pixelId, 'Pixel ID');
    if (auth.authKind === 'oauth' && auth.canSendConversions !== true)
      invalid(
        'This OAuth method grants account-management scopes, not adsconversions. Connect with Conversion OAuth or a Conversion Access Token for event submission.'
      );
    this.version = version ?? auth.conversionApiVersion ?? 'v2';
    enumValue(this.version, ['v2', 'v3'], 'CAPI version');
    this.redactor = new AuthConfigSecretRedactor({
      token: auth.token,
      refreshToken: auth.refreshToken
    });
    this.http = createAuthenticatedAxios({
      baseURL: `${ORIGIN}/api/${this.version === 'v2' ? 'v2.0' : 'v3'}`,
      authHeader: { value: `Bearer ${auth.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: safeApiError
    });
  }
  private event(input: Row, actionSource?: unknown): Row {
    const at = Date.parse(timestamp(input.eventAt, 'eventAt'));
    if (at > Date.now() || at < Date.now() - 7 * 86400000)
      invalid(
        'eventAt must have occurred within the last seven days and must not be in the future.'
      );
    const tracking = text(input.trackingType, 'trackingType');
    if (!trackingTypes[tracking]) invalid('Unsupported conversion trackingType.');
    if (tracking === 'Custom') {
      const name = text(input.customEventName, 'customEventName');
      if ([...name].length > 64)
        invalid('customEventName must be at most 64 Unicode characters.');
    } else if (input.customEventName !== undefined)
      invalid('customEventName is only used for Custom events.');
    if (
      !(
        input.clickId ||
        input.email ||
        input.externalId ||
        input.uuid ||
        input.idfa ||
        input.aaid ||
        (input.ipAddress && input.userAgent)
      )
    )
      invalid(
        'Provide a matching signal: clickId, email, externalId, uuid, a mobile advertising ID, or both ipAddress and userAgent.'
      );
    const user: Row = {};
    for (const [source, target] of [
      ['email', 'email'],
      ['externalId', 'external_id'],
      ['uuid', 'uuid'],
      ['ipAddress', 'ip_address'],
      ['userAgent', 'user_agent'],
      ['idfa', 'idfa'],
      ['aaid', 'aaid']
    ] as const)
      if (input[source] !== undefined) user[target] = text(input[source], source);
    if (input.screenWidth !== undefined || input.screenHeight !== undefined) {
      const dimensions: Row = {};
      for (const [source, target] of [
        ['screenWidth', 'width'],
        ['screenHeight', 'height']
      ] as const)
        if (input[source] !== undefined) {
          const value = integer(input[source], source);
          if (value > 32767) invalid(`${source} must be at most 32767.`);
          dimensions[target] = value;
        }
      user.screen_dimensions = dimensions;
    }
    const metadata: Row = {};
    if (input.conversionId !== undefined)
      metadata.conversion_id = text(input.conversionId, 'conversionId');
    if (input.itemCount !== undefined)
      metadata.item_count = integer(input.itemCount, 'itemCount');
    if (input.currency !== undefined) {
      const currency = text(input.currency, 'currency');
      if (!/^[A-Z]{3}$/.test(currency))
        invalid('currency must be a three-letter uppercase ISO currency code.');
      metadata.currency = currency;
    }
    if (input.valueDecimal !== undefined) {
      if (
        typeof input.valueDecimal !== 'number' ||
        !Number.isFinite(input.valueDecimal) ||
        input.valueDecimal < 0
      )
        invalid('valueDecimal must be a finite nonnegative amount in base currency units.');
      metadata[this.version === 'v2' ? 'value_decimal' : 'value'] = input.valueDecimal;
    }
    if (input.products !== undefined) {
      if (!Array.isArray(input.products)) invalid('products must be an array.');
      metadata.products = (input.products as unknown[]).map(value => {
        const product = row(value);
        return pickDefined({
          id: text(product.productId, 'Product ID'),
          name:
            product.productName === undefined
              ? undefined
              : text(product.productName, 'Product name'),
          category:
            product.productCategory === undefined
              ? undefined
              : text(product.productCategory, 'Product category')
        });
      });
    }
    const event: Row = {
      event_at: this.version === 'v2' ? new Date(at).toISOString() : at,
      [this.version === 'v2' ? 'event_type' : 'type']: pickDefined({
        tracking_type: this.version === 'v2' ? tracking : trackingTypes[tracking],
        custom_event_name: input.customEventName
      })
    };
    if (input.clickId !== undefined) event.click_id = text(input.clickId, 'clickId');
    if (Object.keys(user).length) event.user = user;
    if (Object.keys(metadata).length)
      event[this.version === 'v2' ? 'event_metadata' : 'metadata'] = metadata;
    if (this.version === 'v3')
      event.action_source = enumValue(
        input.actionSource ?? actionSource,
        ['WEBSITE', 'APP', 'OTHER', 'PHYSICAL_STORE'],
        'actionSource (required for v3)'
      );
    else if (input.actionSource !== undefined || actionSource !== undefined)
      event.action_source = enumValue(
        input.actionSource ?? actionSource,
        ['WEBSITE', 'APP', 'OTHER', 'PHYSICAL_STORE'],
        'actionSource'
      );
    return event;
  }
  async send(input: Row) {
    if (
      !Array.isArray(input.events) ||
      input.events.length < 1 ||
      input.events.length > (this.version === 'v3' ? 1000 : 500)
    )
      invalid(`Provide 1–${this.version === 'v3' ? 1000 : 500} conversion events.`);
    if (this.version === 'v2' && input.testId !== undefined)
      invalid(
        'testId belongs to CAPI v3. Select apiVersion=v3 explicitly to use Event Testing.'
      );
    const events = (input.events as unknown[]).map(value =>
      this.event(row(value), input.actionSource)
    );
    const payload = pickDefined({
      events,
      test_id: input.testId === undefined ? undefined : text(input.testId, 'testId')
    });
    const response = await this.http.post(
      this.version === 'v2'
        ? `/conversions/events/${this.pixelId}`
        : `/pixels/${this.pixelId}/conversion_events`,
      this.version === 'v2' ? payload : { data: payload }
    );
    if (response.status !== 200) unexpected();
    const receipt = row(sanitize(response.data, this.redactor));
    if (this.version === 'v3') text(row(receipt.data).message, 'Provider acknowledgment');
    if (
      receipt.success === false ||
      receipt.error !== undefined ||
      (Array.isArray(receipt.errors) && receipt.errors.length > 0)
    )
      unexpected();
    return {
      eventsSent: events.length,
      response: receipt,
      apiVersion: this.version,
      acknowledged: true,
      attributionVerified: false
    };
  }
}
