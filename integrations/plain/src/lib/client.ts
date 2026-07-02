import { createAxios } from 'slates';

let API_BASE = 'https://core-api.uk.plain.com/graphql/v1';

let FRAGMENT_DATE_TIME = `
fragment DateTimeParts on DateTime {
  iso8601
  unixTimestamp
}`;

let FRAGMENT_ACTOR = `
fragment UserActorParts on UserActor { __typename userId }
fragment CustomerActorParts on CustomerActor { __typename customerId }
fragment SystemActorParts on SystemActor { __typename systemId }
fragment MachineUserActorParts on MachineUserActor { __typename machineUserId }
fragment DeletedCustomerActorParts on DeletedCustomerActor { __typename customerId }
fragment ActorParts on Actor {
  ... on UserActor { ...UserActorParts }
  ... on CustomerActor { ...CustomerActorParts }
  ... on SystemActor { ...SystemActorParts }
  ... on MachineUserActor { ...MachineUserActorParts }
  ... on DeletedCustomerActor { ...DeletedCustomerActorParts }
}
fragment InternalActorParts on Actor {
  ... on UserActor { ...UserActorParts }
  ... on SystemActor { ...SystemActorParts }
  ... on MachineUserActor { ...MachineUserActorParts }
}`;

let FRAGMENT_PAGE_INFO = `
fragment PageInfoParts on PageInfo {
  hasNextPage
  hasPreviousPage
  startCursor
  endCursor
}`;

let FRAGMENT_COMPANY = `
fragment CompanyParts on Company {
  id
  name
  domainName
  createdAt { ...DateTimeParts }
  updatedAt { ...DateTimeParts }
}`;

let FRAGMENT_TIER = `
fragment TierParts on Tier {
  id
  name
  externalId
  defaultThreadPriority
  createdAt { ...DateTimeParts }
  updatedAt { ...DateTimeParts }
}`;

let FRAGMENT_TENANT = `
fragment TenantParts on Tenant {
  id
  name
  externalId
  url
  tier { ...TierParts }
  createdAt { ...DateTimeParts }
  updatedAt { ...DateTimeParts }
}`;

let FRAGMENT_CUSTOMER = `
fragment CustomerParts on Customer {
  id
  fullName
  shortName
  externalId
  email { email isVerified }
  company { ...CompanyParts }
  updatedAt { ...DateTimeParts }
  createdAt { ...DateTimeParts }
  markedAsSpamAt { ...DateTimeParts }
}`;

let FRAGMENT_LABEL_TYPE = `
fragment LabelTypeParts on LabelType {
  id
  name
  icon
  isArchived
  createdAt { ...DateTimeParts }
  updatedAt { ...DateTimeParts }
}`;

let FRAGMENT_LABEL = `
fragment LabelParts on Label {
  id
  labelType { ...LabelTypeParts }
  createdAt { ...DateTimeParts }
  updatedAt { ...DateTimeParts }
}`;

let FRAGMENT_USER = `
fragment UserParts on User { id fullName publicName email updatedAt { ...DateTimeParts } }
fragment MachineUserParts on MachineUser { id fullName publicName description updatedAt { ...DateTimeParts } }
fragment SystemParts on System { id }`;

let FRAGMENT_THREAD_ASSIGNEE = `
fragment ThreadAssigneeParts on ThreadAssignee {
  ... on User { ...UserParts }
  ... on MachineUser { ...MachineUserParts }
  ... on System { ...SystemParts }
}`;

let FRAGMENT_THREAD_FIELD = `
fragment ThreadFieldParts on ThreadField {
  id
  key
  type
  threadId
  stringValue
  booleanValue
  isAiGenerated
  createdAt { ...DateTimeParts }
  updatedAt { ...DateTimeParts }
}`;

let FRAGMENT_THREAD = `
fragment ThreadParts on Thread {
  id
  ref
  externalId
  customer { id }
  status
  statusChangedAt { ...DateTimeParts }
  title
  description
  previewText
  priority
  tenant { ...TenantParts }
  labels { ...LabelParts }
  threadFields { ...ThreadFieldParts }
  assignedAt { ...DateTimeParts }
  assignedTo { ...ThreadAssigneeParts }
  createdAt { ...DateTimeParts }
  updatedAt { ...DateTimeParts }
}`;

let FRAGMENT_MUTATION_ERROR = `
fragment MutationErrorParts on MutationError {
  message
  type
  code
  fields { field message type }
}`;

let FRAGMENT_CUSTOMER_GROUP = `
fragment CustomerGroupParts on CustomerGroup {
  id
  name
  key
  color
}`;

let FRAGMENT_CUSTOMER_EVENT = `
fragment CustomerEventParts on CustomerEvent {
  id
  title
  externalId
  createdAt { ...DateTimeParts }
}`;

let FRAGMENT_THREAD_EVENT = `
fragment ThreadEventParts on ThreadEvent {
  id
  title
  externalId
  createdAt { ...DateTimeParts }
}`;

let COMMON_FRAGMENTS = [
  FRAGMENT_DATE_TIME,
  FRAGMENT_ACTOR,
  FRAGMENT_PAGE_INFO,
  FRAGMENT_COMPANY,
  FRAGMENT_TIER,
  FRAGMENT_TENANT,
  FRAGMENT_CUSTOMER,
  FRAGMENT_LABEL_TYPE,
  FRAGMENT_LABEL,
  FRAGMENT_USER,
  FRAGMENT_THREAD_ASSIGNEE,
  FRAGMENT_THREAD_FIELD,
  FRAGMENT_THREAD,
  FRAGMENT_MUTATION_ERROR,
  FRAGMENT_CUSTOMER_GROUP,
  FRAGMENT_CUSTOMER_EVENT,
  FRAGMENT_THREAD_EVENT
].join('\n');

export class Client {
  private http;

  constructor(opts: { token: string }) {
    this.http = createAxios({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.token}`
      }
    });
  }

  private async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    let fullQuery = `${query}\n${COMMON_FRAGMENTS}`;
    let res = await this.http.post('', {
      query: fullQuery,
      variables
    });
    let body = res.data as any;
    if (body.errors && body.errors.length > 0) {
      throw new Error(`GraphQL error: ${body.errors.map((e: any) => e.message).join(', ')}`);
    }
    return body.data as T;
  }

  // ─── Customers ───

  async getCustomerByEmail(email: string) {
    let data = await this.graphql<{ customerByEmail: any }>(
      `query customerByEmail($email: String!) { customerByEmail(email: $email) { ...CustomerParts } }`,
      { email }
    );
    return data.customerByEmail;
  }

  async getCustomerById(customerId: string) {
    let data = await this.graphql<{ customer: any }>(
      `query customerById($customerId: ID!) { customer(customerId: $customerId) { ...CustomerParts } }`,
      { customerId }
    );
    return data.customer;
  }

  async getCustomerByExternalId(externalId: string) {
    let data = await this.graphql<{ customerByExternalId: any }>(
      `query customerByExternalId($externalId: ID!) { customerByExternalId(externalId: $externalId) { ...CustomerParts } }`,
      { externalId }
    );
    return data.customerByExternalId;
  }

  async getCustomers(filters?: any, first?: number, after?: string) {
    let data = await this.graphql<{ customers: any }>(
      `query customers($filters: CustomersFilter, $first: Int, $after: String) {
        customers(filters: $filters, first: $first, after: $after) {
          edges { node { ...CustomerParts } }
          pageInfo { ...PageInfoParts }
          totalCount
        }
      }`,
      { filters, first, after }
    );
    return data.customers;
  }

  async upsertCustomer(input: any) {
    let data = await this.graphql<{ upsertCustomer: any }>(
      `mutation upsertCustomer($input: UpsertCustomerInput!) {
        upsertCustomer(input: $input) { result customer { ...CustomerParts } error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.upsertCustomer.error) {
      throw new Error(`Upsert customer failed: ${data.upsertCustomer.error.message}`);
    }
    return data.upsertCustomer;
  }

  async deleteCustomer(customerId: string) {
    let data = await this.graphql<{ deleteCustomer: any }>(
      `mutation deleteCustomer($input: DeleteCustomerInput!) {
        deleteCustomer(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input: { customerId } }
    );
    if (data.deleteCustomer.error) {
      throw new Error(`Delete customer failed: ${data.deleteCustomer.error.message}`);
    }
    return data.deleteCustomer;
  }

  // ─── Companies ───

  async getCompanies(first?: number, after?: string) {
    let data = await this.graphql<{ companies: any }>(
      `query companies($first: Int, $after: String) {
        companies(first: $first, after: $after) {
          edges { cursor node { ...CompanyParts } }
          pageInfo { ...PageInfoParts }
        }
      }`,
      { first, after }
    );
    return data.companies;
  }

  async updateCustomerCompany(input: any) {
    let data = await this.graphql<{ updateCustomerCompany: any }>(
      `mutation updateCustomerCompany($input: UpdateCustomerCompanyInput!) {
        updateCustomerCompany(input: $input) { customer { ...CustomerParts } error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.updateCustomerCompany.error) {
      throw new Error(
        `Update customer company failed: ${data.updateCustomerCompany.error.message}`
      );
    }
    return data.updateCustomerCompany;
  }

  // ─── Tenants ───

  async getTenants(first?: number, after?: string) {
    let data = await this.graphql<{ tenants: any }>(
      `query tenants($first: Int, $after: String) {
        tenants(first: $first, after: $after) {
          edges { cursor node { ...TenantParts } }
          pageInfo { ...PageInfoParts }
        }
      }`,
      { first, after }
    );
    return data.tenants;
  }

  async getTenant(tenantId: string) {
    let data = await this.graphql<{ tenant: any }>(
      `query tenant($tenantId: ID!) { tenant(tenantId: $tenantId) { ...TenantParts } }`,
      { tenantId }
    );
    return data.tenant;
  }

  async upsertTenant(input: any) {
    let data = await this.graphql<{ upsertTenant: any }>(
      `mutation upsertTenant($input: UpsertTenantInput!) {
        upsertTenant(input: $input) { tenant { ...TenantParts } error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.upsertTenant.error) {
      throw new Error(`Upsert tenant failed: ${data.upsertTenant.error.message}`);
    }
    return data.upsertTenant;
  }

  async addCustomerToTenants(input: any) {
    let data = await this.graphql<{ addCustomerToTenants: any }>(
      `mutation addCustomerToTenants($input: AddCustomerToTenantsInput!) {
        addCustomerToTenants(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.addCustomerToTenants.error) {
      throw new Error(
        `Add customer to tenants failed: ${data.addCustomerToTenants.error.message}`
      );
    }
    return data.addCustomerToTenants;
  }

  async removeCustomerFromTenants(input: any) {
    let data = await this.graphql<{ removeCustomerFromTenants: any }>(
      `mutation removeCustomerFromTenants($input: RemoveCustomerFromTenantsInput!) {
        removeCustomerFromTenants(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.removeCustomerFromTenants.error) {
      throw new Error(
        `Remove customer from tenants failed: ${data.removeCustomerFromTenants.error.message}`
      );
    }
    return data.removeCustomerFromTenants;
  }

  // ─── Threads ───

  async getThread(threadId: string) {
    let data = await this.graphql<{ thread: any }>(
      `query thread($threadId: ID!) { thread(threadId: $threadId) { ...ThreadParts } }`,
      { threadId }
    );
    return data.thread;
  }

  async getThreads(filters?: any, first?: number, after?: string) {
    let data = await this.graphql<{ threads: any }>(
      `query threads($filters: ThreadsFilter, $first: Int, $after: String) {
        threads(filters: $filters, first: $first, after: $after) {
          edges { cursor node { ...ThreadParts } }
          pageInfo { ...PageInfoParts }
        }
      }`,
      { filters, first, after }
    );
    return data.threads;
  }

  async createThread(input: any) {
    let data = await this.graphql<{ createThread: any }>(
      `mutation createThread($input: CreateThreadInput!) {
        createThread(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.createThread.error) {
      throw new Error(`Create thread failed: ${data.createThread.error.message}`);
    }
    return data.createThread;
  }

  async replyToThread(input: any) {
    let data = await this.graphql<{ replyToThread: any }>(
      `mutation replyToThread($input: ReplyToThreadInput!) {
        replyToThread(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.replyToThread.error) {
      throw new Error(`Reply to thread failed: ${data.replyToThread.error.message}`);
    }
    return data.replyToThread;
  }

  async assignThread(threadId: string, userId: string) {
    let data = await this.graphql<{ assignThread: any }>(
      `mutation assignThread($input: AssignThreadInput!) {
        assignThread(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId, userId } }
    );
    if (data.assignThread.error) {
      throw new Error(`Assign thread failed: ${data.assignThread.error.message}`);
    }
    return data.assignThread;
  }

  async unassignThread(threadId: string) {
    let data = await this.graphql<{ unassignThread: any }>(
      `mutation unassignThread($input: UnassignThreadInput!) {
        unassignThread(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId } }
    );
    if (data.unassignThread.error) {
      throw new Error(`Unassign thread failed: ${data.unassignThread.error.message}`);
    }
    return data.unassignThread;
  }

  async markThreadAsDone(threadId: string) {
    let data = await this.graphql<{ markThreadAsDone: any }>(
      `mutation markThreadAsDone($input: MarkThreadAsDoneInput!) {
        markThreadAsDone(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId } }
    );
    if (data.markThreadAsDone.error) {
      throw new Error(`Mark thread as done failed: ${data.markThreadAsDone.error.message}`);
    }
    return data.markThreadAsDone;
  }

  async markThreadAsTodo(threadId: string) {
    let data = await this.graphql<{ markThreadAsTodo: any }>(
      `mutation markThreadAsTodo($input: MarkThreadAsTodoInput!) {
        markThreadAsTodo(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId } }
    );
    if (data.markThreadAsTodo.error) {
      throw new Error(`Mark thread as todo failed: ${data.markThreadAsTodo.error.message}`);
    }
    return data.markThreadAsTodo;
  }

  async snoozeThread(threadId: string, durationMs: number) {
    let data = await this.graphql<{ snoozeThread: any }>(
      `mutation snoozeThread($input: SnoozeThreadInput!) {
        snoozeThread(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId, durationMs } }
    );
    if (data.snoozeThread.error) {
      throw new Error(`Snooze thread failed: ${data.snoozeThread.error.message}`);
    }
    return data.snoozeThread;
  }

  async changeThreadPriority(threadId: string, priority: number) {
    let data = await this.graphql<{ changeThreadPriority: any }>(
      `mutation changeThreadPriority($input: ChangeThreadPriorityInput!) {
        changeThreadPriority(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId, priority } }
    );
    if (data.changeThreadPriority.error) {
      throw new Error(
        `Change thread priority failed: ${data.changeThreadPriority.error.message}`
      );
    }
    return data.changeThreadPriority;
  }

  // ─── Labels ───

  async getLabelTypes(first?: number, after?: string) {
    let data = await this.graphql<{ labelTypes: any }>(
      `query labelTypes($first: Int, $after: String) {
        labelTypes(first: $first, after: $after) {
          edges { cursor node { ...LabelTypeParts } }
          pageInfo { ...PageInfoParts }
        }
      }`,
      { first, after }
    );
    return data.labelTypes;
  }

  async addLabels(input: any) {
    let data = await this.graphql<{ addLabels: any }>(
      `mutation addLabels($input: AddLabelsInput!) {
        addLabels(input: $input) { labels { ...LabelParts } error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.addLabels.error) {
      throw new Error(`Add labels failed: ${data.addLabels.error.message}`);
    }
    return data.addLabels;
  }

  async removeLabels(input: any) {
    let data = await this.graphql<{ removeLabels: any }>(
      `mutation removeLabels($input: RemoveLabelsInput!) {
        removeLabels(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.removeLabels.error) {
      throw new Error(`Remove labels failed: ${data.removeLabels.error.message}`);
    }
    return data.removeLabels;
  }

  // ─── Events ───

  async createCustomerEvent(input: any) {
    let data = await this.graphql<{ createCustomerEvent: any }>(
      `mutation createCustomerEvent($input: CreateCustomerEventInput!) {
        createCustomerEvent(input: $input) { customerEvent { ...CustomerEventParts } error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.createCustomerEvent.error) {
      throw new Error(
        `Create customer event failed: ${data.createCustomerEvent.error.message}`
      );
    }
    return data.createCustomerEvent;
  }

  async createThreadEvent(input: any) {
    let data = await this.graphql<{ createThreadEvent: any }>(
      `mutation createThreadEvent($input: CreateThreadEventInput!) {
        createThreadEvent(input: $input) { threadEvent { ...ThreadEventParts } error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.createThreadEvent.error) {
      throw new Error(`Create thread event failed: ${data.createThreadEvent.error.message}`);
    }
    return data.createThreadEvent;
  }

  // ─── Messaging ───

  async sendNewEmail(input: any) {
    let data = await this.graphql<{ sendNewEmail: any }>(
      `mutation sendNewEmail($input: SendNewEmailInput!) {
        sendNewEmail(input: $input) {
          email { id from { email name } to { email name } subject createdAt { ...DateTimeParts } }
          error { ...MutationErrorParts }
        }
      }`,
      { input }
    );
    if (data.sendNewEmail.error) {
      throw new Error(`Send new email failed: ${data.sendNewEmail.error.message}`);
    }
    return data.sendNewEmail;
  }

  async replyToEmail(input: any) {
    let data = await this.graphql<{ replyToEmail: any }>(
      `mutation replyToEmail($input: ReplyToEmailInput!) {
        replyToEmail(input: $input) {
          email { id from { email name } to { email name } subject createdAt { ...DateTimeParts } }
          error { ...MutationErrorParts }
        }
      }`,
      { input }
    );
    if (data.replyToEmail.error) {
      throw new Error(`Reply to email failed: ${data.replyToEmail.error.message}`);
    }
    return data.replyToEmail;
  }

  async sendChat(input: any) {
    let data = await this.graphql<{ sendChat: any }>(
      `mutation sendChat($input: SendChatInput!) {
        sendChat(input: $input) {
          chat { id customerReadAt { ...DateTimeParts } createdAt { ...DateTimeParts } }
          error { ...MutationErrorParts }
        }
      }`,
      { input }
    );
    if (data.sendChat.error) {
      throw new Error(`Send chat failed: ${data.sendChat.error.message}`);
    }
    return data.sendChat;
  }

  async createNote(input: any) {
    let data = await this.graphql<{ createNote: any }>(
      `mutation createNote($input: CreateNoteInput!) {
        createNote(input: $input) {
          note { id createdAt { ...DateTimeParts } }
          error { ...MutationErrorParts }
        }
      }`,
      { input }
    );
    if (data.createNote.error) {
      throw new Error(`Create note failed: ${data.createNote.error.message}`);
    }
    return data.createNote;
  }

  // ─── Customer Groups ───

  async getCustomerGroups(first?: number, after?: string) {
    let data = await this.graphql<{ customerGroups: any }>(
      `query customerGroups($first: Int, $after: String) {
        customerGroups(first: $first, after: $after) {
          edges { node { ...CustomerGroupParts } }
          pageInfo { ...PageInfoParts }
        }
      }`,
      { first, after }
    );
    return data.customerGroups;
  }

  async addCustomerToCustomerGroups(input: any) {
    let data = await this.graphql<{ addCustomerToCustomerGroups: any }>(
      `mutation addCustomerToCustomerGroups($input: AddCustomerToCustomerGroupsInput!) {
        addCustomerToCustomerGroups(input: $input) {
          customerGroupMemberships { customerGroupId }
          error { ...MutationErrorParts }
        }
      }`,
      { input }
    );
    if (data.addCustomerToCustomerGroups.error) {
      throw new Error(
        `Add customer to groups failed: ${data.addCustomerToCustomerGroups.error.message}`
      );
    }
    return data.addCustomerToCustomerGroups;
  }

  async removeCustomerFromCustomerGroups(input: any) {
    let data = await this.graphql<{ removeCustomerFromCustomerGroups: any }>(
      `mutation removeCustomerFromCustomerGroups($input: RemoveCustomerFromCustomerGroupsInput!) {
        removeCustomerFromCustomerGroups(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
    if (data.removeCustomerFromCustomerGroups.error) {
      throw new Error(
        `Remove customer from groups failed: ${data.removeCustomerFromCustomerGroups.error.message}`
      );
    }
    return data.removeCustomerFromCustomerGroups;
  }

  // ─── Workspace ───

  async getMyWorkspace() {
    let data = await this.graphql<{ myWorkspace: any }>(
      `query myWorkspace { myWorkspace { id name publicName } }`
    );
    return data.myWorkspace;
  }
}
