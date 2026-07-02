import { createAxios } from 'slates';

export interface EmailValidationResult {
  email: string;
  didYouMean: string | null;
  user: string | null;
  domain: string | null;
  formatValid: boolean | null;
  mxFound: boolean | null;
  smtpCheck: boolean | null;
  catchAll: boolean | null;
  role: boolean | null;
  disposable: boolean | null;
  free: boolean | null;
  score: number | null;
}

interface RawEmailValidationResult {
  email: string;
  did_you_mean: string | null;
  user: string | null;
  domain: string | null;
  format_valid: boolean | null;
  mx_found: boolean | null;
  smtp_check: boolean | null;
  catch_all: boolean | null;
  role: boolean | null;
  disposable: boolean | null;
  free: boolean | null;
  score: number | null;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: number;
    type: string;
    info: string;
  };
}

let mapResult = (raw: RawEmailValidationResult): EmailValidationResult => ({
  email: raw.email,
  didYouMean: raw.did_you_mean ?? null,
  user: raw.user ?? null,
  domain: raw.domain ?? null,
  formatValid: raw.format_valid ?? null,
  mxFound: raw.mx_found ?? null,
  smtpCheck: raw.smtp_check ?? null,
  catchAll: raw.catch_all ?? null,
  role: raw.role ?? null,
  disposable: raw.disposable ?? null,
  free: raw.free ?? null,
  score: raw.score ?? null
});

let checkForError = (data: any) => {
  if (data && data.success === false && data.error) {
    let err = data as ApiErrorResponse;
    throw new Error(
      `Mailboxlayer API error (${err.error.code}): ${err.error.type} - ${err.error.info}`
    );
  }
};

export class Client {
  private api;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://apilayer.net/api',
      params: {
        access_key: config.token
      }
    });
  }

  async validateEmail(params: {
    email: string;
    smtp?: boolean;
    catchAll?: boolean;
  }): Promise<EmailValidationResult> {
    let queryParams: Record<string, string> = {
      email: params.email
    };

    if (params.smtp === false) {
      queryParams.smtp = '0';
    }

    if (params.catchAll === true) {
      queryParams.catch_all = '1';
    }

    let response = await this.api.get('/check', { params: queryParams });
    checkForError(response.data);
    return mapResult(response.data as RawEmailValidationResult);
  }

  async bulkValidateEmails(params: {
    emails: string[];
    smtp?: boolean;
    catchAll?: boolean;
  }): Promise<EmailValidationResult[]> {
    let queryParams: Record<string, string> = {
      emails: params.emails.join(',')
    };

    if (params.smtp === false) {
      queryParams.smtp = '0';
    }

    if (params.catchAll === true) {
      queryParams.catch_all = '1';
    }

    let response = await this.api.get('/bulk_check', { params: queryParams });
    checkForError(response.data);
    let results = response.data as RawEmailValidationResult[];
    return results.map(mapResult);
  }
}
