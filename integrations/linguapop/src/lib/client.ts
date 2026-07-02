import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://app.linguapop.eu/api/actions'
});

export interface Language {
  name: string;
  code: string;
}

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

export interface InvitationResponse {
  invitationId: string;
  testUrl: string;
  kioskCode?: string;
}

export class Client {
  constructor(private token: string) {}

  async getLanguages(): Promise<Language[]> {
    let response = await http.get('/getLanguages', {
      params: {
        apiKey: this.token
      }
    });
    return response.data;
  }

  async createInvitation(params: CreateInvitationParams): Promise<InvitationResponse> {
    let body: Record<string, unknown> = {
      apiKey: this.token,
      candidateName: params.candidateName,
      candidateEmail: params.candidateEmail,
      language: params.languageCode
    };

    if (params.externalId !== undefined) {
      body.externalId = params.externalId;
    }
    if (params.sendEmail !== undefined) {
      body.sendEmail = params.sendEmail;
    }
    if (params.kioskMode !== undefined) {
      body.kioskMode = params.kioskMode;
    }
    if (params.includeReading !== undefined) {
      body.includeReading = params.includeReading;
    }
    if (params.includeListening !== undefined) {
      body.includeListening = params.includeListening;
    }
    if (params.returnUrl !== undefined) {
      body.returnUrl = params.returnUrl;
    }
    if (params.callbackUrl !== undefined) {
      body.callbackUrl = params.callbackUrl;
    }

    let response = await http.post('/createInvitation', body);
    return response.data;
  }
}
