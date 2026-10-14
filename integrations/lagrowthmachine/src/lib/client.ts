import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface LeadIdentifiers {
  leadId?: string;
  firstname?: string;
  lastname?: string;
  proEmail?: string;
  persoEmail?: string;
  linkedinUrl?: string;
  twitter?: string;
  crmId?: string;
  companyName?: string;
  companyUrl?: string;
}

export interface LeadData extends LeadIdentifiers {
  audience?: string;
  phone?: string;
  jobTitle?: string;
  location?: string;
  industry?: string;
  gender?: string;
  bio?: string;
  note?: string;
  profilePicture?: string;
  customAttribute1?: string;
  customAttribute2?: string;
  customAttribute3?: string;
  customAttribute4?: string;
  customAttribute5?: string;
  customAttribute6?: string;
  customAttribute7?: string;
  customAttribute8?: string;
  customAttribute9?: string;
  customAttribute10?: string;
}

export interface SearchLeadParams {
  email?: string;
  leadId?: string;
  crmId?: string;
  linkedinUrl?: string;
  firstname?: string;
  lastname?: string;
  companyName?: string;
  companyUrl?: string;
}

export interface UpdateLeadStatusParams extends LeadIdentifiers {
  email?: string;
  campaignId: string;
  status: string;
}

export interface RemoveLeadParams extends LeadIdentifiers {
  audience: string | string[];
  email?: string;
}

export interface CreateInboxWebhookParams {
  url: string;
  name: string;
  description?: string;
  campaigns?: string[];
}

export interface SendLinkedInMessageParams {
  leadId?: string;
  linkedinUrl?: string;
  message: string;
  identityId: string;
  memberId?: string;
}

export interface ImportLinkedInParams {
  audience: string;
  identityId: string;
  linkedinUrl: string;
  autoImport?: boolean;
  excludeContactedLeads?: boolean;
  linkedinPostCategory?: string;
}

export interface CurrentMember {
  id: string;
  email: string;
}

let hasValue = (value?: string) => Boolean(value?.trim());

let requireLeadIdentifier = (data: LeadIdentifiers) => {
  if (
    hasValue(data.leadId) ||
    hasValue(data.proEmail) ||
    hasValue(data.persoEmail) ||
    hasValue(data.linkedinUrl) ||
    hasValue(data.twitter) ||
    hasValue(data.crmId) ||
    (hasValue(data.firstname) &&
      hasValue(data.lastname) &&
      (hasValue(data.companyName) || hasValue(data.companyUrl)))
  )
    return;

  throw createApiServiceError(
    'Provide a lead ID, email, LinkedIn URL, Twitter handle, CRM ID, or first and last names with a company name or URL.'
  );
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!hasValue(config.token)) {
      throw createApiServiceError(
        'A La Growth Machine API key is required. Reconnect with a valid key.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://apiv2.lagrowthmachine.com/flow',
      timeout: 30000,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'La Growth Machine',
          reason: 'lagrowthmachine_api_error'
        })
    });
  }

  async searchLead(searchParams: SearchLeadParams): Promise<any> {
    requireLeadIdentifier({ ...searchParams, proEmail: searchParams.email });
    let response = await this.http.get('/leads/search', { params: pickDefined(searchParams) });
    return response.data;
  }

  async createOrUpdateLead(leadData: LeadData): Promise<any> {
    requireLeadIdentifier(leadData);
    let { crmId, ...data } = leadData;
    let response = await this.http.post('/leads', pickDefined({ ...data, crm_id: crmId }));
    return response.data;
  }

  private async resolveMutationIdentifiers(
    data: LeadIdentifiers & { email?: string },
    resolveLeadId: boolean
  ) {
    let { email, leadId, crmId, ...identifiers } = data;
    if ((resolveLeadId && hasValue(leadId)) || hasValue(email)) {
      let result = await this.searchLead(hasValue(leadId) ? { leadId } : { email });
      let lead = result?.lead;
      if (!lead) {
        throw createApiServiceError(
          'No matching lead was returned. Use search_lead to find a valid lead.'
        );
      }
      if (!resolveLeadId) {
        if (!hasValue(lead.id)) {
          throw createApiServiceError(
            'The matching lead has no ID. Use a professional or personal email instead.'
          );
        }
        return { leadId: lead.id };
      }
      identifiers = {
        proEmail: lead.proEmail ?? undefined,
        persoEmail: lead.persoEmail ?? undefined,
        linkedinUrl: lead.linkedinUrl ?? undefined,
        twitter: lead.twitter ?? undefined,
        firstname: lead.firstname ?? undefined,
        lastname: lead.lastname ?? undefined,
        companyName: lead.companyName ?? undefined,
        companyUrl: lead.companyUrl ?? undefined
      };
      crmId = lead.crm_id ?? undefined;
      leadId = undefined;
    }
    requireLeadIdentifier({ ...identifiers, leadId, crmId });
    return pickDefined({
      ...identifiers,
      ...(resolveLeadId ? {} : { leadId }),
      crm_id: crmId
    });
  }

  async removeLeadFromAudiences(data: RemoveLeadParams): Promise<any> {
    let { audience, ...identifiers } = data;
    if (
      Array.isArray(audience)
        ? !audience.length || audience.some(value => !hasValue(value))
        : !hasValue(audience)
    ) {
      throw createApiServiceError('Provide at least one audience name or ID, or "all".');
    }
    let resolved = await this.resolveMutationIdentifiers(identifiers, true);
    let response = await this.http.post('/leads/removefromaudience', {
      audience,
      ...resolved
    });
    return response.data;
  }

  async updateLeadStatus(data: UpdateLeadStatusParams): Promise<any> {
    let { campaignId, status, ...identifiers } = data;
    let resolved = await this.resolveMutationIdentifiers(identifiers, false);
    let response = await this.http.post('/leads/status', {
      campaign: campaignId,
      status,
      ...resolved
    });
    return response.data;
  }

  async getCampaigns(
    skip?: number,
    limit = 25,
    status?: string,
    search?: string
  ): Promise<any> {
    let response = await this.http.get('/campaigns', {
      params: pickDefined({ skip, limit, status, search })
    });
    return response.data;
  }

  async getCampaignStats(campaignId: string): Promise<any> {
    let response = await this.http.get(`/campaigns/${encodeURIComponent(campaignId)}/stats`);
    return response.data;
  }

  async createAudience(name: string): Promise<{ audience: { id: string; name: string } }> {
    let response = await this.http.post('/audiences/create', { name });
    return response.data;
  }

  async getCurrentUser(): Promise<CurrentMember> {
    let response = await this.http.get('/me');
    return response.data;
  }

  async listAudiences(): Promise<any> {
    let response = await this.http.get('/audiences');
    return response.data;
  }

  async listIdentities(): Promise<any> {
    let response = await this.http.get('/identities');
    return response.data;
  }

  async listMembers(): Promise<any> {
    let response = await this.http.get('/members');
    return response.data;
  }

  async createInboxWebhook(data: CreateInboxWebhookParams): Promise<any> {
    if (data.campaigns?.length === 0) {
      throw createApiServiceError(
        'Omit campaignIds for all campaigns, or provide at least one campaign ID. An empty list never receives events.'
      );
    }
    let response = await this.http.post('/inboxWebhooks', pickDefined(data));
    return response.data;
  }

  async listInboxWebhooks(): Promise<any> {
    let response = await this.http.get('/inboxWebhooks');
    return response.data;
  }

  async deleteInboxWebhook(webhookId: string): Promise<any> {
    let response = await this.http.delete(`/inboxWebhooks/${encodeURIComponent(webhookId)}`);
    return response.data;
  }

  async sendLinkedInMessage(data: SendLinkedInMessageParams): Promise<any> {
    if (!hasValue(data.leadId) && !hasValue(data.linkedinUrl)) {
      throw createApiServiceError('Provide a lead ID or LinkedIn URL for the recipient.');
    }
    if (!hasValue(data.message)) {
      throw createApiServiceError('Provide a non-empty LinkedIn message.');
    }
    let memberId = data.memberId ?? (await this.getCurrentUser()).id;
    let response = await this.http.post('/inbox/linkedin', pickDefined({ ...data, memberId }));
    return response.data;
  }

  async importFromLinkedIn(data: ImportLinkedInParams): Promise<any> {
    if (
      data.linkedinPostCategory &&
      !['like', 'comment'].includes(data.linkedinPostCategory)
    ) {
      throw createApiServiceError('linkedinPostCategory must be "like" or "comment".');
    }
    let response = await this.http.post('/audiences', pickDefined(data));
    return response.data;
  }
}
