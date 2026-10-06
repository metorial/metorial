import {
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import {
  integer,
  invalid,
  type JsonRecord,
  mapCategory,
  mapContact,
  mapProduct,
  money,
  type OmnisendApiVersion,
  type OmnisendAuth,
  optionalBoolean,
  optionalText,
  record,
  recordArray,
  responseId,
  sanitizeResponse,
  stringArray,
  text,
  timestamp,
  url
} from './contracts';

export let safeApiError = (error: unknown, operation: string) => {
  let rawStatus =
    getApiErrorStatus(error) ??
    (isApiErrorRecord(error) && isApiErrorRecord(error.data)
      ? error.data.upstreamStatus
      : undefined);
  let status =
    typeof rawStatus === 'number'
      ? rawStatus
      : typeof rawStatus === 'string' && /^\d{3}$/.test(rawStatus)
        ? Number(rawStatus)
        : undefined;
  if (status !== undefined && (!Number.isInteger(status) || status < 100 || status > 599))
    status = undefined;
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Omnisend',
    reason: 'omnisend_api_error',
    operation,
    parent: {},
    formatMessage: () =>
      status === 410
        ? 'Omnisend rejected the selected API version as retired. Select a documented supported version and review its behavior before retrying.'
        : 'Omnisend ' +
          operation +
          ' failed' +
          (status === undefined ? '.' : ' (HTTP ' + status + ').') +
          ' Write completion may be unknown; do not automatically retry irreversible operations.',
    extractMessage: () => 'Provider details concealed.'
  });
};

export class OmnisendClient {
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  readonly version: OmnisendApiVersion;
  readonly baseUrl: string;
  readonly auth: OmnisendAuth;

  constructor(auth: OmnisendAuth | string, apiVersion: OmnisendApiVersion = 'v5') {
    this.auth = typeof auth === 'string' ? { token: auth } : auth;
    text(this.auth.token, 'credential');
    if (!['v5', '2026-03-15'].includes(apiVersion))
      invalid('Select the documented v5 or 2026-03-15 API version.');
    this.version = apiVersion;
    this.baseUrl = 'https://api.omnisend.com/' + (apiVersion === 'v5' ? 'v5' : 'api');
    let mode = this.auth.authType ?? (this.auth.refreshToken ? 'oauth' : 'api_key');
    if (!['oauth', 'api_key'].includes(mode))
      invalid('Reconnect using a supported API-key or OAuth authentication method.');
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      timeout: 30000,
      maxRedirects: 0,
      authHeader:
        mode === 'oauth'
          ? { value: 'Bearer ' + this.auth.token }
          : apiVersion === 'v5'
            ? { name: 'X-API-KEY', value: this.auth.token }
            : { value: 'Omnisend-API-Key ' + this.auth.token },
      headers: apiVersion === 'v5' ? {} : { 'Omnisend-Version': '2026-03-15' }
    });
  }

  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    data?: JsonRecord,
    params?: JsonRecord,
    statuses = [200]
  ) {
    let response: { status: number; data: unknown };
    try {
      response = await this.http.request<unknown>({ method, url: path, data, params });
    } catch (error) {
      throw safeApiError(error, method === 'GET' ? 'read' : 'write');
    }
    if (!statuses.includes(response.status))
      invalid(
        'Omnisend returned an unexpected status. Completion is unconfirmed; do not automatically retry writes.'
      );
    return sanitizeResponse(response.data, this.auth);
  }

  private pathId(id: string) {
    const value = text(id, 'resource ID');
    try {
      return encodeURIComponent(value);
    } catch {
      return invalid('Provide a resource ID containing valid Unicode.');
    }
  }

  private pageLink(value: unknown, path: string) {
    if (value === undefined || value === null || value === '') return undefined;
    let parsed: URL;
    try {
      parsed = new URL(text(value, 'pagination URL'));
    } catch {
      return invalid('Omnisend returned an invalid pagination URL.');
    }
    if (
      parsed.origin !== 'https://api.omnisend.com' ||
      parsed.pathname !== new URL(this.baseUrl + path).pathname ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    )
      invalid('Omnisend returned an unexpected pagination origin or resource.');
    return parsed;
  }

  private cursorPaging(result: JsonRecord, path: string) {
    if (result.paging === undefined && this.version === 'v5' && path !== '/contacts')
      return {};
    let paging = record(result.paging);
    if (this.version === 'v5') {
      let next = this.pageLink(paging.next, path),
        previous = this.pageLink(paging.previous, path);
      let nextCursor = next?.searchParams.get('after') ?? undefined,
        previousCursor = previous?.searchParams.get('before') ?? undefined;
      if ((next && !nextCursor) || (previous && !previousCursor))
        invalid('Omnisend returned a pagination link without the required cursor.');
      return { nextCursor, previousCursor };
    }
    let cursors = paging.cursors == null ? {} : record(paging.cursors);
    let nextCursor = optionalText(cursors.after),
      previousCursor = optionalText(cursors.before);
    let hasMore = optionalBoolean(paging.hasMore);
    if (hasMore === undefined || (hasMore && !nextCursor) || (!hasMore && nextCursor))
      invalid('Omnisend returned inconsistent cursor pagination.');
    return { nextCursor, previousCursor, hasMore };
  }

  private offsetPaging(result: JsonRecord, path: string, offset = 0) {
    let paging = record(result.paging);
    let next = this.pageLink(paging.next, path);
    const hasMore = optionalBoolean(paging.hasMore);
    if ((hasMore === true && !next) || (hasMore === false && next))
      invalid(
        'Omnisend returned inconsistent offset pagination. No continuation offset was guessed.'
      );
    let nextOffset: number | undefined;
    if (next) {
      let value = next.searchParams.get('offset');
      if (value === null || !/^\d+$/.test(value))
        invalid('Omnisend returned a next page without a valid offset.');
      nextOffset = integer(Number(value), 'provider next offset', offset + 1);
    }
    return { hasMore: next !== undefined, nextOffset };
  }

  async getBrand() {
    if (this.version === 'v5')
      invalid(
        'Brand discovery requires API version 2026-03-15; GET brand discovery is not documented for v5.'
      );
    let result = record(await this.request('GET', '/brands/current'));
    return {
      brandId: responseId(result.brandID ?? result.id),
      name: optionalText(result.name ?? result.brandName),
      website: optionalText(result.website),
      currency: optionalText(result.currency)
    };
  }

  async getContact(id: string) {
    let result = mapContact(await this.request('GET', '/contacts/' + this.pathId(id)));
    if (result.contactId !== id) invalid('Omnisend returned a different contact identity.');
    return result;
  }

  async listContacts(
    params: {
      email?: string;
      phone?: string;
      status?: string;
      segmentID?: string;
      tag?: string;
      limit?: number;
      after?: string;
      before?: string;
      updatedAfter?: string;
    } = {}
  ) {
    let query: JsonRecord = {};
    for (let key of [
      'email',
      'phone',
      'status',
      'segmentID',
      'tag',
      'after',
      'before'
    ] as const)
      if (params[key] !== undefined) query[key] = text(params[key], key);
    if (params.after !== undefined && params.before !== undefined)
      invalid('Use one pagination direction at a time.');
    query.limit = integer(params.limit, 'page size', 1, 250);
    if (params.updatedAfter !== undefined) {
      if (
        ['email', 'phone', 'status', 'segmentID', 'tag'].some(key => query[key] !== undefined)
      )
        invalid(
          'The update-date filter cannot be combined with contact identity, subscription, segment or tag filters.'
        );
      query[this.version === 'v5' ? 'updatedAfter' : 'updatedAtFrom'] = timestamp(
        params.updatedAfter
      );
    }
    if (this.version !== 'v5' && params.status !== undefined && params.tag !== undefined)
      invalid('The current API cannot combine status and tag filters.');
    let result = record(await this.request('GET', '/contacts', undefined, query));
    return {
      contacts: recordArray(result.contacts).map(mapContact),
      ...this.cursorPaging(result, '/contacts')
    };
  }

  private contactBody(input: JsonRecord, create: boolean) {
    let body = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined)
    );
    if (!create && Object.keys(body).length === 0)
      invalid('Provide at least one contact field to update.');
    let identifiers =
      body.identifiers === undefined
        ? []
        : recordArray(body.identifiers).map(identifier => ({ ...identifier }));
    if (body.email !== undefined) {
      let email = text(body.email, 'email');
      if (
        !identifiers.some(identifier => identifier.type === 'email' && identifier.id === email)
      )
        identifiers.push({ type: 'email', id: email });
    }
    if (body.phone !== undefined) {
      let phones = stringArray(body.phone) ?? [];
      for (let phone of phones)
        if (
          !identifiers.some(
            identifier => identifier.type === 'phone' && identifier.id === phone
          )
        )
          identifiers.push({ type: 'phone', id: text(phone, 'phone') });
    }
    let welcome = body.sendWelcomeEmail;
    delete body.email;
    delete body.phone;
    delete body.sendWelcomeEmail;
    let unique = new Set<string>();
    identifiers = identifiers.map(identifier => {
      if (!['email', 'phone'].includes(String(identifier.type)))
        invalid('Provide an email or phone identifier.');
      let id = text(identifier.id, 'contact identifier');
      if (identifier.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id))
        invalid('Provide a valid email identifier.');
      if (identifier.type === 'phone' && !/^\+[1-9]\d{5,14}$/.test(id))
        invalid('Provide a phone identifier in international format.');
      let key = String(identifier.type) + ':' + id;
      if (unique.has(key)) invalid('Provide each contact identifier only once.');
      unique.add(key);
      let result = { ...identifier };
      if (identifier.channels !== undefined) {
        let channels = record(identifier.channels),
          mapped: JsonRecord = {};
        for (let [channelName, value] of Object.entries(channels)) {
          if (channelName !== (identifier.type === 'email' ? 'email' : 'sms'))
            invalid('Each identifier must use its matching email or SMS channel.');
          let channel = { ...record(value) };
          if (
            !['subscribed', 'nonSubscribed', 'unsubscribed'].includes(String(channel.status))
          )
            invalid('Provide a documented channel subscription status.');
          if (channel.statusDate !== undefined) {
            timestamp(channel.statusDate);
            if (this.version !== 'v5') {
              channel.statusChangedAt = channel.statusDate;
              delete channel.statusDate;
            }
          }
          mapped[channelName] = channel;
        }
        result.channels = mapped;
      }
      if (identifier.consent !== undefined) {
        let consent = record(identifier.consent);
        if (consent.createdAt !== undefined) timestamp(consent.createdAt);
      }
      if (this.version !== 'v5')
        result.sendWelcomeMessage = identifier.type === 'email' && welcome === true;
      return result;
    });
    if (create && identifiers.length === 0)
      invalid('Provide at least one email or phone contact identifier.');
    if (
      input.identifiers !== undefined ||
      input.email !== undefined ||
      input.phone !== undefined
    )
      body.identifiers = identifiers;
    if (this.version === 'v5') body.sendWelcomeEmail = welcome === true;
    if (
      welcome === true &&
      !identifiers.some(
        identifier =>
          identifier.type === 'email' &&
          record(identifier.channels ?? {}).email !== undefined &&
          record(record(identifier.channels).email).status === 'subscribed'
      )
    )
      invalid('Email welcome messaging requires a subscribed email identifier.');
    if (body.tags !== undefined) {
      let tags = stringArray(body.tags) ?? [];
      if (tags.length > 100) invalid('Provide at most 100 contact tags.');
      for (let tag of tags) text(tag, 'contact tag');
    }
    if (body.customProperties !== undefined)
      this.validateCustomProperties(record(body.customProperties));
    if (body.birthdate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.birthdate)))
      invalid('Provide a birthdate in YYYY-MM-DD format.');
    if (!create && Object.keys(body).length === 0)
      invalid('Provide at least one contact field to update.');
    return body;
  }

  private validateCustomProperties(properties: JsonRecord) {
    for (let [key, value] of Object.entries(properties)) {
      if (!/^[A-Za-z0-9_]{1,128}$/.test(key))
        invalid(
          'Contact custom-property names must use letters, digits or underscores and contain at most 128 characters.'
        );
      if (
        value !== null &&
        !(
          typeof value === 'boolean' ||
          (typeof value === 'number' && Number.isFinite(value)) ||
          (typeof value === 'string' && value.length <= 2048) ||
          (Array.isArray(value) && value.every(item => typeof item === 'string'))
        )
      )
        invalid(
          'Contact custom-property values must be strings, finite numbers, booleans, string arrays or null.'
        );
    }
  }

  async createOrUpdateContact(input: JsonRecord) {
    return mapContact(
      await this.request(
        'POST',
        '/contacts',
        this.contactBody(input, true),
        undefined,
        [200, 201]
      )
    );
  }

  async updateContact(id: string, input: JsonRecord) {
    let path = '/contacts/' + this.pathId(id);
    let result = mapContact(await this.request('PATCH', path, this.contactBody(input, false)));
    if (result.contactId !== id)
      invalid(
        'Omnisend returned a different updated contact identity. Completion is unconfirmed.'
      );
    return result;
  }

  private productBody(input: JsonRecord) {
    let body = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined)
    );
    text(body.id, 'product ID', 100);
    text(body.title, 'product title', 255);
    url(body.url);
    if (!/^[A-Z]{3}$/.test(String(body.currency)))
      invalid('Provide a three-letter uppercase currency code.');
    if (!['inStock', 'outOfStock', 'notAvailable'].includes(String(body.status)))
      invalid('Provide the product availability status.');
    let variants = recordArray(body.variants);
    if (variants.length < 1 || variants.length > 500)
      invalid('Provide between one and 500 complete product variants.');
    let ids = new Set<string>();
    for (let variant of variants) {
      let id = text(variant.id, 'variant ID', 100);
      if (ids.has(id)) invalid('Provide distinct variant IDs.');
      ids.add(id);
      text(variant.title, 'variant title', 255);
      url(variant.url);
      money(variant.price);
      if (variant.strikeThroughPrice !== undefined) money(variant.strikeThroughPrice);
      if (variant.defaultImageUrl !== undefined) url(variant.defaultImageUrl);
      if (variant.images !== undefined)
        for (let image of stringArray(variant.images) ?? []) url(image);
      if ((stringArray(variant.images)?.length ?? 0) > 300)
        invalid('Provide at most 300 variant image URLs.');
      if (
        variant.description !== undefined &&
        (typeof variant.description !== 'string' || variant.description.length > 1000)
      )
        invalid('Variant descriptions must contain at most 1000 characters.');
      if (
        variant.sku !== undefined &&
        (typeof variant.sku !== 'string' || variant.sku.length > 255)
      )
        invalid('Variant SKUs must contain at most 255 characters.');
    }
    if (body.defaultImageUrl !== undefined) url(body.defaultImageUrl);
    if (body.images !== undefined)
      for (let image of stringArray(body.images) ?? []) url(image);
    if ((stringArray(body.images)?.length ?? 0) > 300)
      invalid('Provide at most 300 product image URLs.');
    if (
      body.description !== undefined &&
      (typeof body.description !== 'string' || body.description.length > 1000)
    )
      invalid('Product descriptions must contain at most 1000 characters.');
    for (let key of ['createdAt', 'updatedAt'])
      if (body[key] !== undefined) timestamp(body[key]);
    for (let key of ['tags', 'categoryIDs'])
      if ((stringArray(body[key])?.length ?? 0) > 100)
        invalid('Provide at most 100 tags or category IDs.');
    return body;
  }

  async getProduct(id: string) {
    let product = mapProduct(await this.request('GET', '/products/' + this.pathId(id)));
    if (product.productId !== id) invalid('Omnisend returned a different product identity.');
    return product;
  }

  async createProduct(input: JsonRecord) {
    let body = this.productBody(input);
    await this.request('POST', '/products', body, undefined, [201]);
    return this.getProduct(text(body.id, 'product ID'));
  }

  async updateProduct(id: string, input: JsonRecord) {
    if (input.id !== id) invalid('Replacement body and path product IDs must match.');
    let body = this.productBody(input);
    await this.request('PUT', '/products/' + this.pathId(id), body);
    return this.getProduct(id);
  }

  async listProducts(params: { offset?: number; limit?: number; sort?: string } = {}) {
    let offset = integer(params.offset, 'offset', 0) ?? 0;
    let query = {
      offset,
      limit: integer(params.limit, 'page size', 1, 250),
      sort: params.sort
    };
    let result = record(await this.request('GET', '/products', undefined, query));
    return {
      products: recordArray(result.products).map(mapProduct),
      ...this.offsetPaging(result, '/products', offset)
    };
  }

  async deleteProduct(id: string) {
    await this.request('DELETE', '/products/' + this.pathId(id), undefined, undefined, [204]);
  }

  async getCategory(id: string) {
    let category = mapCategory(
      await this.request('GET', '/product-categories/' + this.pathId(id))
    );
    if (category.categoryId !== id)
      invalid('Omnisend returned a different category identity.');
    return category;
  }

  async createCategory(input: JsonRecord) {
    let id = text(input.categoryID, 'category ID', 100);
    text(input.title, 'category title', 255);
    await this.request('POST', '/product-categories', input, undefined, [201]);
    return this.getCategory(id);
  }

  async listCategories(params: { offset?: number; limit?: number } = {}) {
    let offset = integer(params.offset, 'offset', 0) ?? 0;
    let result = record(
      await this.request('GET', '/product-categories', undefined, {
        offset,
        limit: integer(params.limit, 'page size', 1, 250)
      })
    );
    return {
      categories: recordArray(result.categories).map(mapCategory),
      ...this.offsetPaging(result, '/product-categories', offset)
    };
  }

  async deleteCategory(id: string) {
    await this.request(
      'DELETE',
      '/product-categories/' + this.pathId(id),
      undefined,
      undefined,
      [204]
    );
  }

  async listCampaigns(
    params: { updatedAtFrom?: string; limit?: number; after?: string } = {}
  ) {
    if (this.version === 'v5' && (params.limit !== undefined || params.after !== undefined))
      invalid(
        'Campaign page-size and cursor inputs require API version 2026-03-15; v5 documents an unpaged list.'
      );
    let query = {
      updatedAtFrom: timestamp(params.updatedAtFrom),
      limit: integer(params.limit, 'page size', 1, 250),
      after: params.after === undefined ? undefined : text(params.after, 'cursor')
    };
    let result = record(await this.request('GET', '/campaigns', undefined, query));
    let campaigns = recordArray(result.campaigns).map(item => {
      let content = item.content === undefined ? undefined : record(item.content);
      let email = content?.email === undefined ? undefined : record(content.email);
      let settings =
        item.sendingSettings === undefined ? undefined : record(item.sendingSettings);
      return {
        campaignId: responseId(item.id ?? item.campaignID),
        name: optionalText(item.name),
        channel: optionalText(item.channel),
        type: optionalText(item.type),
        status: optionalText(item.status),
        subjectLine: optionalText(item.subjectLine ?? email?.subjectLine),
        startDate: optionalText(item.startDate ?? item.startedAt),
        endDate: optionalText(item.endDate ?? item.endedAt),
        sendStartDate: optionalText(item.sendStartDate),
        sendEndDate: optionalText(item.sendEndDate),
        scheduledAt: optionalText(settings?.scheduledAt),
        createdAt: optionalText(item.createdAt),
        updatedAt: optionalText(item.updatedAt),
        tzoEnabled: optionalBoolean(item.tzoEnabled ?? settings?.isTZOptimizationEnabled)
      };
    });
    return { campaigns, ...this.cursorPaging(result, '/campaigns') };
  }

  async listAutomations(
    params: { updatedAtFrom?: string; limit?: number; after?: string } = {}
  ) {
    if (this.version === 'v5' && (params.limit !== undefined || params.after !== undefined))
      invalid(
        'Automation page-size and cursor inputs require API version 2026-03-15; v5 documents an unpaged list.'
      );
    let result = record(
      await this.request('GET', '/automations', undefined, {
        updatedAtFrom: timestamp(params.updatedAtFrom),
        limit: integer(params.limit, 'page size', 1, 250),
        after: params.after === undefined ? undefined : text(params.after, 'cursor')
      })
    );
    let automations = recordArray(result.automations).map(item => ({
      automationId: responseId(item.id ?? item.automationID),
      name: optionalText(item.name),
      status: optionalText(item.status),
      triggerType: optionalText(item.triggerType),
      createdAt: optionalText(item.createdAt),
      updatedAt: optionalText(item.updatedAt)
    }));
    return { automations, ...this.cursorPaging(result, '/automations') };
  }

  async sendEvent(input: JsonRecord) {
    text(input.eventName, 'event name');
    let contact = record(input.contact);
    if (contact.id === undefined && contact.email === undefined && contact.phone === undefined)
      invalid('Events require a contact ID, email or phone identifier.');
    if (contact.id !== undefined) text(contact.id, 'event contact ID');
    if (
      contact.email !== undefined &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(contact.email, 'email'))
    )
      invalid('Provide a valid event email identifier.');
    if (contact.phone !== undefined && !/^\+[1-9]\d{5,14}$/.test(text(contact.phone, 'phone')))
      invalid('Provide an international event phone identifier.');
    if (
      input.eventID !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[4567][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        text(input.eventID, 'event UUID')
      )
    )
      invalid('Provide a UUID v4, v5, v6 or v7 event ID.');
    timestamp(
      typeof input.eventTime === 'string' ? input.eventTime.replace(' ', 'T') : input.eventTime
    );
    if (contact.customProperties !== undefined)
      this.validateCustomProperties(record(contact.customProperties));
    if (contact.tags !== undefined && (stringArray(contact.tags)?.length ?? 0) > 100)
      invalid('Provide at most 100 contact tags.');
    if (input.properties !== undefined) {
      let properties = record(input.properties);
      for (let key of [
        'totalPrice',
        'subTotalPrice',
        'totalDiscount',
        'totalTax',
        'shippingPrice',
        'productPrice'
      ])
        if (properties[key] !== undefined) money(properties[key]);
      if (properties.lineItems !== undefined)
        for (let item of recordArray(properties.lineItems)) {
          for (let key of ['productPrice', 'productDiscount', 'productQuantity'])
            if (item[key] !== undefined) money(item[key]);
        }
    }
    let origin = input.origin === undefined ? 'api' : text(input.origin, 'event origin');
    await this.request('POST', '/events', { ...input, origin }, undefined, [202]);
  }
}
