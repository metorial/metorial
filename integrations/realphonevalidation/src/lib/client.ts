import { XMLParser, XMLValidator } from 'fast-xml-parser';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface ProviderResponse {
  [key: string]: unknown;
}

export interface TurboV3Response extends ProviderResponse {
  status: string;
  error_text: string | Record<string, never>;
  phone_type: string;
  caller_name: string;
  carrier: string;
  caller_type: string;
}

export interface TurboStandardResponse extends ProviderResponse {
  status: string;
  error_text: string | Record<string, never>;
  iscell: string;
  cnam: string;
  carrier: string;
}

export interface ScrubPlusResponse extends ProviderResponse {
  status: string;
  error_text: string | Record<string, never>;
  phone_type: string;
}

export interface ScrubResponse extends ProviderResponse {
  status: string;
  error_text: string | Record<string, never>;
  iscell?: string;
  carrier?: string;
}

export interface ActiveCheckResponse extends ProviderResponse {
  RESPONSECODE: string;
  RESPONSEMSG: string | Record<string, never>;
}

export interface WirelessIdResponse extends ProviderResponse {
  RESPONSECODE: string;
  RESPONSEMSG: string | Record<string, never>;
}

export interface DncLookupResponse extends ProviderResponse {
  RESPONSECODE: string;
  RESPONSEMSG: string | Record<string, never>;
  national_dnc: string;
  state_dnc: string;
  dma: string;
  litigator: string;
  iscell: string;
  id: string;
}

export interface DncPlusResponse extends ProviderResponse {
  status: string;
  error_text: string | Record<string, never>;
  iscell: string;
  national_dnc: string;
  state_dnc: string;
  dma: string;
  litigator: string;
}

export interface FraudCheckResponse extends ProviderResponse {
  status: string;
  error_text: string | Record<string, never>;
  id: string;
  req_phone: string;
  tstatus: string;
  tdesc: string;
  phn_type: string;
  phn_desc: string;
  risk_level: string;
  recommendation: string;
  score: string;
  carrier: string;
  location_city: string;
  location_state: string;
  location_zip: string;
  location_metro_code: string;
  location_county: string;
  location_country_name: string;
  location_country_iso2: string;
  location_country_iso3: string;
  location_latitude: string;
  location_longitude: string;
  location_time_zone: string;
}

export interface ReassignedNumberResponse extends ProviderResponse {
  RESPONSECODE: string;
  RESPONSEMSG: string | Record<string, never>;
  reassigned: string;
  id: string;
}

export interface EmailVerifyResponse extends ProviderResponse {
  status: string;
  error_text: string | Record<string, never>;
  disposable?: string;
  connected?: string;
}

export interface EmailLightningResponse extends ProviderResponse {
  retval: string;
  error_text: string | Record<string, never>;
  id: string;
  email: string;
  reachable: string;
  accept_all: string;
  disposable: string;
  free: string;
  isp: string;
  caution: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Enter your RealPhoneValidation API token.', {
        reason: 'missing_api_token'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.realvalidation.com/rpvWebService/',
      params: { token: config.token, output: 'json' },
      contentType: false,
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'RealPhoneValidation',
          reason: 'api_request_failed'
        })
    });
  }

  private async request<T extends ProviderResponse>(
    endpoint: string,
    params: Record<string, string>,
    requiredFields: string[]
  ): Promise<T> {
    if (params.phone !== undefined && !/^\d{10}$/.test(params.phone)) {
      throw createApiServiceError('Phone number must contain exactly 10 US numeric digits.', {
        reason: 'invalid_phone_number'
      });
    }
    if (params.email !== undefined && !params.email.trim()) {
      throw createApiServiceError('Enter an email address to verify.', {
        reason: 'missing_email_address'
      });
    }

    let response = await this.axios.get<unknown>(endpoint, { params });
    let data = response.data;
    if (typeof data === 'string' && data.trimStart().startsWith('<')) {
      try {
        if (data.includes('<!DOCTYPE') || XMLValidator.validate(data) !== true) {
          throw createApiServiceError('RealPhoneValidation returned invalid XML.', {
            reason: 'invalid_api_response'
          });
        }
        let parsed: unknown = new XMLParser({
          ignoreAttributes: true,
          parseTagValue: false,
          trimValues: false
        }).parse(data);
        data = isApiErrorRecord(parsed) ? parsed.response : undefined;
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'RealPhoneValidation',
          operation: 'response parsing',
          reason: 'invalid_api_response'
        });
      }
    }
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError(
        'RealPhoneValidation returned an unexpected response format.',
        {
          reason: 'invalid_api_response'
        }
      );
    }
    let result = data;
    let errorCode = [result.RESPONSECODE, result.retval, result.status]
      .filter(
        (value): value is string | number =>
          typeof value === 'string' || typeof value === 'number'
      )
      .map(String)
      .find(
        value =>
          [
            '-1',
            '102',
            'unauthorized',
            'invalid-format',
            'invalid-phone',
            'bad-zip-code',
            'server-unavailable'
          ].includes(value.toLowerCase()) || value.toLowerCase().startsWith('error')
      );
    if (
      endpoint === 'RealPhoneValidationFraudChk.php' &&
      ['500', '501', '599'].includes(String(result.tstatus))
    ) {
      errorCode = String(result.tstatus);
    }
    let errorText = [result.RESPONSEMSG, result.error_text]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' - ');
    if (errorCode !== undefined) {
      throw createApiServiceError(
        `RealPhoneValidation could not complete the lookup (${errorCode})${errorText ? `: ${errorText}` : '.'}`,
        { reason: 'provider_lookup_failed', upstreamCode: errorCode }
      );
    }

    let missingFields = requiredFields.filter(field => typeof result[field] !== 'string');
    if (missingFields.length > 0) {
      throw createApiServiceError(
        `RealPhoneValidation returned an incomplete lookup result. Missing text fields: ${missingFields.join(', ')}.`,
        { reason: 'incomplete_api_response' }
      );
    }
    return result as T;
  }

  turboV3(phone: string): Promise<TurboV3Response> {
    return this.request('TurboV3.php', { phone }, ['status', 'phone_type', 'carrier']);
  }

  turboStandard(phone: string): Promise<TurboStandardResponse> {
    // Keep the carrier-bearing legacy Turbo route used by existing standard-mode calls.
    return this.request('RealPhoneValidationTurbo.php', { phone }, [
      'status',
      'iscell',
      'carrier'
    ]);
  }

  scrubPlus(phone: string): Promise<ScrubPlusResponse> {
    return this.request('ScrubPlus.php', { phone }, ['status']);
  }

  scrub(phone: string): Promise<ScrubResponse> {
    return this.request('RealPhoneValidationScrub.php', { phone }, ['status']);
  }

  async activeCheck(phone: string): Promise<ActiveCheckResponse> {
    let result = await this.request<ActiveCheckResponse>(
      'RealPhoneValidationActive.php',
      { phone },
      ['RESPONSECODE']
    );
    if (!['L', 'C', 'V', 'N'].includes(result.RESPONSECODE)) {
      throw createApiServiceError(
        'RealPhoneValidation returned an unrecognized active-status code.',
        {
          reason: 'unknown_active_status',
          upstreamCode: result.RESPONSECODE
        }
      );
    }
    return result;
  }

  wirelessId(phone: string): Promise<WirelessIdResponse> {
    return this.request('WirelessID.php', { phone }, ['RESPONSECODE']);
  }

  private requireDncFlags(result: DncLookupResponse | DncPlusResponse) {
    let unresolved = ['national_dnc', 'state_dnc', 'dma', 'litigator'].filter(
      field => result[field] !== 'Y' && result[field] !== 'N'
    );
    if (!['Y', 'N', 'V'].includes(result.iscell)) unresolved.push('iscell');
    if (unresolved.length > 0) {
      throw createApiServiceError(
        `RealPhoneValidation could not determine these DNC lookup fields: ${unresolved.join(', ')}. An unresolved result does not mean the number is absent from a list. Retry or confirm the result with the provider.`,
        { reason: 'unresolved_dnc_result' }
      );
    }
  }

  async dncLookup(phone: string): Promise<DncLookupResponse> {
    let result = await this.request<DncLookupResponse>('DNCLookup.php', { phone }, [
      'RESPONSECODE'
    ]);
    if (result.RESPONSECODE !== 'OK') {
      throw createApiServiceError(
        'RealPhoneValidation did not confirm the DNC lookup succeeded.',
        {
          reason: 'provider_lookup_failed',
          upstreamCode: result.RESPONSECODE
        }
      );
    }
    this.requireDncFlags(result);
    return result;
  }

  async dncPlus(phone: string): Promise<DncPlusResponse> {
    let result = await this.request<DncPlusResponse>('DNCPlus.php', { phone }, ['status']);
    this.requireDncFlags(result);
    return result;
  }

  fraudCheck(phone: string): Promise<FraudCheckResponse> {
    return this.request('RealPhoneValidationFraudChk.php', { phone }, [
      'risk_level',
      'score',
      'recommendation',
      'phn_desc',
      'carrier',
      'id',
      'tdesc'
    ]);
  }

  reassignedNumberLookup(
    phone: string,
    contactDate: string
  ): Promise<ReassignedNumberResponse> {
    let date = new Date(`${contactDate}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(contactDate) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== contactDate
    ) {
      throw createApiServiceError(
        'Consent date must be a valid calendar date in YYYY-MM-DD format.',
        {
          reason: 'invalid_consent_date'
        }
      );
    }
    return this.request('ReassignedNumberLookup.php', { phone, contact_date: contactDate }, [
      'reassigned',
      'id'
    ]);
  }

  emailVerify(email: string): Promise<EmailVerifyResponse> {
    return this.request('EmailVerify.php', { email }, ['status']);
  }

  emailLightning(email: string): Promise<EmailLightningResponse> {
    return this.request('RealEmailLightning.php', { email }, [
      'retval',
      'id',
      'email',
      'reachable',
      'accept_all',
      'disposable',
      'free',
      'isp',
      'caution'
    ]);
  }
}
