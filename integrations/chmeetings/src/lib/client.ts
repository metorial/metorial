import { createAxios } from 'slates';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PagedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
  successful: boolean;
  error: string | null;
}

export interface SingleResponse<T> {
  data: T;
  successful: boolean;
  error: string | null;
}

export interface PersonRecord {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  native_name?: string;
  email?: string;
  mobile?: string;
  birth_date?: string;
  gender?: string;
  social_status?: string;
  church?: string;
  job_title?: string;
  work_place?: string;
  baptism_date?: string;
  join_date?: string;
  envelope_number?: number;
  do_not_text?: boolean;
  do_not_email?: boolean;
  address?: {
    country?: string;
    city?: string;
    address_line?: string;
    zip_code?: string;
    building_no?: string;
    state?: string;
  };
  [key: string]: unknown;
}

export interface CreatePersonData {
  first_name: string;
  last_name: string;
  middle_name?: string;
  native_name?: string;
  email?: string;
  mobile?: string;
  birth_date?: string;
  gender?: string;
  social_status?: string;
  job_title?: string;
  work_place?: string;
  baptism_date?: string;
  do_not_text?: boolean;
  do_not_email?: boolean;
  envelope_number?: number;
  address?: {
    country?: string;
    city?: string;
    address_line?: string;
    zip_code?: string;
    building_no?: string;
    state?: string;
  };
}

export interface UpdatePersonData extends Partial<CreatePersonData> {}

export interface ProfileNote {
  id: number;
  person_id: number;
  note: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface FamilyRecord {
  id: number;
  name?: string;
  members?: FamilyMember[];
  [key: string]: unknown;
}

export interface FamilyMember {
  person_id: number;
  role?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

export interface FamilyRole {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

export interface GroupRecord {
  id: number;
  name: string;
  organization_id?: number | string;
  [key: string]: unknown;
}

export interface GroupMembership {
  person_id: number;
  group_id?: number;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

export interface ContributionRecord {
  id: number;
  person_id?: number;
  date?: string;
  payment_method?: string;
  funds?: ContributionFund[];
  batch_number?: string;
  notes?: string;
  check_number?: string;
  transaction_id?: string;
  fee?: number;
  deposit_date?: string;
  [key: string]: unknown;
}

export interface ContributionFund {
  fund_name: string;
  amount: number;
  [key: string]: unknown;
}

export interface CreateContributionData {
  person_id: number;
  date: string;
  payment_method?: string;
  funds: { fund_name: string; amount: number }[];
  batch_number?: string;
  notes?: string;
  check_number?: string;
  transaction_id?: string;
}

export interface CampaignRecord {
  id: number;
  name?: string;
  [key: string]: unknown;
}

export interface PledgeRecord {
  id: number;
  campaign_id?: number;
  person_id?: number;
  pledged_amount?: number;
  paid_amount?: number;
  [key: string]: unknown;
}

export interface OrganizationRecord {
  id: number | string;
  name?: string;
  type?: string;
  [key: string]: unknown;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.chmeetings.com/api/v1',
      headers: {
        ApiKey: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Organizations ───────────────────────────────────────────

  async listOrganizations(
    params?: PaginationParams & { searchText?: string }
  ): Promise<PagedResponse<OrganizationRecord>> {
    let response = await this.http.get('/organizations', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100,
        search_text: params?.searchText
      }
    });
    return response.data;
  }

  async getOrganization(organizationId: string): Promise<SingleResponse<OrganizationRecord>> {
    let response = await this.http.get(`/organizations/${organizationId}`);
    return response.data;
  }

  // ─── People ──────────────────────────────────────────────────

  async listPeople(
    params?: PaginationParams & { searchText?: string }
  ): Promise<PagedResponse<PersonRecord>> {
    let response = await this.http.get('/people', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100,
        search_text: params?.searchText
      }
    });
    return response.data;
  }

  async getPerson(personId: number): Promise<SingleResponse<PersonRecord>> {
    let response = await this.http.get(`/people/${personId}`);
    return response.data;
  }

  async createPerson(data: CreatePersonData): Promise<SingleResponse<PersonRecord>> {
    let response = await this.http.post('/people', data);
    return response.data;
  }

  async updatePerson(
    personId: number,
    data: UpdatePersonData
  ): Promise<SingleResponse<PersonRecord>> {
    let response = await this.http.put(`/people/${personId}`, data);
    return response.data;
  }

  async deletePerson(personId: number): Promise<void> {
    await this.http.delete(`/people/${personId}`);
  }

  async listPeopleByOrganization(
    organizationId: string,
    params?: PaginationParams & {
      name?: string;
      mobile?: string;
      email?: string;
      includeFamilyMembers?: boolean;
      includeAdditionalFields?: boolean;
    }
  ): Promise<PagedResponse<PersonRecord>> {
    let response = await this.http.get(`/organizations/${organizationId}/people`, {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100,
        name: params?.name,
        mobile: params?.mobile,
        email: params?.email,
        include_family_members: params?.includeFamilyMembers,
        include_additional_fields: params?.includeAdditionalFields
      }
    });
    return response.data;
  }

  // ─── Profile Notes ───────────────────────────────────────────

  async listProfileNotes(
    personId: number,
    params?: PaginationParams
  ): Promise<PagedResponse<ProfileNote>> {
    let response = await this.http.get(`/people/${personId}/notes`, {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100
      }
    });
    return response.data;
  }

  async getProfileNote(
    personId: number,
    noteId: number
  ): Promise<SingleResponse<ProfileNote>> {
    let response = await this.http.get(`/people/${personId}/notes/${noteId}`);
    return response.data;
  }

  async createProfileNote(
    personId: number,
    data: { note: string }
  ): Promise<SingleResponse<ProfileNote>> {
    let response = await this.http.post(`/people/${personId}/notes`, data);
    return response.data;
  }

  async updateProfileNote(
    personId: number,
    noteId: number,
    data: { note: string }
  ): Promise<SingleResponse<ProfileNote>> {
    let response = await this.http.put(`/people/${personId}/notes/${noteId}`, data);
    return response.data;
  }

  async deleteProfileNote(personId: number, noteId: number): Promise<void> {
    await this.http.delete(`/people/${personId}/notes/${noteId}`);
  }

  // ─── Families ────────────────────────────────────────────────

  async listFamilies(
    params?: PaginationParams & { searchText?: string }
  ): Promise<PagedResponse<FamilyRecord>> {
    let response = await this.http.get('/families', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100,
        search_text: params?.searchText
      }
    });
    return response.data;
  }

  async getFamily(familyId: number): Promise<SingleResponse<FamilyRecord>> {
    let response = await this.http.get(`/families/${familyId}`);
    return response.data;
  }

  async createFamily(data: {
    members: { person_id: number; role?: string }[];
  }): Promise<SingleResponse<FamilyRecord>> {
    let response = await this.http.post('/families', data);
    return response.data;
  }

  async deleteFamily(familyId: number): Promise<void> {
    await this.http.delete(`/families/${familyId}`);
  }

  async getFamilyRoles(): Promise<SingleResponse<FamilyRole[]>> {
    let response = await this.http.get('/families/family-roles');
    return response.data;
  }

  async addFamilyMembers(
    familyId: number,
    members: { person_id: number; role?: string }[]
  ): Promise<SingleResponse<FamilyRecord>> {
    let response = await this.http.post(`/families/${familyId}/members`, { members });
    return response.data;
  }

  async setFamilyMembers(
    familyId: number,
    members: { person_id: number; role?: string }[]
  ): Promise<SingleResponse<FamilyRecord>> {
    let response = await this.http.put(`/families/${familyId}/members`, { members });
    return response.data;
  }

  async removeFamilyMember(familyId: number, personId: number): Promise<void> {
    await this.http.delete(`/families/${familyId}/members/${personId}`);
  }

  async updateFamilyMemberRole(
    familyId: number,
    personId: number,
    role: string
  ): Promise<SingleResponse<unknown>> {
    let response = await this.http.patch(`/families/${familyId}/members/${personId}`, {
      role
    });
    return response.data;
  }

  // ─── Groups ──────────────────────────────────────────────────

  async listGroups(): Promise<SingleResponse<GroupRecord[]>> {
    let response = await this.http.get('/groups');
    return response.data;
  }

  async listGroupsByOrganization(
    organizationId: string,
    params?: PaginationParams & { searchText?: string }
  ): Promise<PagedResponse<GroupRecord>> {
    let response = await this.http.get(`/organizations/${organizationId}/groups`, {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100,
        search_text: params?.searchText
      }
    });
    return response.data;
  }

  async getGroupPeople(groupIds: string): Promise<SingleResponse<GroupMembership[]>> {
    let response = await this.http.get('/groups/people', {
      params: { group_ids: groupIds }
    });
    return response.data;
  }

  async listGroupMemberships(
    organizationId: string,
    groupId: number,
    params?: PaginationParams
  ): Promise<PagedResponse<GroupMembership>> {
    let response = await this.http.get(
      `/organizations/${organizationId}/groups/${groupId}/memberships`,
      {
        params: {
          page: params?.page ?? 1,
          page_size: params?.pageSize ?? 100
        }
      }
    );
    return response.data;
  }

  async addPersonToGroup(
    groupId: number,
    personId: number
  ): Promise<SingleResponse<GroupMembership>> {
    let response = await this.http.post(`/groups/${groupId}/memberships`, {
      person_id: personId
    });
    return response.data;
  }

  async removePersonFromGroup(groupId: number, personId: number): Promise<void> {
    await this.http.delete(`/groups/${groupId}/memberships/${personId}`);
  }

  // ─── Contributions ───────────────────────────────────────────

  async listContributions(
    params?: PaginationParams & {
      personId?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PagedResponse<ContributionRecord>> {
    let response = await this.http.get('/contributions', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100,
        person_id: params?.personId,
        start_date: params?.startDate,
        end_date: params?.endDate
      }
    });
    return response.data;
  }

  async createContribution(
    data: CreateContributionData
  ): Promise<SingleResponse<ContributionRecord>> {
    let response = await this.http.post('/contributions', data);
    return response.data;
  }

  async deleteContribution(contributionId: number): Promise<void> {
    await this.http.delete(`/contributions/${contributionId}`);
  }

  // ─── Campaigns & Pledges ─────────────────────────────────────

  async listCampaigns(params?: PaginationParams): Promise<PagedResponse<CampaignRecord>> {
    let response = await this.http.get('/campaigns', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100
      }
    });
    return response.data;
  }

  async listPledges(
    campaignId: number,
    params?: PaginationParams
  ): Promise<PagedResponse<PledgeRecord>> {
    let response = await this.http.get(`/campaigns/${campaignId}/pledges`, {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100
      }
    });
    return response.data;
  }
}
