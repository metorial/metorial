import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PagedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface SingleResponse<T> {
  data: T;
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
    building?: string;
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
    building?: string;
    state?: string;
  };
}

export type UpdatePersonData = Partial<CreatePersonData>;

export interface PeopleParams extends PaginationParams {
  searchText?: string;
  name?: string;
  mobile?: string;
  email?: string;
  includeFamilyMembers?: boolean;
  includeAdditionalFields?: boolean;
  includeOrganizations?: boolean;
  includeGroups?: boolean;
}

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
  reference_id?: string;
  payment_method_id?: number;
  batch_id?: number;
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
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Connect a ChMeetings API key before using this tool.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.chmeetings.com/api/v1',
      authHeader: { name: 'apikey', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ChMeetings',
          reason: 'chmeetings_api_error'
        })
    });
    this.http.interceptors.response.use(response => {
      let body: unknown = response.data;
      if (!isApiErrorRecord(body)) return response;
      let status = Number(body.status_code ?? response.status);
      let errors = Array.isArray(body.errors) ? body.errors.filter(Boolean) : [];
      if (status >= 400 || errors.length > 0) {
        throw createApiServiceError(
          `ChMeetings API request failed: ${errors.join('; ') || `HTTP ${status}`}`,
          { reason: 'chmeetings_api_error', upstreamStatus: status }
        );
      }
      if (isApiErrorRecord(body.paging)) {
        response.data = {
          ...body,
          data: body.data ?? [],
          page: Number(body.paging.page),
          page_size: Number(body.paging.page_size),
          total: Number(body.paging.total_count)
        };
      } else if (!('data' in body) && !('status_code' in body)) {
        response.data = { data: body };
      }
      return response;
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
    let response = await this.http.get(`/organizations/${encodeURIComponent(organizationId)}`);
    return response.data;
  }

  // ─── People ──────────────────────────────────────────────────

  async listPeople(params?: PeopleParams): Promise<PagedResponse<PersonRecord>> {
    let response = await this.http.get('/people', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100,
        name: params?.name ?? params?.searchText,
        mobile: params?.mobile,
        email: params?.email,
        include_family_members: params?.includeFamilyMembers ?? true,
        include_additional_fields: params?.includeAdditionalFields ?? true,
        include_organizations: params?.includeOrganizations ?? false,
        include_groups: params?.includeGroups ?? false
      }
    });
    return response.data;
  }

  async getPerson(personId: number): Promise<SingleResponse<PersonRecord>> {
    let response = await this.http.get(`/people/${personId}`);
    if (!isApiErrorRecord(response.data?.data)) {
      throw createApiServiceError(
        'ChMeetings did not return a person record. Check the person ID.'
      );
    }
    return response.data;
  }

  async createPerson(
    data: CreatePersonData
  ): Promise<SingleResponse<PersonRecord | { created: true }>> {
    let response = await this.http.post('/people', data);
    if (isApiErrorRecord(response.data?.data)) return response.data;
    let location = getResponseHeaderValue(response.headers, 'location');
    let id = location?.match(/\/people\/(\d+)(?:[?#]|$)/)?.[1];
    if (id) return this.getPerson(Number(id));
    return { data: { created: true } };
  }

  async updatePerson(
    personId: number,
    data: UpdatePersonData
  ): Promise<SingleResponse<PersonRecord>> {
    let current = (await this.getPerson(personId)).data;
    let writableFields = [
      'first_name',
      'middle_name',
      'last_name',
      'nick_name',
      'native_name',
      'email',
      'birth_date',
      'mobile',
      'do_not_text',
      'do_not_email',
      'facebook',
      'gender',
      'social_status',
      'engagement_date',
      'marriage_date',
      'job_title',
      'work_place',
      'qualification',
      'education_level',
      'school',
      'father_name',
      'church',
      'is_deacon',
      'rank',
      'bishop_donor',
      'baptism_date',
      'baptism_location',
      'grade',
      'graduation_year',
      'telephone',
      'talents_and_hobbies',
      'address',
      'additional_fields'
    ];
    let replacement: Record<string, unknown> = {};
    for (let key of writableFields) {
      if (current[key] !== undefined) replacement[key] = current[key];
    }
    Object.assign(replacement, pickDefined(data));
    if (data.address) {
      replacement.address = {
        ...(isApiErrorRecord(current.address) ? current.address : {}),
        ...pickDefined(data.address)
      };
    }
    if (!replacement.first_name || !replacement.last_name) {
      throw createApiServiceError(
        'The current profile must have first and last names before it can be updated.'
      );
    }
    await this.http.put(`/people/${personId}`, replacement);
    return this.getPerson(personId);
  }

  async deletePerson(personId: number): Promise<void> {
    await this.http.delete(`/people/${personId}`);
  }

  async listPeopleByOrganization(
    organizationId: string,
    params?: PeopleParams
  ): Promise<PagedResponse<PersonRecord>> {
    let response = await this.http.get(
      `/organizations/${encodeURIComponent(organizationId)}/people`,
      {
        params: {
          page: params?.page ?? 1,
          page_size: params?.pageSize ?? 100,
          name: params?.name ?? params?.searchText,
          mobile: params?.mobile,
          email: params?.email,
          include_family_members: params?.includeFamilyMembers ?? true,
          include_additional_fields: params?.includeAdditionalFields ?? true,
          include_organizations: params?.includeOrganizations ?? false,
          include_groups: params?.includeGroups ?? false
        }
      }
    );
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
    let response = await this.http.post('/families', {
      members: data.members.map(member => ({
        person_id: member.person_id,
        family_role: member.role ?? 'Other'
      }))
    });
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
    let response = await this.http.post(`/families/${familyId}/members`, {
      members: members.map(member => ({
        person_id: member.person_id,
        family_role: member.role ?? 'Other'
      }))
    });
    return response.data;
  }

  async setFamilyMembers(
    familyId: number,
    members: { person_id: number; role?: string }[]
  ): Promise<SingleResponse<FamilyRecord>> {
    let response = await this.http.put(`/families/${familyId}/members`, {
      members: members.map(member => ({
        person_id: member.person_id,
        family_role: member.role ?? 'Other'
      }))
    });
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
      family_role: role
    });
    return response.data;
  }

  // ─── Groups ──────────────────────────────────────────────────

  async listGroups(searchText?: string): Promise<SingleResponse<GroupRecord[]>> {
    let response = await this.http.get('/groups', { params: { search_text: searchText } });
    return response.data;
  }

  async listGroupsByOrganization(
    organizationId: string,
    params?: PaginationParams & { searchText?: string }
  ): Promise<PagedResponse<GroupRecord>> {
    let response = await this.http.get(
      `/organizations/${encodeURIComponent(organizationId)}/groups`,
      {
        params: {
          page: params?.page ?? 1,
          page_size: params?.pageSize ?? 100,
          search_text: params?.searchText
        }
      }
    );
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
      `/organizations/${encodeURIComponent(organizationId)}/groups/${groupId}/memberships`,
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
    let response = await this.http.post('/contributions', {
      person: { person_id: data.person_id },
      date: data.date,
      payment_method: data.payment_method ?? null,
      payment_method_id: data.payment_method_id,
      funds: data.funds,
      batch_num: data.batch_number,
      batch_id: data.batch_id,
      note: data.notes,
      reference_id: data.reference_id ?? data.transaction_id
    });
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

  async listEvents(
    params: PaginationParams & { from: string; to: string; organizationId?: string }
  ): Promise<PagedResponse<Record<string, unknown>>> {
    let path = params.organizationId
      ? `/organizations/${encodeURIComponent(params.organizationId)}/events`
      : '/events';
    let response = await this.http.get(path, {
      params: {
        from: params.from,
        to: params.to,
        page: params.page ?? 1,
        page_size: params.pageSize ?? 100
      }
    });
    return response.data;
  }

  async listEventOccurrences(
    eventId: number,
    params: PaginationParams & { from: string; to: string; organizationId?: string }
  ): Promise<PagedResponse<Record<string, unknown>>> {
    let path = params.organizationId
      ? `/organizations/${encodeURIComponent(params.organizationId)}/events/${eventId}/occurrences`
      : `/events/${eventId}/occurrences`;
    let response = await this.http.get(path, {
      params: {
        from: params.from,
        to: params.to,
        page: params.page ?? 1,
        page_size: params.pageSize ?? 100
      }
    });
    return response.data;
  }

  async listOccurrenceAttendance(
    occurrenceId: string,
    params: PaginationParams & {
      organizationId?: string;
      status?: string;
      groupId?: number;
      ungrouped?: boolean;
    }
  ): Promise<PagedResponse<Record<string, unknown>>> {
    let path = params.organizationId
      ? `/organizations/${encodeURIComponent(params.organizationId)}/occurrences/${encodeURIComponent(occurrenceId)}/attendance`
      : `/occurrences/${encodeURIComponent(occurrenceId)}/attendance`;
    let response = await this.http.get(path, {
      params: {
        status: params.status,
        group_id: params.groupId,
        ungrouped: params.ungrouped,
        page: params.page ?? 1,
        page_size: params.pageSize ?? 100
      }
    });
    return response.data;
  }
}
