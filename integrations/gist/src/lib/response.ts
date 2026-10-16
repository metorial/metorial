import {
  buildApiServiceError,
  createApiServiceError,
  isApiErrorRecord,
  pickDefined,
  pushBoundedApiErrorDetail
} from 'slates';

export let gistApiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Gist',
    reason: 'gist_api_error',
    operation,
    detailKeys: ['message', 'detail', 'error', 'error_description', 'code'],
    nestedKeys: ['error', 'errors'],
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractMessage: (value, helpers) => {
      let body = helpers.getResponseWithBody(value)?.data;
      let details: string[] = [];
      helpers.collectDetails(body, details, {
        detailKeys: ['message', 'detail', 'error', 'error_description'],
        nestedKeys: ['error', 'errors']
      });
      if (isApiErrorRecord(body) && isApiErrorRecord(body.errors)) {
        for (let [field, value] of Object.entries(body.errors)) {
          let reasons: string[] = [];
          helpers.collectDetails(value, reasons);
          for (let reason of reasons)
            pushBoundedApiErrorDetail(details, `${field}: ${reason}`);
        }
      }
      return details.length ? details.join(' - ').slice(0, 1000) : undefined;
    },
    extractUpstreamCode: (_value, response) => {
      let body = response?.data;
      if (!isApiErrorRecord(body)) return undefined;
      let queue: unknown[] = [body];
      for (let depth = 0; depth < 5 && queue.length; depth++) {
        let next: unknown[] = [];
        for (let entry of queue) {
          if (Array.isArray(entry)) {
            next.push(...entry);
            continue;
          }
          if (!isApiErrorRecord(entry)) continue;
          let code = entry.code ?? entry.error_code;
          if (typeof code === 'string' || typeof code === 'number') return String(code);
          next.push(entry.error, entry.errors);
        }
        queue = next;
      }
      return undefined;
    }
  });

export let requireValue = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`${label} is required.`, { reason: 'invalid_input' });
  }
  return value;
};

export let requiredId = (value: unknown): string => {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'number' && !Number.isFinite(value)) ||
    !String(value).trim()
  ) {
    throw createApiServiceError('Gist returned a resource without a valid ID.', {
      reason: 'invalid_response'
    });
  }
  return String(value);
};

export let requiredText = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError('Gist returned an invalid required text field.', {
      reason: 'invalid_response'
    });
  }
  return value;
};

export let responseList = (value: unknown): any[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError('Gist returned an invalid resource list.', {
      reason: 'invalid_response'
    });
  }
  if (value.some(item => !isApiErrorRecord(item))) {
    throw createApiServiceError('Gist returned an invalid resource in a list.', {
      reason: 'invalid_response'
    });
  }
  return value;
};

export let validatePagination = (input: { page?: number; perPage?: number }) => {
  for (let [key, value] of Object.entries(input)) {
    if (
      value !== undefined &&
      (!Number.isSafeInteger(value) || value < 1 || (key === 'perPage' && value > 60))
    ) {
      throw createApiServiceError(
        `${key} must be a positive integer${key === 'perPage' ? ' no greater than 60' : ''}.`,
        { reason: 'invalid_pagination' }
      );
    }
  }
};

export let translationsBody = (values: any[] | undefined) => {
  if (values === undefined) return undefined;
  let result: Record<string, unknown> = Object.create(null);
  for (let value of values) {
    let locale = requireValue(value.locale, 'Translation locale');
    if (Object.hasOwn(result, locale)) {
      throw createApiServiceError('Provide only one translation per locale.', {
        reason: 'invalid_input'
      });
    }
    result[locale] = pickDefined({
      name: value.name,
      title: value.title,
      description: value.description,
      html_text: value.htmlText,
      status: value.status,
      icon: value.icon,
      author_id: value.authorId
    });
  }
  return result;
};

// Preserve original provider responses separately; normalize only compatibility summaries.
export let normalizeResponse = (value: unknown): any => {
  if (Array.isArray(value)) return value.map(normalizeResponse);
  if (!isApiErrorRecord(value)) return value;
  let result: Record<string, any> = {};
  for (let [key, item] of Object.entries(value)) {
    if (item === null && key === 'custom_properties') continue;
    if (
      [
        'custom_properties',
        'location_data',
        'social_profiles',
        'properties',
        'fields',
        'submissions',
        'form_subscriptions',
        'statistics',
        'pages',
        'page'
      ].includes(key)
    ) {
      result[key] = item;
    } else if (item !== null) {
      result[key] = normalizeResponse(item);
    }
  }
  for (let [key, legacy] of Object.entries({
    ecommerce_store: 'store',
    ecommerce_stores: 'stores',
    ecommerce_customer: 'customer',
    ecommerce_product: 'product',
    ecommerce_product_variant: 'product_variant',
    ecommerce_cart: 'cart',
    ecommerce_order: 'order',
    form_subscriptions: 'submissions'
  })) {
    if (result[key] !== undefined) result[legacy] = result[key];
  }
  if (result.id === undefined) {
    for (let key of [
      'order_id',
      'product_variant_id',
      'product_id',
      'customer_id',
      'store_id'
    ]) {
      if (result[key] !== undefined) {
        result.id = result[key];
        break;
      }
    }
  }
  if (typeof result.price === 'string') {
    let price = result.price.trim() ? Number(result.price) : Number.NaN;
    if (!Number.isFinite(price))
      throw createApiServiceError('Gist returned an invalid product price.', {
        reason: 'invalid_response'
      });
    result.price = price;
  }
  result.subject ??= result.title;
  result.name ??= result.title;
  result.email ??= result.email_address;
  result.currency ??= result.currency_code;
  result.status ??= result.state;
  result.pages ??= result.page;
  result.open_rate ??= result.email_open_rate;
  result.click_rate ??= result.email_click_rate;
  result.subscriber_count ??= result.active_subscriber_count;
  if (isApiErrorRecord(result.tags) && Array.isArray(result.tags.tags))
    result.tags = result.tags.tags;
  if (isApiErrorRecord(result.author)) {
    result.author_id ??= result.author.id;
    result.author_type ??= result.author.type;
  }
  if (Array.isArray(result.contacts)) result.contact_id ??= result.contacts[0]?.id;
  if (isApiErrorRecord(result.assignee)) {
    if (result.assignee.type === 'team') result.team_id ??= result.assignee.id;
    else result.assignee_id ??= result.assignee.id;
  }
  if (
    typeof result.unsubscribed_from_emails === 'string' &&
    ['true', 'false'].includes(result.unsubscribed_from_emails)
  ) {
    result.unsubscribed_from_emails = result.unsubscribed_from_emails === 'true';
  }
  if (isApiErrorRecord(result.translations)) {
    result.translations = Object.entries(result.translations).map(([locale, translation]) => ({
      ...requireRecord(translation),
      locale
    }));
  }
  return pickDefined(result);
};

let requireRecord = (value: unknown) => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError('Gist returned an invalid translation object.', {
      reason: 'invalid_response'
    });
  return value;
};
