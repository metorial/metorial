import { createAxios } from 'slates';

export interface GenderResult {
  name: string;
  q: string;
  gender: string | null;
  country: string;
  totalNames: number;
  probability: number;
}

export interface GenderSingleResponse {
  status: boolean;
  usedCredits: number;
  remainingCredits: number;
  expires: number;
  q: string;
  name: string;
  gender: string | null;
  country: string;
  totalNames: number;
  probability: number;
  duration: string;
}

export interface GenderBulkResponse {
  status: boolean;
  usedCredits: number;
  remainingCredits: number;
  expires: number;
  names: Array<{
    name: string;
    q: string;
    gender: string | null;
    country: string;
    totalNames: number;
    probability: number;
    id?: string;
  }>;
  duration: string;
}

export interface PhoneValidationResponse {
  status: boolean;
  remainingCredits: number;
  expires: number;
  duration: string;
  regionCode: string;
  countryCode: number;
  country: string;
  national: string;
  international: string;
  e164: string;
  isValid: boolean;
  isPossible: boolean;
  numberType: string;
  nationalSignificantNumber: string;
  rawInput: string;
  isGeographical: boolean;
  areaCode: string;
  location: string;
}

export interface UsageResponse {
  status: boolean;
  remaining: number;
  expiresAt: number;
}

let mapGenderSingleResponse = (data: any): GenderSingleResponse => ({
  status: data.status,
  usedCredits: data.used_credits,
  remainingCredits: data.remaining_credits,
  expires: data.expires,
  q: data.q,
  name: data.name,
  gender: data.gender ?? null,
  country: data.country,
  totalNames: data.total_names,
  probability: data.probability,
  duration: data.duration
});

let mapGenderBulkResponse = (data: any): GenderBulkResponse => ({
  status: data.status,
  usedCredits: data.used_credits,
  remainingCredits: data.remaining_credits,
  expires: data.expires,
  names: (data.names || []).map((n: any) => ({
    name: n.name,
    q: n.q,
    gender: n.gender ?? null,
    country: n.country,
    totalNames: n.total_names,
    probability: n.probability,
    id: n.id
  })),
  duration: data.duration
});

let mapPhoneResponse = (data: any): PhoneValidationResponse => ({
  status: data.status,
  remainingCredits: data.remaining_credits,
  expires: data.expires,
  duration: data.duration,
  regionCode: data.regionCode,
  countryCode: data.countryCode,
  country: data.country,
  national: data.national,
  international: data.international,
  e164: data.e164,
  isValid: data.isValid,
  isPossible: data.isPossible,
  numberType: data.numberType,
  nationalSignificantNumber: data.nationalSignificantNumber,
  rawInput: data.rawInput,
  isGeographical: data.isGeographical,
  areaCode: data.areaCode,
  location: data.location
});

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.genderapi.io',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async detectGenderFromName(params: {
    name: string;
    country?: string;
    askToAI?: boolean;
    forceToGenderize?: boolean;
  }): Promise<GenderSingleResponse> {
    let body: Record<string, any> = { name: params.name };
    if (params.country) body.country = params.country;
    if (params.askToAI !== undefined) body.askToAI = params.askToAI;
    if (params.forceToGenderize !== undefined) body.forceToGenderize = params.forceToGenderize;

    let response = await this.axios.post('/api', body);
    return mapGenderSingleResponse(response.data);
  }

  async detectGenderFromEmail(params: {
    email: string;
    country?: string;
    askToAI?: boolean;
  }): Promise<GenderSingleResponse> {
    let body: Record<string, any> = { email: params.email };
    if (params.country) body.country = params.country;
    if (params.askToAI !== undefined) body.askToAI = params.askToAI;

    let response = await this.axios.post('/api/email', body);
    return mapGenderSingleResponse(response.data);
  }

  async detectGenderFromUsername(params: {
    username: string;
    country?: string;
    askToAI?: boolean;
    forceToGenderize?: boolean;
  }): Promise<GenderSingleResponse> {
    let body: Record<string, any> = { username: params.username };
    if (params.country) body.country = params.country;
    if (params.askToAI !== undefined) body.askToAI = params.askToAI;
    if (params.forceToGenderize !== undefined) body.forceToGenderize = params.forceToGenderize;

    let response = await this.axios.post('/api/username', body);
    return mapGenderSingleResponse(response.data);
  }

  async detectGenderFromNamesBulk(params: {
    data: Array<{ name: string; country?: string; id?: string }>;
  }): Promise<GenderBulkResponse> {
    let response = await this.axios.post('/api/name/multi/country', {
      data: params.data
    });
    return mapGenderBulkResponse(response.data);
  }

  async detectGenderFromEmailsBulk(params: {
    data: Array<{ email: string; country?: string; id?: string }>;
  }): Promise<GenderBulkResponse> {
    let response = await this.axios.post('/api/email/multi/country', {
      data: params.data
    });
    return mapGenderBulkResponse(response.data);
  }

  async detectGenderFromUsernamesBulk(params: {
    data: Array<{ username: string; country?: string; id?: string }>;
  }): Promise<GenderBulkResponse> {
    let response = await this.axios.post('/api/username/multi/country', {
      data: params.data
    });
    return mapGenderBulkResponse(response.data);
  }

  async validatePhoneNumber(params: {
    number: string;
    address?: string;
  }): Promise<PhoneValidationResponse> {
    let body: Record<string, any> = { number: params.number };
    if (params.address) body.address = params.address;

    let response = await this.axios.post('/api/phone', body);
    return mapPhoneResponse(response.data);
  }

  async getUsage(): Promise<UsageResponse> {
    let response = await this.axios.get('/api/remaining');
    return {
      status: response.data.status,
      remaining: response.data.remaining,
      expiresAt: response.data.expiresAt
    };
  }
}
