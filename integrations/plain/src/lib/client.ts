import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

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
  createdAt { ...DateTimeParts }
}`;

let FRAGMENT_THREAD_EVENT = `
fragment ThreadEventParts on ThreadEvent {
  id
  title
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
    if (
      variables?.first !== undefined &&
      (!Number.isInteger(variables.first) || variables.first < 1 || variables.first > 100)
    ) {
      throw createApiServiceError('first must be a whole number between 1 and 100');
    }
    let fragments = new Map(
      [
        ...COMMON_FRAGMENTS.matchAll(
          /fragment\s+(\w+)\s+on\s+[\s\S]*?(?=\bfragment\s+\w+\s+on\s+|$)/g
        )
      ].map(match => [match[1]!, match[0].trim()] as const)
    );
    let included = new Set<string>();
    let fullQuery = query;
    let documents = [query];
    for (let document of documents) {
      for (let match of document.matchAll(/\.\.\.\s*(?!on\b)(\w+)/g)) {
        let name = match[1]!;
        if (included.has(name)) continue;
        let fragment = fragments.get(name);
        if (!fragment) throw createApiServiceError(`Unknown Plain query fragment: ${name}`);
        included.add(name);
        fullQuery += `\n${fragment}`;
        documents.push(fragment);
      }
    }
    try {
      let res = await this.http.post('', { query: fullQuery, variables });
      let body = res.data;
      if (body?.errors?.length) {
        throw createApiServiceError(
          `Plain GraphQL request failed: ${body.errors.map((error: any) => error.message).join(', ')}`,
          { upstreamCode: body.errors[0]?.extensions?.code }
        );
      }
      if (!body?.data || typeof body.data !== 'object') {
        throw createApiServiceError('Plain returned no GraphQL response data');
      }
      for (let payload of Object.values(body.data) as any[]) {
        if (payload === null)
          throw createApiServiceError('The requested Plain resource was not found');
        if (payload?.error) {
          throw createApiServiceError(`Plain operation failed: ${payload.error.message}`, {
            upstreamCode: payload.error.code,
            reason: payload.error.type
          });
        }
      }
      return body.data as T;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Plain',
        operation: 'GraphQL request',
        reason: 'plain_api_error'
      });
    }
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
    return data.upsertCustomer;
  }

  async deleteCustomer(customerId: string) {
    let data = await this.graphql<{ deleteCustomer: any }>(
      `mutation deleteCustomer($input: DeleteCustomerInput!) {
        deleteCustomer(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input: { customerId } }
    );
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
    return data.upsertTenant;
  }

  async addCustomerToTenants(input: any) {
    let data = await this.graphql<{ addCustomerToTenants: any }>(
      `mutation addCustomerToTenants($input: AddCustomerToTenantsInput!) {
        addCustomerToTenants(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
    return data.addCustomerToTenants;
  }

  async removeCustomerFromTenants(input: any) {
    let data = await this.graphql<{ removeCustomerFromTenants: any }>(
      `mutation removeCustomerFromTenants($input: RemoveCustomerFromTenantsInput!) {
        removeCustomerFromTenants(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
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
    return data.createThread;
  }

  async replyToThread(input: any) {
    let data = await this.graphql<{ replyToThread: any }>(
      `mutation replyToThread($input: ReplyToThreadInput!) {
        replyToThread(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
    return data.replyToThread;
  }

  async assignThread(threadId: string, userId: string) {
    let data = await this.graphql<{ assignThread: any }>(
      `mutation assignThread($input: AssignThreadInput!) {
        assignThread(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId, userId } }
    );
    return data.assignThread;
  }

  async unassignThread(threadId: string) {
    let data = await this.graphql<{ unassignThread: any }>(
      `mutation unassignThread($input: UnassignThreadInput!) {
        unassignThread(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId } }
    );
    return data.unassignThread;
  }

  async markThreadAsDone(threadId: string) {
    let data = await this.graphql<{ markThreadAsDone: any }>(
      `mutation markThreadAsDone($input: MarkThreadAsDoneInput!) {
        markThreadAsDone(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId } }
    );
    return data.markThreadAsDone;
  }

  async markThreadAsTodo(threadId: string) {
    let data = await this.graphql<{ markThreadAsTodo: any }>(
      `mutation markThreadAsTodo($input: MarkThreadAsTodoInput!) {
        markThreadAsTodo(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId } }
    );
    return data.markThreadAsTodo;
  }

  async snoozeThread(threadId: string, durationSeconds: number) {
    let data = await this.graphql<{ snoozeThread: any }>(
      `mutation snoozeThread($input: SnoozeThreadInput!) {
        snoozeThread(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId, durationSeconds } }
    );
    return data.snoozeThread;
  }

  async changeThreadPriority(threadId: string, priority: number) {
    let data = await this.graphql<{ changeThreadPriority: any }>(
      `mutation changeThreadPriority($input: ChangeThreadPriorityInput!) {
        changeThreadPriority(input: $input) { thread { ...ThreadParts } error { ...MutationErrorParts } }
      }`,
      { input: { threadId, priority } }
    );
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
    return data.addLabels;
  }

  async removeLabels(input: any) {
    let data = await this.graphql<{ removeLabels: any }>(
      `mutation removeLabels($input: RemoveLabelsInput!) {
        removeLabels(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
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
    return data.createCustomerEvent;
  }

  async createThreadEvent(input: any) {
    let data = await this.graphql<{ createThreadEvent: any }>(
      `mutation createThreadEvent($input: CreateThreadEventInput!) {
        createThreadEvent(input: $input) { threadEvent { ...ThreadEventParts } error { ...MutationErrorParts } }
      }`,
      { input }
    );
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
          customerGroupMemberships { customerId customerGroup { id } }
          error { ...MutationErrorParts }
        }
      }`,
      { input }
    );
    return data.addCustomerToCustomerGroups;
  }

  async removeCustomerFromCustomerGroups(input: any) {
    let data = await this.graphql<{ removeCustomerFromCustomerGroups: any }>(
      `mutation removeCustomerFromCustomerGroups($input: RemoveCustomerFromCustomerGroupsInput!) {
        removeCustomerFromCustomerGroups(input: $input) { error { ...MutationErrorParts } }
      }`,
      { input }
    );
    return data.removeCustomerFromCustomerGroups;
  }

  async getUsers(first?: number, after?: string, isAssignableToThread?: boolean) {
    let data = await this.graphql<{ users: any }>(
      `query users($first: Int, $after: String, $filters: UsersFilter) {
        users(first: $first, after: $after, filters: $filters) {
          edges { node { ...UserParts } }
          pageInfo { ...PageInfoParts }
        }
      }`,
      {
        first,
        after,
        filters: isAssignableToThread === undefined ? undefined : { isAssignableToThread }
      }
    );
    return data.users;
  }

  async getCurrentIdentity() {
    return this.graphql<{ myMachineUser: any; myWorkspace: any }>(
      `query currentIdentity {
        myMachineUser { id fullName publicName description }
        myWorkspace { id name publicName }
      }`
    );
  }

  async getThreadTimeline(threadId: string, first?: number, after?: string) {
    let data = await this.graphql<{ thread: any }>(
      `query threadTimeline($threadId: ID!, $first: Int, $after: String) {
        thread(threadId: $threadId) {
          id
          timelineEntries(first: $first, after: $after) {
            edges { node {
              id customerId threadId timestamp { ...DateTimeParts }
              entry {
                __typename
                ... on EmailEntry { emailId subject textContent fullTextContent markdownContent fullMarkdownContent from { email name } to { email name } }
                ... on NoteEntry { noteId text markdown }
                ... on ChatEntry { chatId chatText: text }
                ... on SlackMessageEntry { slackWebMessageLink text }
                ... on SlackReplyEntry { slackWebMessageLink text }
                ... on MSTeamsMessageEntry { msTeamsMessageId msTeamsMessageLink text markdownContent }
                ... on DiscordMessageEntry { discordMessageId discordMessageLink markdownContent }
                ... on CustomerEventEntry { timelineEventId title externalId }
                ... on ThreadEventEntry { timelineEventId title externalId }
              }
            } }
            pageInfo { ...PageInfoParts }
          }
        }
      }`,
      { threadId, first, after }
    );
    return data.thread.timelineEntries;
  }

  // ─── Workspace ───

  async getMyWorkspace() {
    let data = await this.graphql<{ myWorkspace: any }>(
      `query myWorkspace { myWorkspace { id name publicName } }`
    );
    return data.myWorkspace;
  }
}
