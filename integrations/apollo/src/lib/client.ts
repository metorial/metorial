import { createAxios } from '@slates/provider';
import { apolloApiError } from './errors';
import type {
  ApolloAccount,
  ApolloContact,
  ApolloDeal,
  ApolloNewsArticle,
  ApolloOrganization,
  ApolloPerson,
  ApolloSequence,
  ApolloTask,
  ApolloUser,
  BulkPersonEnrichmentParams,
  NewsArticleSearchFilters,
  OrganizationSearchFilters,
  PeopleSearchFilters,
  PersonEnrichmentParams
} from './types';

export type ApolloAuthType = 'api_key' | 'oauth';

export type ApolloClientConfig = {
  token: string;
  authType: ApolloAuthType;
};

let compact = <T extends Record<string, any>>(value: T) => {
  let output: Record<string, any> = {};

  for (let [key, item] of Object.entries(value)) {
    if (item !== undefined) {
      output[key] = item;
    }
  }

  return output;
};

let contactBody = (contact: {
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  phone?: string;
  organizationName?: string;
  ownerId?: string;
  accountId?: string;
  contactStageId?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  labelIds?: string[];
  runDedupe?: boolean;
  typedCustomFields?: Record<string, any>;
}) =>
  compact({
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email,
    title: contact.title,
    phone: contact.phone,
    organization_name: contact.organizationName,
    owner_id: contact.ownerId,
    account_id: contact.accountId,
    contact_stage_id: contact.contactStageId,
    website_url: contact.websiteUrl,
    linkedin_url: contact.linkedinUrl,
    city: contact.city,
    state: contact.state,
    country: contact.country,
    postal_code: contact.postalCode,
    label_ids: contact.labelIds,
    run_dedupe: contact.runDedupe,
    typed_custom_fields: contact.typedCustomFields
  });

let accountBody = (account: {
  id?: string;
  name?: string;
  domain?: string;
  phone?: string;
  ownerId?: string;
  accountStageId?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  rawAddress?: string;
  typedCustomFields?: Record<string, any>;
}) =>
  compact({
    id: account.id,
    name: account.name,
    domain: account.domain,
    phone: account.phone,
    owner_id: account.ownerId,
    account_stage_id: account.accountStageId,
    website_url: account.websiteUrl,
    linkedin_url: account.linkedinUrl,
    city: account.city,
    state: account.state,
    country: account.country,
    raw_address: account.rawAddress,
    typed_custom_fields: account.typedCustomFields
  });

let callParams = (call: {
  logged?: boolean;
  userIds?: string[];
  contactId?: string;
  accountId?: string;
  toNumber?: string;
  fromNumber?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  phoneCallPurposeId?: string;
  phoneCallOutcomeId?: string;
  note?: string;
}) =>
  compact({
    logged: call.logged,
    'user_id[]': call.userIds,
    contact_id: call.contactId,
    account_id: call.accountId,
    to_number: call.toNumber,
    from_number: call.fromNumber,
    status: call.status,
    start_time: call.startTime,
    end_time: call.endTime,
    duration: call.duration,
    phone_call_purpose_id: call.phoneCallPurposeId,
    phone_call_outcome_id: call.phoneCallOutcomeId,
    note: call.note
  });

export class Client {
  private axios;

  constructor(config: ApolloClientConfig) {
    this.axios = createAxios({
      baseURL: 'https://api.apollo.io/api/v1',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (config.authType === 'oauth') {
      this.axios.defaults.headers.common.Authorization = `Bearer ${config.token}`;
    } else {
      this.axios.defaults.headers.common['x-api-key'] = config.token;
    }
  }

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw apolloApiError(error, operation);
    }
  }

  // ========== People Search ==========

  async searchPeople(
    filters: PeopleSearchFilters
  ): Promise<{ people: ApolloPerson[]; pagination: any }> {
    return await this.request('search people', async () => {
      let response = await this.axios.post(
        '/mixed_people/api_search',
        compact({
          person_titles: filters.personTitles,
          person_locations: filters.personLocations,
          person_seniorities: filters.personSeniorities,
          q_organization_domains_list: filters.organizationDomains,
          organization_locations: filters.organizationLocations,
          organization_num_employees_ranges: filters.organizationNumEmployeesRanges,
          organization_industry_tag_ids: filters.organizationIndustryTagIds,
          q_keywords: filters.qKeywords,
          page: filters.page || 1,
          per_page: filters.perPage || 25
        })
      );

      return {
        people: response.data.people || [],
        pagination: response.data.pagination || {}
      };
    });
  }

  // ========== Organization Search and Enrichment ==========

  async searchOrganizations(
    filters: OrganizationSearchFilters
  ): Promise<{ organizations: ApolloOrganization[]; pagination: any }> {
    return await this.request('search organizations', async () => {
      let response = await this.axios.post(
        '/mixed_companies/search',
        compact({
          q_organization_domains_list: filters.organizationDomains,
          organization_num_employees_ranges: filters.organizationNumEmployeesRanges,
          organization_locations: filters.organizationLocations,
          organization_not_locations: filters.organizationNotLocations,
          organization_industry_tag_ids: filters.organizationIndustryTagIds,
          organization_ids: filters.organizationIds,
          q_organization_keyword_tags: filters.qOrganizationKeywordTags,
          q_organization_name: filters.qOrganizationName,
          revenue_range: filters.revenueRange,
          currently_using_any_of_technology_uids: filters.currentlyUsingAnyTechnologyUids,
          q_organization_job_titles: filters.organizationJobTitles,
          organization_job_locations: filters.organizationJobLocations,
          page: filters.page || 1,
          per_page: filters.perPage || 25
        })
      );

      return {
        organizations: response.data.organizations || response.data.accounts || [],
        pagination: response.data.pagination || {}
      };
    });
  }

  async getOrganization(
    organizationId: string
  ): Promise<{ organization: ApolloOrganization }> {
    return await this.request('get organization', async () => {
      let response = await this.axios.get(`/organizations/${organizationId}`);
      return {
        organization: response.data.organization || response.data
      };
    });
  }

  async enrichOrganization(
    domain: string
  ): Promise<{ organization: ApolloOrganization | null }> {
    return await this.request('enrich organization', async () => {
      let response = await this.axios.get('/organizations/enrich', {
        params: { domain }
      });

      return {
        organization: response.data.organization || response.data.organizations?.[0] || null
      };
    });
  }

  async bulkEnrichOrganizations(
    domains: string[]
  ): Promise<{ organizations: ApolloOrganization[] }> {
    return await this.request('bulk enrich organizations', async () => {
      let response = await this.axios.post('/organizations/bulk_enrich', undefined, {
        params: {
          'domains[]': domains
        }
      });

      return {
        organizations: response.data.organizations || response.data.matches || []
      };
    });
  }

  async listOrganizationJobPostings(
    organizationId: string,
    params?: { page?: number; perPage?: number }
  ): Promise<{ jobPostings: Record<string, any>[]; pagination: any }> {
    return await this.request('list organization job postings', async () => {
      let response = await this.axios.get(`/organizations/${organizationId}/job_postings`, {
        params: {
          page: params?.page || 1,
          per_page: params?.perPage || 25
        }
      });

      return {
        jobPostings:
          response.data.job_postings ||
          response.data.organization_job_postings ||
          response.data.jobs ||
          [],
        pagination: response.data.pagination || {}
      };
    });
  }

  async searchNewsArticles(
    filters: NewsArticleSearchFilters
  ): Promise<{ newsArticles: ApolloNewsArticle[]; pagination: any }> {
    return await this.request('search news articles', async () => {
      let response = await this.axios.post('/news_articles/search', undefined, {
        params: compact({
          'organization_ids[]': filters.organizationIds,
          'categories[]': filters.categories,
          'published_at[min]': filters.publishedAtMin,
          'published_at[max]': filters.publishedAtMax,
          page: filters.page || 1,
          per_page: filters.perPage || 10
        })
      });

      return {
        newsArticles: response.data.news_articles || response.data.articles || [],
        pagination: response.data.pagination || {}
      };
    });
  }

  // ========== People Enrichment ==========

  async enrichPerson(
    params: PersonEnrichmentParams
  ): Promise<{ person: ApolloPerson | null }> {
    return await this.request('enrich person', async () => {
      let response = await this.axios.post(
        '/people/match',
        compact({
          first_name: params.firstName,
          last_name: params.lastName,
          name: params.name,
          email: params.email,
          domain: params.domain,
          organization_name: params.organizationName,
          linkedin_url: params.linkedinUrl,
          id: params.apolloId,
          reveal_personal_emails: params.revealPersonalEmails || false,
          reveal_phone_number: params.revealPhoneNumber || false
        })
      );

      return {
        person: response.data.person || null
      };
    });
  }

  async bulkEnrichPeople(params: BulkPersonEnrichmentParams): Promise<{
    matches: ApolloPerson[];
    totalRequested: number;
    uniqueEnriched: number;
    creditsConsumed: number;
  }> {
    return await this.request('bulk enrich people', async () => {
      let response = await this.axios.post('/people/bulk_match', {
        details: params.details,
        reveal_personal_emails: params.revealPersonalEmails || false,
        reveal_phone_number: params.revealPhoneNumber || false
      });

      return {
        matches: response.data.matches || [],
        totalRequested: response.data.total_requested_enrichments || 0,
        uniqueEnriched: response.data.unique_enriched_records || 0,
        creditsConsumed: response.data.credits_consumed || 0
      };
    });
  }

  // ========== Contacts ==========

  async searchContacts(params: {
    qKeywords?: string;
    contactStageIds?: string[];
    sortByField?: string;
    sortAscending?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<{ contacts: ApolloContact[]; pagination: any }> {
    return await this.request('search contacts', async () => {
      let response = await this.axios.post(
        '/contacts/search',
        compact({
          q_keywords: params.qKeywords,
          contact_stage_ids: params.contactStageIds,
          sort_by_field: params.sortByField,
          sort_ascending: params.sortAscending,
          page: params.page || 1,
          per_page: params.perPage || 25
        })
      );

      return {
        contacts: response.data.contacts || [],
        pagination: response.data.pagination || {}
      };
    });
  }

  async createContact(
    contact: Parameters<typeof contactBody>[0]
  ): Promise<{ contact: ApolloContact }> {
    return await this.request('create contact', async () => {
      let response = await this.axios.post('/contacts', contactBody(contact));

      return {
        contact: response.data.contact || response.data
      };
    });
  }

  async updateContact(
    contactId: string,
    updates: Parameters<typeof contactBody>[0]
  ): Promise<{ contact: ApolloContact }> {
    return await this.request('update contact', async () => {
      let response = await this.axios.patch(`/contacts/${contactId}`, contactBody(updates));

      return {
        contact: response.data.contact || response.data
      };
    });
  }

  async bulkCreateContacts(params: {
    contacts: Parameters<typeof contactBody>[0][];
    appendLabelNames?: string[];
    runDedupe?: boolean;
  }): Promise<{
    createdContacts: ApolloContact[];
    existingContacts: ApolloContact[];
    raw: Record<string, any>;
  }> {
    return await this.request('bulk create contacts', async () => {
      let response = await this.axios.post('/contacts/bulk_create', {
        contacts: params.contacts.map(contactBody),
        append_label_names: params.appendLabelNames,
        run_dedupe: params.runDedupe
      });

      return {
        createdContacts: response.data.created_contacts || response.data.contacts || [],
        existingContacts: response.data.existing_contacts || [],
        raw: response.data
      };
    });
  }

  async bulkUpdateContacts(params: {
    contactIds?: string[];
    contactAttributes?: Array<
      Parameters<typeof contactBody>[0] & { contactId?: string; id?: string }
    >;
    updates?: Parameters<typeof contactBody>[0];
    async?: boolean;
  }): Promise<{ contacts: ApolloContact[]; raw: Record<string, any> }> {
    return await this.request('bulk update contacts', async () => {
      let response = await this.axios.post('/contacts/bulk_update', {
        contact_ids: params.contactIds,
        contact_attributes: params.contactAttributes?.map(contact => {
          let body = contactBody(contact);
          return compact({
            ...body,
            id: contact.id || contact.contactId
          });
        }),
        ...(params.updates ? contactBody(params.updates) : {}),
        async: params.async
      });

      return {
        contacts: response.data.contacts || [],
        raw: response.data
      };
    });
  }

  async updateContactStages(
    contactIds: string[],
    contactStageId: string
  ): Promise<{ contacts: ApolloContact[] }> {
    return await this.request('update contact stages', async () => {
      let response = await this.axios.post('/contacts/update_stages', undefined, {
        params: {
          'contact_ids[]': contactIds,
          contact_stage_id: contactStageId
        }
      });

      return {
        contacts: response.data.contacts || []
      };
    });
  }

  async updateContactOwners(
    contactIds: string[],
    ownerId: string
  ): Promise<{ contacts: ApolloContact[] }> {
    return await this.request('update contact owners', async () => {
      let response = await this.axios.post('/contacts/update_owners', undefined, {
        params: {
          'contact_ids[]': contactIds,
          owner_id: ownerId
        }
      });

      return {
        contacts: response.data.contacts || []
      };
    });
  }

  // ========== Accounts ==========

  async searchAccounts(params: {
    qKeywords?: string;
    accountStageIds?: string[];
    sortByField?: string;
    sortAscending?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<{ accounts: ApolloAccount[]; pagination: any }> {
    return await this.request('search accounts', async () => {
      let response = await this.axios.post(
        '/accounts/search',
        compact({
          q_organization_name: params.qKeywords,
          account_stage_ids: params.accountStageIds,
          sort_by_field: params.sortByField,
          sort_ascending: params.sortAscending,
          page: params.page || 1,
          per_page: params.perPage || 25
        })
      );

      return {
        accounts: response.data.accounts || [],
        pagination: response.data.pagination || {}
      };
    });
  }

  async getAccount(accountId: string): Promise<{ account: ApolloAccount }> {
    return await this.request('get account', async () => {
      let response = await this.axios.get(`/accounts/${accountId}`);
      return {
        account: response.data.account || response.data
      };
    });
  }

  async createAccount(
    account: Parameters<typeof accountBody>[0] & { name: string }
  ): Promise<{ account: ApolloAccount }> {
    return await this.request('create account', async () => {
      let response = await this.axios.post('/accounts', accountBody(account));

      return {
        account: response.data.account || response.data
      };
    });
  }

  async updateAccount(
    accountId: string,
    updates: Parameters<typeof accountBody>[0]
  ): Promise<{ account: ApolloAccount }> {
    return await this.request('update account', async () => {
      let response = await this.axios.patch(`/accounts/${accountId}`, accountBody(updates));

      return {
        account: response.data.account || response.data
      };
    });
  }

  async bulkCreateAccounts(params: {
    accounts: Array<Parameters<typeof accountBody>[0] & { name: string }>;
    appendLabelNames?: string[];
    runDedupe?: boolean;
  }): Promise<{
    createdAccounts: ApolloAccount[];
    existingAccounts: ApolloAccount[];
    raw: Record<string, any>;
  }> {
    return await this.request('bulk create accounts', async () => {
      let response = await this.axios.post('/accounts/bulk_create', {
        accounts: params.accounts.map(accountBody),
        append_label_names: params.appendLabelNames,
        run_dedupe: params.runDedupe
      });

      return {
        createdAccounts: response.data.created_accounts || response.data.accounts || [],
        existingAccounts: response.data.existing_accounts || [],
        raw: response.data
      };
    });
  }

  async bulkUpdateAccounts(params: {
    accountIds?: string[];
    accountAttributes?: Array<
      Parameters<typeof accountBody>[0] & { accountId?: string; id?: string }
    >;
    updates?: Parameters<typeof accountBody>[0];
    async?: boolean;
  }): Promise<{ accounts: ApolloAccount[]; raw: Record<string, any> }> {
    return await this.request('bulk update accounts', async () => {
      let response = await this.axios.post('/accounts/bulk_update', {
        account_ids: params.accountIds,
        account_attributes: params.accountAttributes?.map(account => {
          let body = accountBody(account);
          return compact({
            ...body,
            id: account.id || account.accountId
          });
        }),
        ...(params.updates ? accountBody(params.updates) : {}),
        async: params.async
      });

      return {
        accounts: response.data.accounts || [],
        raw: response.data
      };
    });
  }

  async updateAccountOwners(
    accountIds: string[],
    ownerId: string
  ): Promise<{ accounts: ApolloAccount[] }> {
    return await this.request('update account owners', async () => {
      let response = await this.axios.post('/accounts/update_owners', undefined, {
        params: {
          'account_ids[]': accountIds,
          owner_id: ownerId
        }
      });

      return {
        accounts: response.data.accounts || []
      };
    });
  }

  // ========== Deals (Opportunities) ==========

  async listDeals(params?: {
    sortByField?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ deals: ApolloDeal[]; pagination: any }> {
    return await this.request('list deals', async () => {
      let response = await this.axios.get('/opportunities/search', {
        params: {
          sort_by_field: params?.sortByField,
          page: params?.page || 1,
          per_page: params?.perPage || 25
        }
      });

      return {
        deals: response.data.opportunities || [],
        pagination: response.data.pagination || {}
      };
    });
  }

  async viewDeal(dealId: string): Promise<{ deal: ApolloDeal }> {
    return await this.request('view deal', async () => {
      let response = await this.axios.get(`/opportunities/${dealId}`);

      return {
        deal: response.data.opportunity || response.data
      };
    });
  }

  async createDeal(deal: {
    name: string;
    amount?: number | string;
    closedDate?: string;
    ownerId?: string;
    accountId?: string;
    dealStageId?: string;
    source?: string;
    typedCustomFields?: Record<string, any>;
  }): Promise<{ deal: ApolloDeal }> {
    return await this.request('create deal', async () => {
      let response = await this.axios.post(
        '/opportunities',
        compact({
          name: deal.name,
          amount: deal.amount,
          closed_date: deal.closedDate,
          owner_id: deal.ownerId,
          account_id: deal.accountId,
          opportunity_stage_id: deal.dealStageId,
          source: deal.source,
          typed_custom_fields: deal.typedCustomFields
        })
      );

      return {
        deal: response.data.opportunity || response.data
      };
    });
  }

  async updateDeal(
    dealId: string,
    updates: {
      name?: string;
      amount?: number | string;
      closedDate?: string;
      ownerId?: string;
      accountId?: string;
      dealStageId?: string;
      source?: string;
      status?: string;
      typedCustomFields?: Record<string, any>;
    }
  ): Promise<{ deal: ApolloDeal }> {
    return await this.request('update deal', async () => {
      let response = await this.axios.patch(
        `/opportunities/${dealId}`,
        compact({
          name: updates.name,
          amount: updates.amount,
          closed_date: updates.closedDate,
          owner_id: updates.ownerId,
          account_id: updates.accountId,
          opportunity_stage_id: updates.dealStageId,
          source: updates.source,
          status: updates.status,
          typed_custom_fields: updates.typedCustomFields
        })
      );

      return {
        deal: response.data.opportunity || response.data
      };
    });
  }

  async listDealStages(): Promise<{
    dealStages: Array<{ id: string; name: string; [key: string]: any }>;
  }> {
    return await this.request('list deal stages', async () => {
      let response = await this.axios.get('/opportunity_stages');

      return {
        dealStages: response.data.opportunity_stages || response.data.deal_stages || []
      };
    });
  }

  // ========== Sequences ==========

  async searchSequences(params?: {
    qKeywords?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ sequences: ApolloSequence[]; pagination: any }> {
    return await this.request('search sequences', async () => {
      let response = await this.axios.post('/emailer_campaigns/search', {
        q_keywords: params?.qKeywords,
        page: params?.page || 1,
        per_page: params?.perPage || 25
      });

      return {
        sequences: response.data.emailer_campaigns || [],
        pagination: response.data.pagination || {}
      };
    });
  }

  async addContactsToSequence(
    sequenceId: string,
    contactIds: string[],
    emailAccountId?: string,
    userId?: string
  ): Promise<any> {
    return await this.request('add contacts to sequence', async () => {
      let response = await this.axios.post(
        `/emailer_campaigns/${sequenceId}/add_contact_ids`,
        undefined,
        {
          params: compact({
            'contact_ids[]': contactIds,
            emailer_campaign_id: sequenceId,
            send_email_from_email_account_id: emailAccountId,
            user_id: userId
          })
        }
      );

      return response.data;
    });
  }

  async updateContactStatusInSequence(
    contactIds: string[],
    sequenceId: string,
    mode: 'mark_as_finished' | 'remove' | 'stop'
  ): Promise<any> {
    return await this.request('update contact status in sequence', async () => {
      let response = await this.axios.post(
        '/emailer_campaigns/remove_or_stop_contact_ids',
        undefined,
        {
          params: {
            'contact_ids[]': contactIds,
            'emailer_campaign_ids[]': [sequenceId],
            mode
          }
        }
      );

      return response.data;
    });
  }

  // ========== Tasks ==========

  async searchTasks(params?: {
    qKeywords?: string;
    sortByField?: string;
    sortAscending?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<{ tasks: ApolloTask[]; pagination: any }> {
    return await this.request('search tasks', async () => {
      let response = await this.axios.post('/tasks/search', {
        q_keywords: params?.qKeywords,
        sort_by_field: params?.sortByField,
        sort_ascending: params?.sortAscending,
        page: params?.page || 1,
        per_page: params?.perPage || 25
      });

      return {
        tasks: response.data.tasks || [],
        pagination: response.data.pagination || {}
      };
    });
  }

  async createTask(task: {
    userId: string;
    contactId: string;
    type: string;
    priority?: string;
    dueAt: string;
    title?: string;
    note?: string;
    status: string;
  }): Promise<{ task?: ApolloTask }> {
    return await this.request('create task', async () => {
      let response = await this.axios.post(
        '/tasks',
        compact({
          user_id: task.userId,
          contact_id: task.contactId,
          type: task.type,
          priority: task.priority,
          due_at: task.dueAt,
          title: task.title,
          note: task.note,
          status: task.status
        })
      );

      return response.data;
    });
  }

  async bulkCreateTasks(task: {
    userId: string;
    contactIds: string[];
    type: string;
    priority?: string;
    dueAt: string;
    note?: string;
    status: string;
  }): Promise<{ tasks?: ApolloTask[] }> {
    return await this.request('bulk create tasks', async () => {
      let response = await this.axios.post(
        '/tasks/bulk_create',
        compact({
          user_id: task.userId,
          contact_ids: task.contactIds,
          type: task.type,
          priority: task.priority,
          due_at: task.dueAt,
          note: task.note,
          status: task.status
        })
      );

      return response.data;
    });
  }

  // ========== Calls ==========

  async searchCalls(params?: {
    dateRangeMin?: string;
    dateRangeMax?: string;
    durationMin?: number;
    durationMax?: number;
    inbound?: 'incoming' | 'outgoing';
    userIds?: string[];
    contactLabelIds?: string[];
    phoneCallPurposeIds?: string[];
    phoneCallOutcomeIds?: string[];
    qKeywords?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ calls: Record<string, any>[]; pagination: any }> {
    return await this.request('search calls', async () => {
      let response = await this.axios.get('/phone_calls/search', {
        params: compact({
          'date_range[min]': params?.dateRangeMin,
          'date_range[max]': params?.dateRangeMax,
          'duration[min]': params?.durationMin,
          'duration[max]': params?.durationMax,
          inbound: params?.inbound,
          'user_ids[]': params?.userIds,
          'contact_label_ids[]': params?.contactLabelIds,
          'phone_call_purpose_ids[]': params?.phoneCallPurposeIds,
          'phone_call_outcome_ids[]': params?.phoneCallOutcomeIds,
          q_keywords: params?.qKeywords,
          page: params?.page || 1,
          per_page: params?.perPage || 25
        })
      });

      return {
        calls: response.data.phone_calls || response.data.calls || [],
        pagination: response.data.pagination || {}
      };
    });
  }

  async createCall(
    call: Parameters<typeof callParams>[0]
  ): Promise<{ call: Record<string, any>; raw: Record<string, any> }> {
    return await this.request('create call', async () => {
      let response = await this.axios.post('/phone_calls', undefined, {
        params: callParams(call)
      });

      return {
        call: response.data.phone_call || response.data.call || response.data,
        raw: response.data
      };
    });
  }

  async updateCall(
    callId: string,
    call: Parameters<typeof callParams>[0]
  ): Promise<{ call: Record<string, any>; raw: Record<string, any> }> {
    return await this.request('update call', async () => {
      let response = await this.axios.put(`/phone_calls/${callId}`, undefined, {
        params: callParams(call)
      });

      return {
        call: response.data.phone_call || response.data.call || response.data,
        raw: response.data
      };
    });
  }

  // ========== Conversations ==========

  async searchConversations(params?: {
    page?: number;
    numFetchResult?: number;
    conversationType?: 'video_conference' | 'phone_call';
    accountId?: string;
    contactIds?: string[];
    tagIds?: string[];
    trackerIds?: string[];
    organizationIds?: string[];
    dateRange?: Record<string, any>;
    scorecardTemplateId?: string;
    scorecardMaxRating?: number;
    sortByField?: string;
    enforceContactBoundary?: boolean;
  }): Promise<{
    conversations: Record<string, any>[];
    pagination: any;
    raw: Record<string, any>;
  }> {
    return await this.request('search conversations', async () => {
      let response = await this.axios.post(
        '/conversations/search',
        compact({
          page: params?.page || 1,
          num_fetch_result: params?.numFetchResult || 25,
          conversation_type: params?.conversationType,
          account_id: params?.accountId,
          contact_ids: params?.contactIds,
          tag_ids: params?.tagIds,
          tracker_ids: params?.trackerIds,
          organization_ids: params?.organizationIds,
          date_range: params?.dateRange,
          scorecard_template_id: params?.scorecardTemplateId,
          scorecard_max_rating: params?.scorecardMaxRating,
          sort_by_field: params?.sortByField,
          enforce_contact_boundary: params?.enforceContactBoundary
        })
      );

      return {
        conversations: response.data.conversations || [],
        pagination: response.data.pagination || {},
        raw: response.data
      };
    });
  }

  async getConversation(
    conversationId: string
  ): Promise<{ conversation: Record<string, any> }> {
    return await this.request('get conversation', async () => {
      let response = await this.axios.get(`/conversations/${conversationId}`);
      return {
        conversation: response.data.conversation || response.data
      };
    });
  }

  async exportConversations(params: {
    startTime: string;
    endTime: string;
    email: string;
  }): Promise<Record<string, any>> {
    return await this.request('export conversations', async () => {
      let response = await this.axios.post('/conversations/export', {
        start_time: params.startTime,
        end_time: params.endTime,
        email: params.email
      });

      return response.data;
    });
  }

  // ========== Analytics ==========

  async queryAnalyticsReport(params: Record<string, any>): Promise<Record<string, any>> {
    return await this.request('query analytics report', async () => {
      let response = await this.axios.post('/reports/sync_report', params);
      return response.data;
    });
  }

  // ========== Users and Miscellaneous ==========

  async listUsers(): Promise<{ users: ApolloUser[] }> {
    return await this.request('list users', async () => {
      let response = await this.axios.get('/users/search');

      return {
        users: response.data.users || []
      };
    });
  }

  async listEmailAccounts(): Promise<{ emailAccounts: Record<string, any>[] }> {
    return await this.request('list email accounts', async () => {
      let response = await this.axios.get('/email_accounts');

      return {
        emailAccounts: response.data.email_accounts || []
      };
    });
  }

  async getUsageStats(): Promise<Record<string, any>> {
    return await this.request('get usage stats', async () => {
      let response = await this.axios.post('/usage_stats/api_usage_stats');
      return response.data;
    });
  }

  async listContactStages(): Promise<{
    contactStages: Array<{ id: string; name: string; [key: string]: any }>;
  }> {
    return await this.request('list contact stages', async () => {
      let response = await this.axios.get('/contact_stages');

      return {
        contactStages: response.data.contact_stages || []
      };
    });
  }

  async listAccountStages(): Promise<{
    accountStages: Array<{ id: string; name: string; [key: string]: any }>;
  }> {
    return await this.request('list account stages', async () => {
      let response = await this.axios.get('/account_stages');

      return {
        accountStages: response.data.account_stages || []
      };
    });
  }
}
