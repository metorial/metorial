import { buildApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';

export interface ParmaRelationship {
  id: number | string;
  name: string;
  type?: string;
  about?: string;
  company_id?: number | string | null;
  group_ids?: (number | string)[];
  contact_details?: { type: string; value: string }[];
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ParmaUser {
  id: number | string;
  name?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  image_url?: string;
}

export interface ParmaNote {
  id: number | string;
  body: string;
  relationship_ids: (number | string)[];
  datetime?: string;
  created_at?: string;
  updated_at?: string;
}

interface ParmaList<T> {
  data: T[];
  meta?: { count?: number };
}

export class ParmaClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.parma.ai/api/v1',
      authHeader: { value: `Bearer ${token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Parma', reason: 'parma_api_error' })
    });
  }

  async getMe() {
    let response = await this.http.get<{ data: { user: ParmaUser } }>('/users/me');
    return response.data.data.user;
  }

  async listGroups(query?: string) {
    let response = await this.http.get<ParmaList<{ id: number | string; name: string }>>(
      '/groups',
      { params: pickDefined({ query }) }
    );
    return response.data.data;
  }

  async listRelationships(
    params: {
      page?: number;
      perPage?: number;
      query?: string;
      email?: string;
      phone?: string;
      type?: 'person' | 'company';
    } = {}
  ) {
    let response = await this.http.get<ParmaList<ParmaRelationship>>('/relationships', {
      params: pickDefined({
        page: params.page,
        per_page: params.perPage,
        name: params.query,
        email: params.email,
        phone: params.phone,
        type: params.type
      })
    });
    return response.data;
  }

  async getRelationship(relationshipId: string) {
    let response = await this.http.get<{ data: ParmaRelationship }>(
      `/relationships/${encodeURIComponent(relationshipId)}`
    );
    return response.data.data;
  }

  async createRelationship(data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    notes?: string;
    groupIds: number[];
    type?: 'person' | 'company';
    companyId?: number;
  }) {
    let response = await this.http.post<{ data: ParmaRelationship }>(
      '/relationships',
      pickDefined({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        title: data.title,
        type: data.type ?? 'person',
        group_ids: data.groupIds,
        company_id: data.companyId,
        about: data.notes
      })
    );
    return response.data.data;
  }

  async createNote(relationshipId: string, data: { content: string; datetime?: string }) {
    let response = await this.http.post<{ data: ParmaNote }>(
      '/notes',
      pickDefined({
        body: data.content,
        relationship_ids: [Number(relationshipId)],
        datetime: data.datetime
      })
    );
    return response.data.data;
  }

  async listNotes(relationshipId: string, page?: number) {
    let response = await this.http.get<ParmaList<ParmaNote>>(
      `/relationships/${encodeURIComponent(relationshipId)}/notes`,
      { params: pickDefined({ page }) }
    );
    return response.data.data;
  }
}
