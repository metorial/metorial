import { createAxios } from 'slates';
import type { Member } from './types';

let createApi = (token: string) =>
  createAxios({
    baseURL: 'https://admin.memberstack.com',
    headers: {
      'X-API-KEY': token,
      'Content-Type': 'application/json'
    }
  });

let normalizeMember = (raw: any): Member => ({
  memberId: raw.id,
  auth: raw.auth,
  verified: raw.verified,
  profileImage: raw.profileImage ?? null,
  createdAt: raw.createdAt,
  lastLogin: raw.lastLogin ?? null,
  stripeCustomerId: raw.stripeCustomerId ?? null,
  customFields: raw.customFields ?? {},
  metaData: raw.metaData ?? {},
  json: raw.json ?? null,
  permissions: raw.permissions ?? [],
  loginRedirect: raw.loginRedirect ?? null,
  planConnections: (raw.planConnections ?? []).map((pc: any) => ({
    id: pc.id,
    active: pc.active,
    status: pc.status,
    planId: pc.planId,
    planName: pc.planName,
    type: pc.type,
    payment: pc.payment ?? null
  }))
});

export interface ListMembersParams {
  after?: number;
  limit?: number;
  order?: 'ASC' | 'DESC';
}

export interface ListMembersResponse {
  totalCount: number;
  endCursor: number | null;
  hasMore: boolean;
  members: Member[];
}

export interface CreateMemberParams {
  email: string;
  password: string;
  plans?: { planId: string }[];
  customFields?: Record<string, any>;
  metaData?: Record<string, any>;
  json?: any;
  loginRedirect?: string;
}

export interface UpdateMemberParams {
  email?: string;
  password?: string;
  customFields?: Record<string, any>;
  metaData?: Record<string, any>;
  json?: any;
  loginRedirect?: string;
}

export interface DeleteMemberParams {
  deleteStripeCustomer?: boolean;
  cancelStripeSubscriptions?: boolean;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async listMembers(params: ListMembersParams = {}): Promise<ListMembersResponse> {
    let api = createApi(this.token);
    let queryParams: Record<string, string> = {};

    if (params.after !== undefined) queryParams.after = String(params.after);
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.order) queryParams.order = params.order;

    let response = await api.get('/members', { params: queryParams });
    let data = response.data;

    return {
      totalCount: data.totalCount,
      endCursor: data.endCursor ?? null,
      hasMore: data.hasMore ?? false,
      members: (data.data ?? []).map(normalizeMember)
    };
  }

  async getMember(idOrEmail: string): Promise<Member> {
    let api = createApi(this.token);
    let encoded = encodeURIComponent(idOrEmail);
    let response = await api.get(`/members/${encoded}`);
    return normalizeMember(response.data.data);
  }

  async createMember(params: CreateMemberParams): Promise<Member> {
    let api = createApi(this.token);
    let response = await api.post('/members', params);
    return normalizeMember(response.data.data);
  }

  async updateMember(memberId: string, params: UpdateMemberParams): Promise<Member> {
    let api = createApi(this.token);
    let response = await api.patch(`/members/${memberId}`, params);
    return normalizeMember(response.data.data);
  }

  async deleteMember(
    memberId: string,
    params: DeleteMemberParams = {}
  ): Promise<{ memberId: string }> {
    let api = createApi(this.token);
    let response = await api.delete(`/members/${memberId}`, { data: params });
    return { memberId: response.data.data?.id ?? memberId };
  }

  async addPlanToMember(memberId: string, planId: string): Promise<Member> {
    let api = createApi(this.token);
    let response = await api.post(`/members/${memberId}/add-plan`, { planId });
    return normalizeMember(response.data.data);
  }

  async removePlanFromMember(memberId: string, planId: string): Promise<Member> {
    let api = createApi(this.token);
    let response = await api.post(`/members/${memberId}/remove-plan`, { planId });
    return normalizeMember(response.data.data);
  }

  async verifyToken(token: string): Promise<{
    memberId: string;
    type?: string;
    issuedAt?: number;
    expiresAt?: number;
    audience?: string;
    issuer?: string;
  }> {
    let api = createApi(this.token);
    let response = await api.post('/members/verify-token', { token });
    let data = response.data.data;
    return {
      memberId: data.id,
      type: data.type,
      issuedAt: data.iat,
      expiresAt: data.exp,
      audience: data.aud,
      issuer: data.iss
    };
  }
}
