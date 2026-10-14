import { createApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';

type Data = Record<string, any>;
type Auth = { token: string; apiKey?: string; apiSecret?: string; apiToken?: string };

export let getTaskRelationships = (item: Data) => {
  let leadId =
    item.leadId ??
    item.lead_id ??
    (item.customerType === 'lead' ? (item.customerId ?? item.customer_id) : undefined);
  let customerId = item.customerId ?? item.customer_id;
  return {
    leadId: leadId == null ? undefined : String(leadId),
    customerId: customerId == null ? undefined : String(customerId)
  };
};

const LEAD_STATUS: Record<string, number> = {
  new: 0,
  quoted: 1,
  won: 2,
  lost: 3,
  contacted: 4,
  'x-dated': 5
};
const POLICY_STATUS: Record<string, number> = {
  cancelled: 0,
  active: 1,
  renewed: 11,
  reinstated: 12,
  rewritten: 13
};
const LEAD_FIELDS = [
  'firstname',
  'lastname',
  'middlename',
  'email',
  'phone',
  'secondaryEmail',
  'secondaryPhone',
  'notes',
  'pipelineId',
  'stageId',
  'contactDate',
  'soldDate',
  'leadSourceId',
  'assignmentGroupId',
  'xDate',
  'quoteDate',
  'assignTo',
  'csrId',
  'streetAddress',
  'streetAddressLine2',
  'city',
  'state',
  'country',
  'zip',
  'agencyNumber',
  'departmentCode',
  'groupCode',
  'customFields',
  'birthday',
  'nickname',
  'maritalStatus',
  'tagNames',
  'nextExpirationDate',
  'otherProducers',
  'otherCsrs',
  'name',
  'contactName',
  'fein',
  'businessEntity',
  'businessClassification',
  'businessClassificationId',
  'yearBusinessStarted',
  'numberOfEmployees',
  'annualRevenue',
  'payroll',
  'dba'
];

let numericId = (value: unknown, field: string): number => {
  let parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw createApiServiceError(
      `${field} must be a non-negative whole-number AgencyZoom ID. Use list_reference_data to discover valid IDs.`
    );
  }
  return parsed;
};

let apiDate = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}`
    : value;

let customFields = (values: Data) =>
  Object.entries(values).map(([fieldName, value]) => ({
    fieldName,
    fieldValue: (Array.isArray(value) ? value : [value]).map(item => {
      if (item !== null && typeof item === 'object') {
        throw createApiServiceError(
          `Custom field ${fieldName} must contain scalar values or an array of scalar values.`
        );
      }
      return item == null ? '' : String(item);
    })
  }));

let rows = (value: any, key: string): Data[] => {
  let items = Array.isArray(value) ? value : (value?.[key] ?? value?.data ?? value?.items);
  if (!Array.isArray(items)) {
    throw createApiServiceError(`AgencyZoom returned an unexpected ${key} response.`);
  }
  return items;
};

let requireFields = (data: Data, fields: string[], operation: string) => {
  let missing = fields.filter(
    field => data[field] === undefined || data[field] === null || data[field] === ''
  );
  if (missing.length) {
    throw createApiServiceError(
      `${operation} requires ${missing.join(', ')}. Supply these fields using the corresponding tool inputs.`
    );
  }
};

let contactPayload = (data: Data): Data => {
  let result = { ...data };
  if (data.firstName !== undefined) result.firstname = data.firstName;
  if (data.lastName !== undefined) result.lastname = data.lastName;
  if (data.address !== undefined) {
    Object.assign(
      result,
      pickDefined({
        streetAddress: data.address.street,
        city: data.address.city,
        state: data.address.state,
        country: data.address.country,
        zip: data.address.zip
      })
    );
  }
  if (data.tags !== undefined) result.tagNames = data.tags.join(';');
  if (data.customFields !== undefined && !Array.isArray(data.customFields))
    result.customFields = customFields(data.customFields);
  for (let field of ['firstName', 'lastName', 'address', 'tags']) result[field] = undefined;
  return result;
};

export class Client {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(private authConfig: Auth) {
    if (!authConfig.token && !(authConfig.apiKey && authConfig.apiSecret)) {
      throw createApiServiceError(
        'AgencyZoom authentication is missing. Reconnect your account.'
      );
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.agencyzoom.com/v1/api',
      timeout: 30000,
      authHeader: authConfig.token ? { value: `Bearer ${authConfig.token}` } : undefined,
      headers: {
        ...(authConfig.apiKey ? { 'X-Api-Key': authConfig.apiKey } : {}),
        ...(authConfig.apiSecret ? { 'X-Api-Secret': authConfig.apiSecret } : {})
      }
    });
    this.api.interceptors.response.use(response => {
      if (response.data?.result === false) {
        throw createApiServiceError(
          `AgencyZoom request failed: ${response.data.message || 'the provider reported an unsuccessful operation'}.`
        );
      }
      return response;
    });
  }

  private async referenceId(value: unknown, type: 'carrier' | 'productLine'): Promise<number> {
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
      return numericId(value, type);
    }
    let result = type === 'carrier' ? await this.getCarriers() : await this.getProductLines();
    let entries = rows(result, type === 'carrier' ? 'carriers' : 'productLines');
    let text = String(value).toLowerCase();
    let matches = entries.filter(item =>
      [item.name, item.standardCarrierCode, item.standardProductLineCode].some(
        name => typeof name === 'string' && name.toLowerCase() === text
      )
    );
    if (matches.length !== 1) {
      throw createApiServiceError(
        `Could not uniquely resolve ${type} "${value}". Use list_reference_data to choose its ID.`
      );
    }
    return numericId(matches[0]!.id, type);
  }

  private async productPayload(data: Data, policy = false): Promise<Data> {
    let result = { ...data };
    if (data.carrier !== undefined)
      result.carrierId = await this.referenceId(data.carrier, 'carrier');
    if (data.productLine !== undefined)
      result[policy ? 'policyType' : 'productLineId'] = await this.referenceId(
        data.productLine,
        'productLine'
      );
    if (data.propertyAddress !== undefined) {
      result.property = pickDefined({
        address1: data.propertyAddress.street,
        city: data.propertyAddress.city,
        state: data.propertyAddress.state,
        zip: data.propertyAddress.zip,
        country: data.propertyAddress.country
      });
    }
    if (data.locationId !== undefined)
      result[policy ? 'agencyNumber' : 'locationId'] = data.locationId;
    if (data.tags !== undefined) result.tagNames = data.tags.join(';');
    for (let field of ['carrier', 'productLine', 'propertyAddress', 'tags'])
      result[field] = undefined;
    if (policy) result.locationId = undefined;
    for (let field of ['customerId', 'agentId', 'csrId', 'leadSourceId', 'assignTo']) {
      if (result[field] !== undefined) result[field] = numericId(result[field], field);
    }
    for (let field of ['effectiveDate', 'expiryDate', 'soldDate']) {
      if (result[field] !== undefined) result[field] = apiDate(result[field]);
    }
    return result;
  }

  private async paged(
    endpoint: string,
    key: string,
    data: Data,
    maximum: number,
    input: Data,
    predicate?: (item: Data) => boolean
  ): Promise<Data> {
    let offset = input.offset ?? 0;
    let limit = input.limit ?? 20;
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1
    ) {
      throw createApiServiceError(
        'offset must be a non-negative whole number and limit must be a positive whole number.'
      );
    }
    let pageSize = predicate ? maximum : Math.min(limit, maximum);
    let page = predicate ? 0 : Math.floor(offset / pageSize);
    let skip = predicate ? offset : offset % pageSize;
    let selected: Data[] = [];
    let total = 0;
    let matched = 0;
    for (let calls = 0; calls < 100; calls++, page++) {
      let response = await this.api.post(endpoint, { ...data, page, pageSize });
      let items = rows(response.data, key);
      let count = response.data?.totalCount ?? response.data?.total ?? response.data?.count;
      total = typeof count === 'number' ? count : page * pageSize + items.length;
      for (let item of items) {
        if (predicate && !predicate(item)) continue;
        if (matched++ < skip) continue;
        if (selected.length < limit) selected.push(item);
      }
      let finished =
        typeof count === 'number' ? (page + 1) * pageSize >= count : items.length < pageSize;
      if (finished || (!predicate && selected.length >= limit)) {
        return { [key]: selected, total: predicate ? matched : total };
      }
      if (!items.length) {
        throw createApiServiceError(
          'AgencyZoom pagination ended before its reported total. Retry the search.'
        );
      }
    }
    throw createApiServiceError(
      'This search exceeds 100 API pages. Narrow the supported date, status, or assignment filters and try again.'
    );
  }

  async searchLeads(params: Data = {}): Promise<any> {
    let data = pickDefined({
      assignedTo:
        params.producerId === undefined
          ? undefined
          : numericId(params.producerId, 'producerId'),
      leadSourceId:
        params.leadSourceId === undefined
          ? undefined
          : numericId(params.leadSourceId, 'leadSourceId'),
      workflowId:
        params.pipelineId === undefined
          ? undefined
          : numericId(params.pipelineId, 'pipelineId'),
      workflowStageId: params.stageId,
      status: params.status === undefined ? undefined : LEAD_STATUS[params.status],
      startDate: params.fromDate,
      endDate: params.toDate
    });
    let query = params.search?.toLowerCase();
    return this.paged(
      '/leads/list',
      'leads',
      data,
      100,
      params,
      query === undefined
        ? undefined
        : item =>
            [
              item.firstname,
              item.lastname,
              item.firstName,
              item.lastName,
              item.email,
              item.phone,
              item.name
            ]
              .join(' ')
              .toLowerCase()
              .includes(query)
    );
  }

  async getLead(leadId: string): Promise<any> {
    return (await this.api.get(`/leads/${encodeURIComponent(leadId)}`)).data;
  }

  async resolveTagNames(value: unknown): Promise<string[] | undefined> {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return value ? value.split(';') : [];
    if (!Array.isArray(value))
      throw createApiServiceError('AgencyZoom returned an unexpected tag value.');
    if (value.every(item => typeof item === 'string')) return value;
    if (!value.every(item => typeof item === 'number'))
      throw createApiServiceError('AgencyZoom returned unrecognized tag identifiers.');
    let tags = rows((await this.api.get('/tags')).data, 'tags');
    return value.map(id => {
      let tag = tags.find(item => item.id === id);
      if (typeof tag?.name !== 'string')
        throw createApiServiceError(`AgencyZoom did not return the name for tag ${id}.`);
      return tag.name;
    });
  }

  private leadPayload(data: Data): Data {
    let result = contactPayload(data);
    if (data.agentId !== undefined) result.assignTo = numericId(data.agentId, 'agentId');
    if (data.companyName !== undefined) result.name = data.companyName;
    if (data.classification !== undefined) result.businessClassification = data.classification;
    if (data.employeeCount !== undefined) result.numberOfEmployees = data.employeeCount;
    for (let field of ['pipelineId', 'stageId', 'leadSourceId']) {
      if (result[field] !== undefined) result[field] = numericId(result[field], field);
    }
    for (let field of ['agentId', 'companyName', 'classification', 'employeeCount'])
      result[field] = undefined;
    return result;
  }

  async createLead(data: Data): Promise<any> {
    let payload = this.leadPayload(data);
    requireFields(
      payload,
      ['firstname', 'email', 'pipelineId', 'stageId', 'leadSourceId', 'assignTo', 'country'],
      'Creating a personal lead'
    );
    return (await this.api.post('/leads/create', payload)).data;
  }

  async createBusinessLead(data: Data): Promise<any> {
    return (await this.api.post('/leads/create-biz-lead', this.leadPayload(data))).data;
  }

  async updateLead(leadId: string, data: Data): Promise<any> {
    let current = await this.getLead(leadId);
    let preserved = pickDefined(
      Object.fromEntries(LEAD_FIELDS.map(field => [field, current[field]]))
    );
    Object.assign(
      preserved,
      pickDefined({
        notes: current.notes ?? current.comments,
        pipelineId: current.pipelineId ?? current.workflowId,
        stageId: current.stageId ?? current.workflowStageId,
        assignTo: current.assignTo ?? current.assignedTo,
        name: current.name ?? current.businessName
      })
    );
    let changes = this.leadPayload(data);
    if (Array.isArray(current.customFields) && Array.isArray(changes.customFields)) {
      changes.customFields = [
        ...current.customFields.filter(
          (field: Data) =>
            !changes.customFields.some(
              (updated: Data) => updated.fieldName === field.fieldName
            )
        ),
        ...changes.customFields
      ];
    }
    let payload = { ...preserved, ...changes };
    if (payload.tagNames !== undefined) {
      payload.tagNames = (await this.resolveTagNames(payload.tagNames))?.join(';');
    }
    requireFields(
      payload,
      ['firstname', 'email', 'leadSourceId', 'assignTo', 'country'],
      'Updating a lead'
    );
    let business =
      data.type === undefined
        ? ['business', 'commercial', 'biz'].includes(String(current.leadType).toLowerCase())
        : data.type === 'business';
    payload.type = undefined;
    return (
      await this.api.put(
        `/leads/${encodeURIComponent(leadId)}${business ? '/update-biz-lead' : ''}`,
        payload
      )
    ).data;
  }

  async deleteLead(leadId: string): Promise<any> {
    return (await this.api.post(`/leads/${encodeURIComponent(leadId)}/delete-lead`, {})).data;
  }

  async changeLeadStatus(leadId: string, data: Data): Promise<any> {
    return (
      await this.api.put(`/leads/${encodeURIComponent(leadId)}/status`, {
        ...data,
        status: LEAD_STATUS[data.status]
      })
    ).data;
  }

  async markLeadSold(leadId: string, data: Data): Promise<any> {
    let product = await this.productPayload(data);
    requireFields(
      product,
      ['carrierId', 'productLineId', 'premium', 'items'],
      'Marking a lead sold'
    );
    return (
      await this.api.post(`/leads/${encodeURIComponent(leadId)}/sold`, {
        soldProducts: [{ ...product, isSold: true }]
      })
    ).data;
  }

  async addLeadNote(leadId: string, data: Data): Promise<any> {
    return (await this.api.post(`/leads/${encodeURIComponent(leadId)}/notes`, data)).data;
  }

  async getLeadOpportunities(leadId: string): Promise<any> {
    return (await this.api.get(`/leads/${encodeURIComponent(leadId)}/opportunities`)).data;
  }

  async addLeadOpportunity(leadId: string, data: Data): Promise<any> {
    let payload = await this.productPayload(data);
    requireFields(
      payload,
      ['carrierId', 'productLineId', 'premium', 'items'],
      'Creating a lead opportunity'
    );
    return (await this.api.post(`/leads/${encodeURIComponent(leadId)}/opportunities`, payload))
      .data;
  }

  async updateLeadOpportunity(
    leadId: string,
    opportunityId: string,
    data: Data
  ): Promise<any> {
    let current = rows(await this.getLeadOpportunities(leadId), 'opportunities').find(
      item => String(item.id) === opportunityId
    );
    if (!current) throw createApiServiceError('The opportunity was not found on this lead.');
    let payload = {
      ...pickDefined({
        carrierId: current.carrierId,
        standardCarrierCode: current.standardCarrierCode,
        productLineId: current.productLineId,
        standardProductLineCode: current.standardProductLineCode,
        items: current.items,
        premium: current.premium,
        expiryDate: current.expiryDate,
        assignTo: current.assignTo,
        customFields: current.customFields
      }),
      ...(await this.productPayload(data)),
      id: numericId(opportunityId, 'opportunityId')
    };
    return (await this.api.put(`/leads/${encodeURIComponent(leadId)}/opportunities`, payload))
      .data;
  }

  async deleteLeadOpportunity(leadId: string, opportunityId: string): Promise<any> {
    return (
      await this.api.delete(
        `/leads/${encodeURIComponent(leadId)}/opportunities/${encodeURIComponent(opportunityId)}`
      )
    ).data;
  }

  async getLeadQuotes(leadId: string): Promise<any> {
    return (await this.api.get(`/leads/${encodeURIComponent(leadId)}/quotes`)).data;
  }

  async addLeadQuote(leadId: string, data: Data): Promise<any> {
    let payload = await this.productPayload(data);
    requireFields(
      payload,
      ['carrierId', 'productLineId', 'premium', 'items'],
      'Creating a lead quote'
    );
    return (await this.api.post(`/leads/${encodeURIComponent(leadId)}/quotes`, payload)).data;
  }

  async updateLeadQuote(leadId: string, quoteId: string, data: Data): Promise<any> {
    let current = rows(await this.getLeadQuotes(leadId), 'quotes').find(
      item => String(item.id) === quoteId
    );
    if (!current) throw createApiServiceError('The quote was not found on this lead.');
    let payload = {
      ...pickDefined({
        carrierId: current.carrierId,
        standardCarrierCode: current.standardCarrierCode,
        productLineId: current.productLineId,
        standardProductLineCode: current.standardProductLineCode,
        items: current.items,
        premium: current.premium,
        customFields: current.customFields
      }),
      ...(await this.productPayload(data)),
      id: numericId(quoteId, 'quoteId')
    };
    return (await this.api.put(`/leads/${encodeURIComponent(leadId)}/quotes`, payload)).data;
  }

  async deleteLeadQuote(leadId: string, quoteId: string): Promise<any> {
    return (
      await this.api.delete(
        `/leads/${encodeURIComponent(leadId)}/quotes/${encodeURIComponent(quoteId)}`
      )
    ).data;
  }

  async searchCustomers(params: Data = {}): Promise<any> {
    let query = params.search?.toLowerCase();
    let predicate =
      query !== undefined || params.type !== undefined
        ? (item: Data) => {
            let business =
              item.bizCustomer === true || item.bizCustomer === 1 || item.bizCustomer === '1';
            return (
              (params.type === undefined || (params.type === 'commercial') === business) &&
              (query === undefined ||
                [
                  item.firstname,
                  item.lastname,
                  item.firstName,
                  item.lastName,
                  item.businessName,
                  item.companyName,
                  item.email,
                  item.phone
                ]
                  .join(' ')
                  .toLowerCase()
                  .includes(query))
            );
          }
        : undefined;
    return this.paged(
      '/customers',
      'customers',
      pickDefined({ startDate: params.fromDate, endDate: params.toDate }),
      100,
      params,
      predicate
    );
  }

  async getCustomer(customerId: string): Promise<any> {
    return (await this.api.get(`/customers/${encodeURIComponent(customerId)}`)).data;
  }

  private customerPayload(data: Data): Data {
    let payload = contactPayload(data);
    if (data.type !== undefined) payload.bizCustomer = data.type === 'commercial' ? 1 : 0;
    if (data.employeeCount !== undefined) payload.numberOfEmployees = data.employeeCount;
    if (data.payroll !== undefined) payload.totalPayroll = data.payroll;
    for (let field of ['agentId', 'csrId'])
      if (payload[field] !== undefined) payload[field] = numericId(payload[field], field);
    for (let field of ['type', 'employeeCount', 'payroll']) payload[field] = undefined;
    return payload;
  }

  async createCustomer(data: Data): Promise<any> {
    let payload = this.customerPayload(data);
    requireFields(payload, ['firstname', 'email', 'agentId'], 'Creating a customer');
    return (await this.api.post('/customers/create', payload)).data;
  }

  async updateCustomer(customerId: string, data: Data): Promise<any> {
    return (
      await this.api.put(
        `/customers/${encodeURIComponent(customerId)}`,
        this.customerPayload(data)
      )
    ).data;
  }

  async deleteCustomer(customerId: string): Promise<any> {
    return (await this.api.delete(`/customers/${encodeURIComponent(customerId)}`)).data;
  }

  async addCustomerNote(customerId: string, data: Data): Promise<any> {
    return (await this.api.post(`/customers/${encodeURIComponent(customerId)}/notes`, data))
      .data;
  }

  async getCustomerPolicies(customerId: string): Promise<any> {
    return (await this.api.get(`/customers/${encodeURIComponent(customerId)}/policies`)).data;
  }

  async getCustomerAmsPolicies(customerId: string): Promise<any> {
    return (await this.api.get(`/customers/${encodeURIComponent(customerId)}/ams-policies`))
      .data;
  }

  async getCustomerTasks(customerId: string): Promise<any> {
    return (await this.api.get(`/customers/${encodeURIComponent(customerId)}/tasks`)).data;
  }

  async updateCustomerTags(customerId: string, data: Data): Promise<any> {
    return this.updateCustomer(customerId, { tags: data.tags });
  }

  async createPolicy(data: Data): Promise<any> {
    if (!this.authConfig.apiToken)
      throw createApiServiceError(
        'Policy creation requires an additional X-Api-Token. Add it to your connection credentials.'
      );
    let payload = await this.productPayload(data, true);
    requireFields(
      payload,
      [
        'customerId',
        'carrierId',
        'soldDate',
        'agentId',
        'policyType',
        'premium',
        'items',
        'leadSourceId',
        'agencyNumber',
        'effectiveDate',
        'expiryDate'
      ],
      'Creating a policy'
    );
    return (
      await this.api.post('/policies/create', payload, {
        headers: { 'X-Api-Token': this.authConfig.apiToken }
      })
    ).data;
  }

  async updatePolicy(policyId: string, data: Data): Promise<any> {
    return (
      await this.api.put(
        `/policies/${encodeURIComponent(policyId)}`,
        await this.productPayload(data, true)
      )
    ).data;
  }

  async updatePolicyStatus(policyId: string, data: Data): Promise<any> {
    return (
      await this.api.post('/policies/update-status', {
        policyId: numericId(policyId, 'policyId'),
        status: POLICY_STATUS[data.status]
      })
    ).data;
  }

  async updatePolicyTags(policyId: string, data: Data): Promise<any> {
    return (
      await this.api.post('/policies/update-tags', {
        policyId: numericId(policyId, 'policyId'),
        tagNames: data.tags.join(';')
      })
    ).data;
  }

  async createPolicyEndorsement(policyId: string, data: Data): Promise<any> {
    let payload = {
      ...data,
      policyId: numericId(policyId, 'policyId'),
      effectiveDate: apiDate(data.effectiveDate)
    };
    requireFields(
      payload,
      ['effectiveDate', 'endorsementNumber', 'premiumChange', 'description'],
      'Creating an endorsement'
    );
    return (await this.api.post('/policies/endorse', payload)).data;
  }

  async deletePolicy(policyId: string, customerId?: string): Promise<any> {
    let path = customerId
      ? `/customers/${encodeURIComponent(customerId)}/policies/${encodeURIComponent(policyId)}`
      : `/policies/${encodeURIComponent(policyId)}`;
    return (await this.api.delete(path)).data;
  }

  async searchTasks(params: Data = {}): Promise<any> {
    let data = pickDefined({
      status: params.status === undefined ? undefined : params.status === 'completed' ? 1 : 0,
      assigneeId:
        params.assigneeId === undefined
          ? undefined
          : numericId(params.assigneeId, 'assigneeId'),
      startDate: params.fromDate,
      endDate: params.toDate
    });
    let query = params.search?.toLowerCase();
    let predicate =
      query !== undefined ||
      params.leadId !== undefined ||
      params.customerId !== undefined ||
      params.type !== undefined
        ? (item: Data) => {
            let relationships = getTaskRelationships(item);
            if (params.type !== undefined) {
              let activity = item.type === 'todo' ? 'to-do' : (item.type ?? item.taskType);
              if (!['to-do', 'email', 'call', 'meeting'].includes(activity)) {
                throw createApiServiceError(
                  'AgencyZoom did not return an activity type for these tasks. Omit the activity type filter; the provider search categories are sales and onboarding.'
                );
              }
              if (activity !== params.type) return false;
            }
            return (
              (query === undefined ||
                [item.title, item.comments].join(' ').toLowerCase().includes(query)) &&
              (params.leadId === undefined || relationships.leadId === params.leadId) &&
              (params.customerId === undefined ||
                relationships.customerId === params.customerId)
            );
          }
        : undefined;
    return this.paged('/tasks/list', 'tasks', data, 200, params, predicate);
  }

  async getTask(taskId: string): Promise<any> {
    return (await this.api.get(`/tasks/${encodeURIComponent(taskId)}`)).data;
  }

  private taskPayload(data: Data): Data {
    let payload = { ...data };
    if (data.type !== undefined) payload.type = data.type === 'to-do' ? 'todo' : data.type;
    if (data.notes !== undefined) payload.comments = data.notes;
    if (data.dueTime !== undefined && data.dueDate === undefined)
      throw createApiServiceError('A due date is required when setting a due time.');
    if (data.dueDate !== undefined) {
      payload.dueDatetime = `${data.dueDate} ${data.dueTime ?? '00:00'}${/^\d{2}:\d{2}$/.test(data.dueTime ?? '00:00') ? ':00' : ''}`;
      payload.timeSpecific = data.dueTime !== undefined;
    }
    for (let field of ['assigneeId', 'leadId', 'customerId'])
      if (payload[field] !== undefined) payload[field] = numericId(payload[field], field);
    for (let field of ['notes', 'dueDate', 'dueTime']) payload[field] = undefined;
    return payload;
  }

  async createTask(data: Data): Promise<any> {
    return (await this.api.post('/tasks', this.taskPayload(data))).data;
  }

  async updateTask(taskId: string, data: Data): Promise<any> {
    if ((data.dueTime !== undefined) !== (data.dueDate !== undefined)) {
      let current = await this.getTask(taskId);
      if (data.dueDate === undefined) {
        let dueDate = current.dueDate ?? current.taskDateTime;
        if (typeof dueDate !== 'string')
          throw createApiServiceError(
            'AgencyZoom did not return the current task due date. Supply dueDate with dueTime.'
          );
        data = { ...data, dueDate: dueDate.slice(0, 10) };
      } else if (current.timeSpecific) {
        let dueTime =
          typeof current.taskDateTime === 'string'
            ? current.taskDateTime.match(/[T ](\d{2}:\d{2}(?::\d{2})?)/)?.[1]
            : undefined;
        if (!dueTime)
          throw createApiServiceError(
            'AgencyZoom did not return the current task due time. Supply dueTime with dueDate.'
          );
        data = { ...data, dueTime };
      }
    }
    return (await this.api.put(`/tasks/${encodeURIComponent(taskId)}`, this.taskPayload(data)))
      .data;
  }

  async deleteTask(taskId: string): Promise<any> {
    return (await this.api.delete(`/tasks/${encodeURIComponent(taskId)}`)).data;
  }

  async completeTask(taskId: string): Promise<any> {
    return (await this.api.put(`/tasks/${encodeURIComponent(taskId)}/completed`)).data;
  }

  async reopenTask(taskId: string, data: Data = {}): Promise<any> {
    return (
      await this.api.put(
        `/tasks/${encodeURIComponent(taskId)}/reopened`,
        pickDefined({ comments: data.comment })
      )
    ).data;
  }

  async batchDeleteTasks(taskIds: string[]): Promise<any> {
    return (
      await this.api.post('/tasks/batch-delete', {
        taskIds: taskIds.map(value => numericId(value, 'taskId'))
      })
    ).data;
  }

  async getOpportunity(opportunityId: string): Promise<any> {
    return (await this.api.get(`/opportunities/${encodeURIComponent(opportunityId)}`)).data;
  }

  async createOpportunity(data: Data): Promise<any> {
    let payload = await this.productPayload(data);
    if (data.leadId !== undefined)
      payload.customerReferralId = numericId(data.leadId, 'leadId');
    payload.leadId = undefined;
    requireFields(payload, ['productLineId', 'customerReferralId'], 'Creating an opportunity');
    return (await this.api.post('/opportunities', payload)).data;
  }

  async updateOpportunity(opportunityId: string, data: Data): Promise<any> {
    let current = await this.getOpportunity(opportunityId);
    let payload = {
      ...pickDefined({
        carrierId: current.carrierId,
        standardCarrierCode: current.standardCarrierCode,
        productLineId: current.productLineId,
        standardProductLineCode: current.standardProductLineCode,
        items: current.items,
        premium: current.premium,
        expiryDate: current.expiryDate,
        assignTo: current.assignTo,
        customFields: current.customFields,
        property: current.property ?? current.propertyAddress?.[0]
      }),
      ...(await this.productPayload(data))
    };
    if (data.propertyAddress !== undefined) {
      payload.property = {
        ...(current.property ?? current.propertyAddress?.[0] ?? {}),
        ...payload.property
      };
    }
    return (await this.api.put(`/opportunities/${encodeURIComponent(opportunityId)}`, payload))
      .data;
  }

  async deleteOpportunity(opportunityId: string): Promise<any> {
    return (await this.api.delete(`/opportunities/${encodeURIComponent(opportunityId)}`)).data;
  }

  async getOpportunityDrivers(opportunityId: string): Promise<any> {
    return (await this.api.get(`/opportunities/${encodeURIComponent(opportunityId)}/drivers`))
      .data;
  }

  private driverPayload(data: Data): Data {
    let payload = { ...data };
    if (data.birthday !== undefined) payload.birthday = apiDate(data.birthday);
    if (data.maritalStatus !== undefined) {
      let codes: Record<string, number> = {
        single: 1,
        married: 2,
        widowed: 3,
        separated: 4,
        divorced: 5,
        'domestic partner': 6,
        'civil union': 7,
        fiancé: 8,
        fiancée: 8,
        unknown: 9,
        other: 10
      };
      payload.maritalStatus =
        codes[String(data.maritalStatus).toLowerCase()] ??
        numericId(data.maritalStatus, 'maritalStatus');
      if (payload.maritalStatus < 1 || payload.maritalStatus > 10)
        throw createApiServiceError(
          'maritalStatus must be a documented AgencyZoom status from 1 to 10.'
        );
    }
    if (data.gender !== undefined) {
      let codes: Record<string, string> = {
        male: 'M',
        female: 'F',
        unknown: 'U',
        'non-binary': 'X'
      };
      payload.gender = codes[String(data.gender).toLowerCase()] ?? data.gender;
      if (!['M', 'F', 'U', 'X'].includes(payload.gender))
        throw createApiServiceError(
          'gender must be male, female, unknown, non-binary, or the matching M/F/U/X code.'
        );
    }
    return payload;
  }

  async createOpportunityDriver(opportunityId: string, data: Data): Promise<any> {
    requireFields(data, ['firstName', 'lastName'], 'Creating a driver');
    return (
      await this.api.post(
        `/opportunities/${encodeURIComponent(opportunityId)}/driver`,
        this.driverPayload(data)
      )
    ).data;
  }

  async updateOpportunityDriver(
    _opportunityId: string,
    driverId: string,
    data: Data
  ): Promise<any> {
    let current = (
      await this.api.get(`/opportunities/drivers/${encodeURIComponent(driverId)}`)
    ).data;
    let preserved = pickDefined(
      Object.fromEntries(
        [
          'firstName',
          'middleName',
          'lastName',
          'birthday',
          'relationship',
          'gender',
          'maritalStatus',
          'stateLicensed',
          'licenseNumber'
        ].map(field => [field, current[field]])
      )
    );
    return (
      await this.api.put(`/opportunities/drivers/${encodeURIComponent(driverId)}`, {
        ...preserved,
        ...this.driverPayload(data)
      })
    ).data;
  }

  async deleteOpportunityDriver(opportunityId: string, driverId: string): Promise<any> {
    return (
      await this.api.put(
        `/opportunities/${encodeURIComponent(opportunityId)}/unlink-driver/${encodeURIComponent(driverId)}`
      )
    ).data;
  }

  async getOpportunityVehicles(opportunityId: string): Promise<any> {
    return (await this.api.get(`/opportunities/${encodeURIComponent(opportunityId)}/vehicles`))
      .data;
  }

  private vehiclePayload(data: Data): Data {
    let payload = { ...data };
    if (data.ownershipType !== undefined) {
      let types: Record<string, string> = {
        owned: 'Owned',
        financed: 'Financed',
        leased: 'Leased'
      };
      payload.ownership = types[String(data.ownershipType).toLowerCase()];
      if (!payload.ownership)
        throw createApiServiceError('ownershipType must be owned, financed, or leased.');
    }
    payload.ownershipType = undefined;
    return payload;
  }

  async createOpportunityVehicle(opportunityId: string, data: Data): Promise<any> {
    requireFields(data, ['make'], 'Creating a vehicle');
    return (
      await this.api.post(
        `/opportunities/${encodeURIComponent(opportunityId)}/vehicle`,
        this.vehiclePayload(data)
      )
    ).data;
  }

  async updateOpportunityVehicle(
    _opportunityId: string,
    vehicleId: string,
    data: Data
  ): Promise<any> {
    let current = (
      await this.api.get(`/opportunities/vehicles/${encodeURIComponent(vehicleId)}`)
    ).data;
    let preserved = pickDefined(
      Object.fromEntries(
        ['vin', 'make', 'year', 'model', 'ownership'].map(field => [field, current[field]])
      )
    );
    return (
      await this.api.put(`/opportunities/vehicles/${encodeURIComponent(vehicleId)}`, {
        ...preserved,
        ...this.vehiclePayload(data)
      })
    ).data;
  }

  async deleteOpportunityVehicle(opportunityId: string, vehicleId: string): Promise<any> {
    return (
      await this.api.put(
        `/opportunities/${encodeURIComponent(opportunityId)}/unlink-vehicle/${encodeURIComponent(vehicleId)}`
      )
    ).data;
  }

  async searchServiceTickets(params: Data = {}): Promise<any> {
    let statuses: Record<string, number> = {
      removed: 0,
      deleted: 0,
      active: 1,
      open: 1,
      completed: 2
    };
    let data = pickDefined({
      status:
        params.status === undefined
          ? undefined
          : (statuses[params.status.toLowerCase()] ?? numericId(params.status, 'status')),
      category:
        params.category === undefined ? undefined : numericId(params.category, 'category'),
      priority:
        params.priority === undefined ? undefined : numericId(params.priority, 'priority'),
      resolution: params.resolution,
      createStart: apiDate(params.fromDate),
      createEnd: apiDate(params.toDate),
      carrier:
        params.carrier === undefined
          ? undefined
          : [await this.referenceId(params.carrier, 'carrier')],
      policyType:
        params.policyType === undefined
          ? undefined
          : [await this.referenceId(params.policyType, 'productLine')]
    });
    let predicate =
      params.csrId !== undefined || params.customerId !== undefined
        ? (item: Data) =>
            (params.csrId === undefined || String(item.csr ?? item.csrId) === params.csrId) &&
            (params.customerId === undefined ||
              String(item.householdId ?? item.customerId) === params.customerId)
        : undefined;
    return this.paged(
      '/serviceTicket/service-tickets/list',
      'serviceTickets',
      data,
      100,
      params,
      predicate
    );
  }

  private servicePayload(data: Data): Data {
    let payload = { ...data };
    for (let [source, target] of [
      ['csrId', 'csr'],
      ['category', 'categoryId'],
      ['priority', 'priorityId'],
      ['pipelineId', 'workflowId'],
      ['stageId', 'workflowStageId']
    ]) {
      if (data[source!] !== undefined) payload[target!] = numericId(data[source!], source!);
      payload[source!] = undefined;
    }
    if (data.customerId !== undefined)
      payload.customerId = numericId(data.customerId, 'customerId');
    if (data.tags !== undefined) payload.tagNames = data.tags.join(';');
    payload.tags = undefined;
    payload.resolution = undefined;
    payload.resolutionId = undefined;
    return payload;
  }

  async createServiceTicket(data: Data): Promise<any> {
    let payload = this.servicePayload(data);
    requireFields(
      payload,
      ['customerId', 'workflowId', 'workflowStageId', 'subject', 'priorityId', 'categoryId'],
      'Creating a service ticket'
    );
    return (await this.api.post('/serviceTicket/service-tickets/create', payload)).data;
  }

  async updateServiceTicket(ticketId: string, data: Data): Promise<any> {
    let result = (
      await this.api.post('/serviceTicket/service-tickets/list', {
        serviceTicketIds: [numericId(ticketId, 'ticketId')],
        page: 0,
        pageSize: 1
      })
    ).data;
    let current = rows(result, 'serviceTickets').find(item => String(item.id) === ticketId);
    if (!current) throw createApiServiceError('The service ticket was not found.');
    let payload = {
      ...pickDefined({
        customerId: current.householdId ?? current.customerId,
        workflowId: current.workflowId,
        workflowStageId: current.workflowStageId,
        csr: current.csr,
        assignmentGroupId: current.assignmentGroupId,
        otherCsrs: current.otherCsrs,
        subject: current.subject,
        policyIds: current.policyIds,
        bizBookIds: current.bizBookIds,
        description: current.description ?? current.serviceDesc,
        priorityId: current.priorityId,
        categoryId: current.categoryId,
        dueDate: current.dueDate,
        customFields: current.customFields,
        tagNames: current.tagNames
      }),
      ...this.servicePayload(data),
      id: numericId(ticketId, 'ticketId')
    };
    requireFields(
      payload,
      ['customerId', 'workflowId', 'workflowStageId', 'subject', 'priorityId', 'categoryId'],
      'Updating a service ticket'
    );
    return (
      await this.api.put(
        `/serviceTicket/service-tickets/${encodeURIComponent(ticketId)}`,
        payload
      )
    ).data;
  }

  async completeServiceTicket(ticketId: string, data: Data = {}): Promise<any> {
    requireFields(data, ['resolutionId'], 'Completing a service ticket');
    let resolutionDesc = [data.resolution, data.description]
      .filter(value => value !== undefined)
      .join('\n\n');
    return (
      await this.api.post(
        `/serviceTicket/service-tickets/${encodeURIComponent(ticketId)}/complete`,
        pickDefined({
          id: numericId(ticketId, 'ticketId'),
          resolutionId: numericId(data.resolutionId, 'resolutionId'),
          resolutionDesc:
            data.resolution === undefined && data.description === undefined
              ? undefined
              : resolutionDesc
        })
      )
    ).data;
  }

  async batchCreateContacts(data: Data[]): Promise<any> {
    let contacts = data.map(item => {
      let payload = contactPayload(item);
      payload.customerId = numericId(item.customerId, 'customerId');
      if (payload.streetAddress !== undefined) payload.address1 = payload.streetAddress;
      payload.streetAddress = undefined;
      if (item.birthday !== undefined) payload.birthday = apiDate(item.birthday);
      return payload;
    });
    return (await this.api.post('/contact/batch-create', { contactDataRequests: contacts }))
      .data;
  }

  async getCarriers(): Promise<any> {
    return (await this.api.get('/carriers')).data;
  }
  async getProductLines(): Promise<any> {
    return (await this.api.get('/product-lines')).data;
  }
  async getProductCategories(): Promise<any> {
    return (await this.api.get('/product-categories')).data;
  }
  async getEmployees(): Promise<any> {
    return (await this.api.get('/employees')).data;
  }
  async getLeadSources(): Promise<any> {
    return (await this.api.get('/lead-sources')).data;
  }
  async getLeadSourceCategories(): Promise<any> {
    return (await this.api.get('/lead-source-categories')).data;
  }
  async getLocations(): Promise<any> {
    return (await this.api.get('/locations')).data;
  }
  async getLossReasons(): Promise<any> {
    return (await this.api.get('/loss-reasons')).data;
  }
  async getCustomFields(): Promise<any> {
    return (await this.api.get('/custom-fields')).data;
  }

  async getPipelines(type?: 'lead' | 'service'): Promise<any> {
    if (type) return (await this.api.get('/pipelines', { params: { type } })).data;
    return [
      ...rows(
        (await this.api.get('/pipelines', { params: { type: 'lead' } })).data,
        'pipelines'
      ),
      ...rows(
        (await this.api.get('/pipelines', { params: { type: 'service' } })).data,
        'pipelines'
      )
    ];
  }

  async getPipelineStages(pipelineId: string): Promise<any> {
    let pipelines = rows((await this.api.get('/pipelines-and-stages')).data, 'pipelines');
    let pipeline = pipelines.find(item => String(item.id) === pipelineId);
    if (!pipeline)
      throw createApiServiceError(
        'The pipeline was not found. Use list_reference_data to choose a pipeline ID.'
      );
    return rows(pipeline.stages, 'stages');
  }

  async getServiceCategories(): Promise<any> {
    return (await this.api.get('/service-categories')).data;
  }
  async getServicePriorities(): Promise<any> {
    return (await this.api.get('/service-priorities')).data;
  }
  async getServiceResolutions(): Promise<any> {
    return (await this.api.get('/service-resolutions')).data;
  }
  async getAssignGroups(): Promise<any> {
    return (await this.api.get('/assign-groups')).data;
  }
  async getCsrs(): Promise<any> {
    return (await this.api.get('/csrs')).data;
  }
  async getBusinessClassifications(params: Data = {}): Promise<any> {
    return (
      await this.api.post(
        '/get-classifications',
        pickDefined({ searchText: params.search, page: 0, pageSize: 500 })
      )
    ).data;
  }
  async getLifeProfessionals(): Promise<any> {
    return (await this.api.get('/life-professionals')).data;
  }
  async getSalesSummary(data: Data): Promise<any> {
    return (
      await this.api.post(
        '/dashboard-data/sales-data',
        pickDefined({
          ...data,
          lsp: data.lsp === undefined ? undefined : numericId(data.lsp, 'producerId'),
          insco: data.insco === undefined ? undefined : numericId(data.insco, 'carrierId')
        })
      )
    ).data;
  }
}
