import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let errorMapping = {
  extractResponseData: (response: { data: unknown }) => {
    let details: string[] = [];
    collectApiErrorDetails(response.data, details, {
      detailKeys: ['message', 'detail', 'error', 'error_description', 'field', 'code'],
      nestedKeys: ['errors', 'details']
    });
    return isApiErrorRecord(response.data) && details.length > 0
      ? { ...response.data, message: details.join(' - ') }
      : response.data;
  }
};

let errorAdapter = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Split',
    reason: 'split_api_error',
    extractUpstreamCode: input => {
      if (!isApiErrorRecord(input) || !isApiErrorRecord(input.data)) return undefined;
      let upstream = input.data.upstream;
      return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
        ? upstream.code
        : undefined;
    }
  });

export class Client {
  private apiV2: ReturnType<typeof createAuthenticatedAxios>;
  private apiV3: ReturnType<typeof createAuthenticatedAxios>;

  constructor(auth: { token: string }) {
    let options = {
      authHeader: { value: `Bearer ${auth.token}` },
      timeout: 30000,
      errorMapping,
      errorAdapter
    };
    this.apiV2 = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://api.split.io/internal/api/v2'
    });
    this.apiV3 = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://api.split.io/internal/api/v3'
    });
  }

  // ─── Workspaces ────────────────────────────────────────────

  async listWorkspaces(params?: {
    offset?: number;
    limit?: number;
    name?: string;
    nameOp?: string;
    organizationIdentifier?: string;
    projectIdentifier?: string;
  }) {
    let res = await this.apiV2.get('/workspaces', {
      params: {
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 50,
        ...(params?.name ? { name: params.name } : {}),
        ...(params?.nameOp ? { nameOp: params.nameOp } : {}),
        ...(params?.organizationIdentifier
          ? { organizationIdentifier: params.organizationIdentifier }
          : {}),
        ...(params?.projectIdentifier ? { projectIdentifier: params.projectIdentifier } : {})
      }
    });
    return res.data as {
      objects: Array<{
        id: string;
        name: string;
        type: string;
        requiresTitleAndComments: boolean;
        organizationIdentifier?: string;
        projectIdentifier?: string;
      }>;
      offset: number;
      limit: number;
      totalCount: number;
    };
  }

  // ─── Environments ──────────────────────────────────────────

  async listEnvironments(workspaceId: string) {
    let res = await this.apiV2.get(`/environments/ws/${encodeURIComponent(workspaceId)}`);
    return res.data as Array<{
      id: string;
      name: string;
      type: string;
      production: boolean;
      creationTime: number;
    }>;
  }

  async createEnvironment(workspaceId: string, body: { name: string; production?: boolean }) {
    let res = await this.apiV2.post(
      `/environments/ws/${encodeURIComponent(workspaceId)}`,
      body
    );
    return res.data as {
      id: string;
      name: string;
      type: string;
      production: boolean;
      creationTime: number;
    };
  }

  async deleteEnvironment(workspaceId: string, environmentIdOrName: string) {
    await this.apiV2.delete(
      `/environments/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(environmentIdOrName)}`
    );
  }

  // ─── Traffic Types ─────────────────────────────────────────

  async listTrafficTypes(workspaceId: string) {
    let res = await this.apiV2.get(`/trafficTypes/ws/${encodeURIComponent(workspaceId)}`);
    return res.data as Array<{
      id: string;
      name: string;
      displayAttributeId: string | null;
    }>;
  }

  // ─── Feature Flags (Splits) ────────────────────────────────

  async createFeatureFlag(
    workspaceId: string,
    trafficTypeIdOrName: string,
    body: { name: string; description?: string }
  ) {
    let res = await this.apiV2.post(
      `/splits/ws/${encodeURIComponent(workspaceId)}/trafficTypes/${encodeURIComponent(trafficTypeIdOrName)}`,
      body
    );
    let flag = res.data as FeatureFlag;
    return flag.id ? flag : this.getFeatureFlag(workspaceId, flag.name);
  }

  async getFeatureFlag(workspaceId: string, flagName: string) {
    let res = await this.apiV2.get(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}`
    );
    return res.data as FeatureFlag;
  }

  async listFeatureFlags(
    workspaceId: string,
    params?: { offset?: number; limit?: number; tag?: string; name?: string }
  ): Promise<FeatureFlagPage> {
    if (params?.name) {
      let name = params.name;
      let matching: FeatureFlag[] = [];
      let nextOffset = 0;
      let totalCount = 0;
      while (true) {
        let page = await this.listFeatureFlags(workspaceId, {
          offset: nextOffset,
          limit: 50,
          tag: params.tag
        });
        matching.push(...page.objects.filter(flag => flag.name.includes(name)));
        totalCount = page.totalCount;
        let previousOffset = nextOffset;
        nextOffset = page.offset + page.objects.length;
        if (nextOffset >= page.totalCount) break;
        if (page.objects.length === 0 || nextOffset <= previousOffset) {
          throw createApiServiceError(
            'Split returned an incomplete feature flag listing. Retry the name search, or list feature flags without a name filter using explicit pagination.'
          );
        }
      }
      let offset = params.offset ?? 0;
      let limit = params.limit ?? 50;
      return {
        objects: matching.slice(offset, offset + limit),
        offset,
        limit,
        totalCount,
        matchingCount: matching.length
      };
    }
    let res = await this.apiV2.get(`/splits/ws/${encodeURIComponent(workspaceId)}`, {
      params: {
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 50,
        ...(params?.tag ? { tag: params.tag } : {})
      }
    });
    return res.data as {
      objects: FeatureFlag[];
      offset: number;
      limit: number;
      totalCount: number;
    };
  }

  async updateFeatureFlagMetadata(
    workspaceId: string,
    flagName: string,
    operations: JsonPatchOp[]
  ) {
    let res = await this.apiV2.patch(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}`,
      operations
    );
    return res.data as FeatureFlag;
  }

  async deleteFeatureFlag(workspaceId: string, flagName: string) {
    await this.apiV2.delete(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}`
    );
  }

  // ─── Feature Flag Definitions (Environment-level) ──────────

  async createFlagDefinition(
    workspaceId: string,
    flagName: string,
    environmentId: string,
    body: FlagDefinitionBody
  ) {
    let res = await this.apiV2.post(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}/environments/${encodeURIComponent(environmentId)}`,
      body
    );
    return res.data as FlagDefinition;
  }

  async getFlagDefinition(workspaceId: string, flagName: string, environmentIdOrName: string) {
    let res = await this.apiV2.get(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}/environments/${encodeURIComponent(environmentIdOrName)}`
    );
    return res.data as FlagDefinition;
  }

  async listFlagDefinitions(
    workspaceId: string,
    environmentIdOrName: string,
    params?: { offset?: number; limit?: number }
  ) {
    let res = await this.apiV2.get(
      `/splits/ws/${encodeURIComponent(workspaceId)}/environments/${encodeURIComponent(environmentIdOrName)}`,
      {
        params: {
          offset: params?.offset ?? 0,
          limit: params?.limit ?? 50
        }
      }
    );
    return res.data as {
      objects: FlagDefinition[];
      offset: number;
      limit: number;
      totalCount: number;
    };
  }

  async updateFlagDefinition(
    workspaceId: string,
    flagName: string,
    environmentId: string,
    operations: JsonPatchOp[]
  ) {
    let res = await this.apiV2.patch(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}/environments/${encodeURIComponent(environmentId)}`,
      operations
    );
    return res.data as FlagDefinition;
  }

  async fullUpdateFlagDefinition(
    workspaceId: string,
    flagName: string,
    environmentId: string,
    body: FlagDefinitionBody
  ) {
    let res = await this.apiV2.put(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}/environments/${encodeURIComponent(environmentId)}`,
      body
    );
    return res.data as FlagDefinition;
  }

  async killFlag(workspaceId: string, flagName: string, environmentId: string) {
    await this.apiV2.put(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}/environments/${encodeURIComponent(environmentId)}/kill`,
      {}
    );
  }

  async restoreFlag(workspaceId: string, flagName: string, environmentId: string) {
    await this.apiV2.put(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}/environments/${encodeURIComponent(environmentId)}/restore`,
      {}
    );
  }

  async removeFlagDefinition(workspaceId: string, flagName: string, environmentId: string) {
    await this.apiV2.delete(
      `/splits/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(flagName)}/environments/${encodeURIComponent(environmentId)}`
    );
  }

  // ─── Segments ──────────────────────────────────────────────

  async createSegment(
    workspaceId: string,
    trafficTypeId: string,
    body: { name: string; description?: string }
  ) {
    let res = await this.apiV2.post(
      `/segments/ws/${encodeURIComponent(workspaceId)}/trafficTypes/${encodeURIComponent(trafficTypeId)}`,
      body
    );
    return res.data as Segment;
  }

  async listSegments(workspaceId: string, params?: { offset?: number; limit?: number }) {
    let res = await this.apiV2.get(`/segments/ws/${encodeURIComponent(workspaceId)}`, {
      params: { offset: params?.offset ?? 0, limit: params?.limit ?? 20 }
    });
    return res.data as {
      objects: Segment[];
      offset: number;
      limit: number;
      totalCount: number;
    };
  }

  async deleteSegment(workspaceId: string, segmentName: string) {
    await this.apiV2.delete(
      `/segments/ws/${encodeURIComponent(workspaceId)}/${encodeURIComponent(segmentName)}`
    );
  }

  async activateSegmentInEnv(environmentId: string, segmentName: string) {
    let res = await this.apiV2.post(
      `/segments/${encodeURIComponent(environmentId)}/${encodeURIComponent(segmentName)}`,
      {}
    );
    return res.data;
  }

  async deactivateSegmentInEnv(environmentId: string, segmentName: string) {
    await this.apiV2.delete(
      `/segments/${encodeURIComponent(environmentId)}/${encodeURIComponent(segmentName)}`
    );
  }

  async getSegmentKeys(
    environmentId: string,
    segmentName: string,
    params?: { offset?: number; limit?: number }
  ) {
    let res = await this.apiV2.get(
      `/segments/${encodeURIComponent(environmentId)}/${encodeURIComponent(segmentName)}/keys`,
      {
        params: { offset: params?.offset ?? 0, limit: params?.limit ?? 100 }
      }
    );
    return res.data as {
      keys: Array<{ key: string }>;
      count: number;
      offset: number;
      limit: number;
    };
  }

  async uploadSegmentKeys(
    environmentId: string,
    segmentName: string,
    keys: string[],
    comment?: string
  ) {
    let res = await this.apiV2.put(
      `/segments/${encodeURIComponent(environmentId)}/${encodeURIComponent(segmentName)}/uploadKeys`,
      { keys, comment },
      {
        params: { replace: false }
      }
    );
    return res.data;
  }

  async removeSegmentKeys(
    environmentId: string,
    segmentName: string,
    keys: string[],
    comment?: string
  ) {
    let res = await this.apiV2.put(
      `/segments/${encodeURIComponent(environmentId)}/${encodeURIComponent(segmentName)}/removeKeys`,
      {
        keys,
        comment: comment ?? ''
      }
    );
    return res.data;
  }

  // ─── Flag Sets (v3) ───────────────────────────────────────

  async createFlagSet(body: {
    name: string;
    description?: string;
    workspace: { id: string; type: string };
  }) {
    let res = await this.apiV3.post('/flag-sets', body);
    return res.data as FlagSet;
  }

  async listFlagSets(workspaceId: string, params?: { limit?: number; after?: string }) {
    let res = await this.apiV3.get('/flag-sets', {
      params: {
        workspace_id: workspaceId,
        limit: params?.limit ?? 50,
        ...(params?.after ? { after: params.after } : {})
      }
    });
    return res.data as {
      data: FlagSet[];
      nextMarker?: string | null;
      previousMarker?: string | null;
      limit: number;
      count: number;
    };
  }

  async getFlagSet(flagSetId: string) {
    let res = await this.apiV3.get(`/flag-sets/${encodeURIComponent(flagSetId)}`);
    return res.data as FlagSet;
  }

  async deleteFlagSet(flagSetId: string) {
    await this.apiV3.delete(`/flag-sets/${encodeURIComponent(flagSetId)}`);
  }

  // ─── Users ─────────────────────────────────────────────────

  async inviteUser(email: string, groups?: Array<{ id: string; type: string }>) {
    let res = await this.apiV2.post('/users', { email, groups: groups ?? [] });
    return res.data as SplitUser;
  }

  async listUsers(params?: { limit?: number; after?: string; status?: string }) {
    let res = await this.apiV2.get('/users', {
      params: {
        limit: params?.limit ?? 50,
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.status ? { status: params.status } : {})
      }
    });
    return res.data as {
      data: SplitUser[];
      nextMarker?: string | null;
      previousMarker?: string | null;
      limit: number;
      count: number;
    };
  }

  async getUser(userId: string) {
    let res = await this.apiV2.get(`/users/${encodeURIComponent(userId)}`);
    return res.data as SplitUser;
  }

  async updateUser(
    userId: string,
    body: { email: string; name: string; status: string; '2fa'?: boolean; type: string }
  ) {
    let res = await this.apiV2.put(`/users/${encodeURIComponent(userId)}`, body);
    return res.data as SplitUser;
  }

  async deleteUser(userId: string) {
    await this.apiV2.delete(`/users/${encodeURIComponent(userId)}`);
  }

  // ─── Groups ────────────────────────────────────────────────

  async createGroup(body: { name: string; description?: string }) {
    let res = await this.apiV2.post('/groups', body);
    return res.data as SplitGroup;
  }

  async listGroups(params?: { offset?: number; limit?: number }) {
    let res = await this.apiV2.get('/groups', {
      params: {
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 50
      }
    });
    return res.data as {
      objects: SplitGroup[];
      limit: number;
      count: number;
      totalCount?: number;
      nextMarker?: string | null;
      previousMarker?: string | null;
    };
  }

  async updateGroup(groupId: string, body: { name: string; description?: string }) {
    let res = await this.apiV2.put(`/groups/${encodeURIComponent(groupId)}`, body);
    return res.data as SplitGroup;
  }

  async deleteGroup(groupId: string) {
    await this.apiV2.delete(`/groups/${encodeURIComponent(groupId)}`);
  }

  // ─── Rollout Statuses ─────────────────────────────────────

  async listRolloutStatuses(workspaceId: string) {
    let res = await this.apiV2.get('/rolloutStatuses', {
      params: { wsId: workspaceId }
    });
    return res.data as Array<{
      id: string;
      name: string;
      description: string;
    }>;
  }

  // ─── Attributes ────────────────────────────────────────────

  async listAttributes(workspaceId: string, trafficTypeId: string) {
    let res = await this.apiV2.get(
      `/schema/ws/${encodeURIComponent(workspaceId)}/trafficTypes/${encodeURIComponent(trafficTypeId)}`
    );
    return res.data as Array<{
      id: string;
      displayName: string;
      description: string;
      dataType: string;
      suggestedValues: string[];
      organizationId: string;
      trafficTypeId: string;
      isSearchable: boolean;
    }>;
  }

  async createAttribute(
    workspaceId: string,
    trafficTypeId: string,
    body: {
      id: string;
      displayName?: string;
      description?: string;
      dataType: string;
      suggestedValues?: string[];
    }
  ) {
    let res = await this.apiV2.post(
      `/schema/ws/${encodeURIComponent(workspaceId)}/trafficTypes/${encodeURIComponent(trafficTypeId)}`,
      body
    );
    return res.data;
  }

  // ─── Identities ────────────────────────────────────────────

  async saveIdentities(
    trafficTypeId: string,
    environmentId: string,
    identities: Array<{ key: string; values: Record<string, unknown> }>
  ) {
    let res = await this.apiV2.post(
      `/trafficTypes/${encodeURIComponent(trafficTypeId)}/environments/${encodeURIComponent(environmentId)}/identities`,
      identities
    );
    return res.data;
  }

  // ─── Change Requests ──────────────────────────────────────

  async listChangeRequests(params?: { limit?: number; after?: string }) {
    let res = await this.apiV2.get('/changeRequests', {
      params: {
        limit: params?.limit ?? 50,
        ...(params?.after ? { after: params.after } : {})
      }
    });
    return res.data;
  }
}

// ─── Types ─────────────────────────────────────────────────

export type JsonPatchOp = {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: unknown;
};

export type FeatureFlag = {
  id: string;
  name: string;
  description: string | null;
  trafficType: { id: string; name: string };
  creationTime: number;
  rolloutStatus?: { id: string; name: string } | null;
  tags: Array<{ name: string }> | null;
};

export type FeatureFlagPage = {
  objects: FeatureFlag[];
  offset: number;
  limit: number;
  totalCount: number;
  matchingCount?: number;
};

export type FlagDefinition = {
  id: string;
  name: string;
  environment: { id: string; name: string };
  trafficType: { id: string; name: string };
  killed: boolean;
  treatments: Treatment[];
  defaultTreatment: string;
  baselineTreatment?: string;
  trafficAllocation: number;
  rules: Rule[];
  defaultRule: Bucket[];
  creationTime: number;
  lastUpdateTime: number;
  lastTrafficReceivedAt?: number;
  changeNumber?: number;
  openChangeRequestId?: string | null;
  impressionsDisabled?: boolean;
};

export type Treatment = {
  name: string;
  description?: string;
  configurations?: string;
  keys?: string[];
  segments?: string[];
};

export type Bucket = {
  treatment: string;
  size: number;
};

export type Matcher = {
  negate?: boolean;
  type: string;
  attribute?: string;
  string?: string;
  bool?: boolean;
  strings?: string[];
  number?: number;
  date?: number;
  between?: { from: number; to: number } | { from: string; to: string };
  depends?: { splitName: string; treatment: string };
};

export type Condition = {
  combiner: string;
  matchers: Matcher[];
};

export type Rule = {
  buckets: Bucket[];
  condition: Condition;
};

export type FlagDefinitionBody = {
  treatments: Treatment[];
  defaultTreatment: string;
  baselineTreatment?: string;
  rules?: Rule[];
  defaultRule: Bucket[];
  trafficAllocation?: number;
  comment?: string;
};

export type Segment = {
  name: string;
  description?: string | null;
  trafficType?: { id: string; name: string };
  creationTime?: number;
  tags?: Array<{ name: string }>;
};

export type FlagSet = {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  workspace: { id: string; type: string };
  createdAt: string;
};

export type SplitUser = {
  id: string;
  email: string;
  name: string;
  status: string;
  '2fa'?: boolean;
  type: string;
  groups?: Array<{ id: string; type: string }>;
};

export type SplitGroup = {
  id: string;
  name: string;
  description?: string;
  type: string;
};
