import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

let http = createAuthenticatedAxios({
  baseURL: 'https://app.linguapop.eu/api/actions',
  timeout: 30_000,
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Linguapop',
      reason: 'linguapop_api_error',
      extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
    })
});

let languagesSchema = z.array(z.looseObject({ name: z.string(), code: z.string() }));

let invitationSchema = z.looseObject({
  invitationId: z.number().int(),
  externalIdentifier: z.string().nullable().optional(),
  url: z.string(),
  emailSent: z.boolean(),
  kioskCode: z.string().nullable().optional()
});

export type Language = z.infer<typeof languagesSchema>[number];

export interface CreateInvitationParams {
  candidateName: string;
  candidateEmail: string;
  externalId?: string;
  languageCode: string;
  sendEmail?: boolean;
  kioskMode?: boolean;
  includeReading?: boolean;
  includeListening?: boolean;
  returnUrl?: string;
  callbackUrl?: string;
}

export type InvitationResponse = z.infer<typeof invitationSchema>;

export class Client {
  constructor(private token: string) {
    this.token = token.trim();
    if (!this.token) {
      throw createApiServiceError('A Linguapop integration API key is required.');
    }
  }

  async getLanguages(): Promise<Language[]> {
    let response = await http.get<unknown>('/getLanguages');
    let result = languagesSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError('Linguapop returned an unexpected language list.', {
        reason: 'linguapop_invalid_response'
      });
    }
    return result.data;
  }

  async createInvitation(params: CreateInvitationParams): Promise<InvitationResponse> {
    if (
      !params.candidateName.trim() ||
      !params.candidateEmail.trim() ||
      !params.languageCode.trim()
    ) {
      throw createApiServiceError(
        'Provide the candidate name, email address, and language code.'
      );
    }
    if (params.externalId !== undefined && params.externalId.length > 500) {
      throw createApiServiceError('The external identifier must be at most 500 characters.');
    }
    for (let [name, value] of [
      ['returnUrl', params.returnUrl],
      ['callbackUrl', params.callbackUrl]
    ] as const) {
      if (value !== undefined && value.length > 1000) {
        throw createApiServiceError(`${name} must be at most 1000 characters.`);
      }
    }

    let body = pickDefined({
      apiKey: this.token,
      name: params.candidateName,
      email: params.candidateEmail,
      languageCode: params.languageCode,
      externalIdentifier: params.externalId,
      sendEmail: params.sendEmail ?? false,
      generateKioskCode: params.kioskMode,
      testReading: params.includeReading,
      testListening: params.includeListening,
      returnUrl: params.returnUrl,
      callbackUrl: params.callbackUrl
    });

    let response = await http.post<unknown>('/sendInvitation', body);
    let result = invitationSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError('Linguapop returned an unexpected invitation response.', {
        reason: 'linguapop_invalid_response'
      });
    }
    return result.data;
  }
}
