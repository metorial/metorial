import { createAxios } from 'slates';
import type {
  CollectionAssociation,
  CollectionResponse,
  EventResponse,
  GroupResponse,
  ListResponse,
  MemberResponse,
  PolicyResponse
} from './types';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; serverUrl: string }) {
    this.http = createAxios({
      baseURL: `${config.serverUrl}/public`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Members ---

  async listMembers(): Promise<MemberResponse[]> {
    let results: MemberResponse[] = [];
    let continuationToken: string | null = null;

    do {
      let params: Record<string, string> = {};
      if (continuationToken) {
        params.continuationToken = continuationToken;
      }
      let response = await this.http.get<ListResponse<MemberResponse>>('/members', { params });
      results.push(...response.data.data);
      continuationToken = response.data.continuationToken;
    } while (continuationToken);

    return results;
  }

  async getMember(memberId: string): Promise<MemberResponse> {
    let response = await this.http.get<MemberResponse>(`/members/${memberId}`);
    return response.data;
  }

  async inviteMember(data: {
    email: string;
    type: number;
    accessAll: boolean;
    externalId?: string | null;
    collections?: CollectionAssociation[];
  }): Promise<MemberResponse> {
    let response = await this.http.post<MemberResponse>('/members', data);
    return response.data;
  }

  async updateMember(
    memberId: string,
    data: {
      type: number;
      accessAll: boolean;
      externalId?: string | null;
      collections?: CollectionAssociation[];
    }
  ): Promise<MemberResponse> {
    let response = await this.http.put<MemberResponse>(`/members/${memberId}`, data);
    return response.data;
  }

  async removeMember(memberId: string): Promise<void> {
    await this.http.delete(`/members/${memberId}`);
  }

  async reinviteMember(memberId: string): Promise<void> {
    await this.http.post(`/members/${memberId}/reinvite`);
  }

  async getMemberGroupIds(memberId: string): Promise<string[]> {
    let response = await this.http.get<string[]>(`/members/${memberId}/group-ids`);
    return response.data;
  }

  async updateMemberGroupIds(memberId: string, groupIds: string[]): Promise<void> {
    await this.http.put(`/members/${memberId}/group-ids`, { groupIds });
  }

  async revokeMember(memberId: string): Promise<void> {
    await this.http.put(`/members/${memberId}/revoke`);
  }

  async restoreMember(memberId: string): Promise<void> {
    await this.http.put(`/members/${memberId}/restore`);
  }

  // --- Groups ---

  async listGroups(): Promise<GroupResponse[]> {
    let results: GroupResponse[] = [];
    let continuationToken: string | null = null;

    do {
      let params: Record<string, string> = {};
      if (continuationToken) {
        params.continuationToken = continuationToken;
      }
      let response = await this.http.get<ListResponse<GroupResponse>>('/groups', { params });
      results.push(...response.data.data);
      continuationToken = response.data.continuationToken;
    } while (continuationToken);

    return results;
  }

  async getGroup(groupId: string): Promise<GroupResponse> {
    let response = await this.http.get<GroupResponse>(`/groups/${groupId}`);
    return response.data;
  }

  async createGroup(data: {
    name: string;
    accessAll: boolean;
    externalId?: string | null;
    collections?: CollectionAssociation[];
  }): Promise<GroupResponse> {
    let response = await this.http.post<GroupResponse>('/groups', data);
    return response.data;
  }

  async updateGroup(
    groupId: string,
    data: {
      name: string;
      accessAll: boolean;
      externalId?: string | null;
      collections?: CollectionAssociation[];
    }
  ): Promise<GroupResponse> {
    let response = await this.http.put<GroupResponse>(`/groups/${groupId}`, data);
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.http.delete(`/groups/${groupId}`);
  }

  async getGroupMemberIds(groupId: string): Promise<string[]> {
    let response = await this.http.get<string[]>(`/groups/${groupId}/member-ids`);
    return response.data;
  }

  async updateGroupMemberIds(groupId: string, memberIds: string[]): Promise<void> {
    await this.http.put(`/groups/${groupId}/member-ids`, { memberIds });
  }

  // --- Collections ---

  async listCollections(): Promise<CollectionResponse[]> {
    let results: CollectionResponse[] = [];
    let continuationToken: string | null = null;

    do {
      let params: Record<string, string> = {};
      if (continuationToken) {
        params.continuationToken = continuationToken;
      }
      let response = await this.http.get<ListResponse<CollectionResponse>>('/collections', {
        params
      });
      results.push(...response.data.data);
      continuationToken = response.data.continuationToken;
    } while (continuationToken);

    return results;
  }

  async getCollection(collectionId: string): Promise<CollectionResponse> {
    let response = await this.http.get<CollectionResponse>(`/collections/${collectionId}`);
    return response.data;
  }

  async updateCollection(
    collectionId: string,
    data: {
      externalId?: string | null;
      groups?: CollectionAssociation[];
    }
  ): Promise<CollectionResponse> {
    let response = await this.http.put<CollectionResponse>(
      `/collections/${collectionId}`,
      data
    );
    return response.data;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.http.delete(`/collections/${collectionId}`);
  }

  // --- Policies ---

  async listPolicies(): Promise<PolicyResponse[]> {
    let results: PolicyResponse[] = [];
    let continuationToken: string | null = null;

    do {
      let params: Record<string, string> = {};
      if (continuationToken) {
        params.continuationToken = continuationToken;
      }
      let response = await this.http.get<ListResponse<PolicyResponse>>('/policies', {
        params
      });
      results.push(...response.data.data);
      continuationToken = response.data.continuationToken;
    } while (continuationToken);

    return results;
  }

  async getPolicy(policyType: number): Promise<PolicyResponse> {
    let response = await this.http.get<PolicyResponse>(`/policies/${policyType}`);
    return response.data;
  }

  async updatePolicy(
    policyId: string,
    data: {
      enabled: boolean;
      data?: Record<string, any> | null;
    }
  ): Promise<PolicyResponse> {
    let response = await this.http.put<PolicyResponse>(`/policies/${policyId}`, data);
    return response.data;
  }

  // --- Events ---

  async listEvents(params?: {
    start?: string;
    end?: string;
    actingUserId?: string;
    itemId?: string;
    continuationToken?: string;
  }): Promise<{ events: EventResponse[]; continuationToken: string | null }> {
    let queryParams: Record<string, string> = {};
    if (params?.start) queryParams.start = params.start;
    if (params?.end) queryParams.end = params.end;
    if (params?.actingUserId) queryParams.actingUserId = params.actingUserId;
    if (params?.itemId) queryParams.itemId = params.itemId;
    if (params?.continuationToken) queryParams.continuationToken = params.continuationToken;

    let response = await this.http.get<ListResponse<EventResponse>>('/events', {
      params: queryParams
    });
    return {
      events: response.data.data,
      continuationToken: response.data.continuationToken
    };
  }

  async listAllEvents(params?: {
    start?: string;
    end?: string;
    actingUserId?: string;
    itemId?: string;
  }): Promise<EventResponse[]> {
    let results: EventResponse[] = [];
    let continuationToken: string | null = null;

    do {
      let result = await this.listEvents({
        ...params,
        continuationToken: continuationToken ?? undefined
      });
      results.push(...result.events);
      continuationToken = result.continuationToken;
    } while (continuationToken);

    return results;
  }

  // --- Organization Import ---

  async importOrganization(data: {
    groups: Array<{
      name: string;
      externalId: string;
      memberExternalIds: string[];
    }>;
    members: Array<{
      email: string | null;
      externalId: string;
      deleted: boolean;
    }>;
    overwriteExisting: boolean;
  }): Promise<void> {
    await this.http.post('/organization/import', data);
  }
}
