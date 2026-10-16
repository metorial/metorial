import {
  AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX,
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface RafflysUser {
  id: string | number;
  name?: string;
  email?: string;
  rawProfile: Record<string, unknown>;
}

export interface RafflysPromotion {
  id: string | number;
  name: string;
  [key: string]: unknown;
}

export interface RafflysLead {
  id: string | number;
  created?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  [key: string]: unknown;
}

export class Client {
  private http;
  private redactor: AuthConfigSecretRedactor;

  constructor(config: { token: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token)) {
      throw createApiServiceError(
        'Provide a valid Rafflys API key from your account settings.',
        {
          reason: 'invalid_credentials'
        }
      );
    }
    this.redactor = new AuthConfigSecretRedactor({
      token: config.token,
      encodedToken: encodeURIComponent(config.token)
    });
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app-sorteos.com/api/v2',
      authHeader: { name: 'X-API-KEY', value: config.token },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error => this.apiError(error)
    });
  }

  private apiError(error: unknown) {
    return buildApiServiceError(error, {
      providerLabel: 'Rafflys',
      reason: 'rafflys_api_error',
      parent: {},
      extractResponse: (input, helpers) => {
        let response = helpers.getResponse(input);
        if (response?.data !== undefined) return response;
        // The pinned SDK stores normalized HTTP response bodies in error baggage.
        if (isApiErrorRecord(input) && isApiErrorRecord(input.data)) {
          let baggage = input.data.baggage;
          if (isApiErrorRecord(baggage) && baggage.response !== undefined) {
            return { ...response, data: baggage.response };
          }
        }
        return response;
      },
      formatMessage: ({ statusLabel, message }) => {
        let safeMessage = this.redactor
          .redactEmbedded(`${statusLabel}${message}`)
          .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}encodedToken$$`, '[redacted]')
          .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}encodedToken`, '[redacted]')
          .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token$$`, '[redacted]')
          .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token`, '[redacted]');
        if (/^\s*</.test(safeMessage)) {
          safeMessage =
            'The provider returned an unreadable error. Check the API key and request.';
        }
        return `Rafflys API request failed: ${safeMessage.slice(0, 1000)}`;
      }
    });
  }

  private invalidResponse(field: string): never {
    throw createApiServiceError(`Rafflys returned an invalid response (${field}).`, {
      reason: 'invalid_api_response'
    });
  }

  private async get(path: string): Promise<unknown> {
    let response = await this.http.get<unknown>(path);
    if (isApiErrorRecord(response.data) && response.data.success === false) {
      throw this.apiError({ response: { status: response.status, data: response.data } });
    }
    let serialized = JSON.stringify(response.data);
    if (
      serialized &&
      (this.redactor.redactEmbedded(serialized) !== serialized ||
        JSON.stringify(this.redactor.redactEmbedded(response.data)) !== serialized)
    ) {
      throw createApiServiceError(
        'Rafflys returned credentials in its response. Contact support.',
        {
          reason: 'unsafe_api_response'
        }
      );
    }
    return response.data;
  }

  private record(value: unknown, field: string): Record<string, unknown> {
    if (!isApiErrorRecord(value)) this.invalidResponse(field);
    return value;
  }

  private validateId(value: unknown, field: string): string | number {
    if (
      (typeof value !== 'string' || !value.trim()) &&
      (typeof value !== 'number' || !Number.isFinite(value))
    ) {
      this.invalidResponse(field);
    }
    return value as string | number;
  }

  private validateOptionalString(value: unknown, field: string): string | undefined {
    if (value !== undefined && typeof value !== 'string') this.invalidResponse(field);
    return value;
  }

  private rows(value: unknown, field: string): Record<string, unknown>[] {
    let rows = isApiErrorRecord(value) ? (value.data ?? value) : value;
    if (!Array.isArray(rows)) this.invalidResponse(field);
    return rows.map((row, index) => this.record(row, `${field}[${index}]`));
  }

  async getUser(): Promise<RafflysUser> {
    let user = this.record(await this.get('/users/me'), 'user');
    return {
      id: this.validateId(user.id, 'user.id'),
      name: this.validateOptionalString(user.name || user.username, 'user.name'),
      email: this.validateOptionalString(user.email, 'user.email'),
      rawProfile: user
    };
  }

  async listPromotions(): Promise<RafflysPromotion[]> {
    let promotions = this.rows(await this.get('/promotions'), 'promotions');
    for (let [index, promotion] of promotions.entries()) {
      this.validateId(promotion.id, `promotions[${index}].id`);
      if (typeof promotion.name !== 'string')
        this.invalidResponse(`promotions[${index}].name`);
    }
    return promotions as RafflysPromotion[];
  }

  async getPromotionLeads(promotionId: string): Promise<RafflysLead[]> {
    if (!promotionId.trim() || promotionId === '.' || promotionId === '..') {
      throw createApiServiceError('Provide a promotion ID returned by List Promotions.', {
        reason: 'invalid_promotion_id'
      });
    }
    let leads = this.rows(
      await this.get(`/promotions/${encodeURIComponent(promotionId)}/leads`),
      'leads'
    );
    for (let [index, lead] of leads.entries()) {
      this.validateId(lead.id, `leads[${index}].id`);
      for (let field of ['created', 'email', 'firstName', 'lastName', 'fullName', 'phone']) {
        this.validateOptionalString(lead[field], `leads[${index}].${field}`);
      }
    }
    return leads as RafflysLead[];
  }
}
