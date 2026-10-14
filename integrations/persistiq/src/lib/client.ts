import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxiosData
} from 'slates';

export interface Lead {
  id: string;
  owner_id?: string | null;
  creator_id?: string | null;
  status?: string | null;
  bounced?: boolean | null;
  optedout?: boolean | null;
  sent_count?: number | null;
  replied_count?: number | null;
  last_sent_at?: string | null;
  data?: Record<string, string | null | undefined>;
}

export interface Campaign {
  id: string;
  name?: string | null;
  creator?: { id?: string; name?: string; email?: string };
  stats?: {
    prospects_contacted?: number;
    prospects_reached?: number;
    prospects_replied?: number;
    prospects_opened?: number;
    prospects_bounced?: number;
    prospects_optedout?: number;
    total_contacted?: number;
    total_prospects?: number;
  };
}

export interface CampaignLead {
  id: string;
  campaign_id?: string;
  mailbox_id?: string;
  lead?: Lead;
}

export interface User {
  id: string;
  email?: string | null;
  name?: string | null;
  activated?: boolean | null;
  default_mailbox_id?: string | null;
  salesforce_id?: string | null;
  mailboxes?: { id: string; email?: string; campaign_ids?: string[] }[];
}

interface Envelope {
  status?: string;
  error?: { reason?: string; message?: string } | null;
  errors?: string[];
  has_more?: boolean;
  next_page?: string | null;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.persistiq.com/v1',
      authHeader: { name: 'x-api-key', value: config.token }
    });
  }

  private async request<T>(
    operation: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    options: { params?: Record<string, unknown>; data?: unknown } = {}
  ) {
    let result = await requestAxiosData<T>(
      operation,
      () => this.axios.request<T>({ method, url, ...options }),
      (error, action) =>
        buildApiServiceError(error, {
          providerLabel: 'PersistIQ',
          operation: action,
          reason: 'persistiq_api_error'
        })
    );
    if (result && typeof result === 'object') {
      let envelope = result as Envelope;
      if (envelope.status === 'error' || envelope.error || envelope.errors?.length) {
        let message =
          envelope.error?.message || envelope.errors?.join('; ') || 'Request rejected';
        throw createApiServiceError(`PersistIQ API ${operation} failed: ${message}`, {
          reason: envelope.error?.reason
        });
      }
    }
    return result;
  }

  listLeads(
    options: {
      page?: number;
      status?: string;
      statusId?: string;
      updatedAfter?: string;
      createdAfter?: string;
      email?: string;
    } = {}
  ) {
    return this.request<Envelope & { leads?: Lead[] }>('list leads', 'GET', '/leads', {
      params: pickDefined({
        page: options.page,
        status: options.status,
        status_id: options.statusId,
        updated_after: options.updatedAfter,
        created_after: options.createdAfter,
        email: options.email
      })
    });
  }

  getLead(leadId: string) {
    return this.request<Envelope & { lead?: Lead; leads?: Lead[] }>(
      'get lead',
      'GET',
      `/leads/${encodeURIComponent(leadId)}`
    );
  }

  createLead(lead: Record<string, unknown>, creatorId?: string, duplicateStrategy = 'skip') {
    return this.request<Envelope & { lead?: Lead; leads?: Lead[] }>(
      'create lead',
      'POST',
      '/leads',
      {
        data: pickDefined({ lead, creator_id: creatorId, dup: duplicateStrategy })
      }
    );
  }

  updateLead(
    leadId: string,
    fields: {
      data?: Record<string, unknown>;
      status?: string;
      status_id?: string;
      owner_id?: string;
      bounced?: boolean;
      optedout?: boolean;
    }
  ) {
    return this.request<Envelope & { lead?: Lead; leads?: Lead[] }>(
      'update lead',
      'PATCH',
      `/leads/${encodeURIComponent(leadId)}`,
      { data: pickDefined(fields) }
    );
  }

  listLeadStatuses() {
    return this.request<
      Envelope & { lead_statuses?: { id?: string; name?: string | null }[] }
    >('list lead statuses', 'GET', '/lead_statuses');
  }

  listLeadFields() {
    return this.request<
      Envelope & {
        lead_fields?: {
          id?: string;
          name?: string | null;
          label?: string | null;
          key?: string | null;
          field_key?: string | null;
        }[];
      }
    >('list lead fields', 'GET', '/lead_fields');
  }

  listCampaigns(
    options: { page?: number; name?: string; ownerId?: string; leadId?: string } = {}
  ) {
    return this.request<Envelope & { campaigns?: Campaign[] }>(
      'list campaigns',
      'GET',
      '/campaigns',
      {
        params: pickDefined({
          page: options.page,
          name: options.name,
          owner_id: options.ownerId,
          lead_id: options.leadId
        })
      }
    );
  }

  createCampaign(name: string, ownerId: string) {
    return this.request<Campaign & { campaign?: Campaign }>(
      'create campaign',
      'POST',
      '/campaigns',
      {
        data: { campaign_name: name, owner_id: ownerId }
      }
    );
  }

  duplicateCampaign(campaignId: string, ownerId: string, name?: string) {
    return this.request<Campaign & { campaign?: Campaign }>(
      'duplicate campaign',
      'POST',
      '/campaigns/duplicate',
      {
        data: pickDefined({ campaign_id: campaignId, owner_id: ownerId, name })
      }
    );
  }

  deleteCampaign(campaignId: string) {
    return this.request<Envelope>(
      'delete campaign',
      'DELETE',
      `/campaigns/${encodeURIComponent(campaignId)}`
    );
  }

  listCampaignLeads(campaignId: string, page?: number) {
    return this.request<Envelope & { campaign_leads?: CampaignLead[] }>(
      'list campaign leads',
      'GET',
      `/campaigns/${encodeURIComponent(campaignId)}/leads`,
      { params: pickDefined({ page }) }
    );
  }

  addLeadToCampaign(
    campaignId: string,
    leadId: string,
    mailboxId?: string,
    skipIfExists?: boolean
  ) {
    return this.request<Envelope & { campaign_lead?: CampaignLead }>(
      'add lead to campaign',
      'POST',
      `/campaigns/${encodeURIComponent(campaignId)}/leads`,
      {
        data: pickDefined({
          lead_id: leadId,
          mailbox_id: mailboxId,
          skip_if_exists: skipIfExists
        })
      }
    );
  }

  removeLeadFromCampaign(campaignId: string, leadId: string) {
    return this.request<Envelope>(
      'remove lead from campaign',
      'DELETE',
      `/campaigns/${encodeURIComponent(campaignId)}/leads/${encodeURIComponent(leadId)}`
    );
  }

  listUsers(page?: number) {
    return this.request<Envelope & { users?: User[] }>('list users', 'GET', '/users', {
      params: pickDefined({ page })
    });
  }

  addDncDomain(domain: string) {
    return this.request<Envelope & { dnc_domain?: { id?: string; name?: string } }>(
      'add DNC domain',
      'POST',
      '/dnc_domains',
      { data: { name: domain } }
    );
  }

  listDncDomains(page?: number) {
    return this.request<Envelope & { dnc_domains?: { id: string; name: string }[] }>(
      'list DNC domains',
      'GET',
      '/dnc_domains',
      { params: pickDefined({ page }) }
    );
  }
}
