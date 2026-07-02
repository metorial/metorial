import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(
    private options: {
      token: string;
      accountId?: string;
    }
  ) {
    this.axios = createAxios({
      baseURL: 'https://api.callingly.com/v1'
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.options.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }

  private addAccountId(params: Record<string, any> = {}): Record<string, any> {
    if (this.options.accountId) {
      params.account_id = this.options.accountId;
    }
    return params;
  }

  // ── Leads ──────────────────────────────────────────────

  async listLeads(params?: { start?: string; end?: string; phoneNumber?: string }) {
    let queryParams: Record<string, any> = this.addAccountId();
    if (params?.start) queryParams.start = params.start;
    if (params?.end) queryParams.end = params.end;
    if (params?.phoneNumber) queryParams.phone_number = params.phoneNumber;

    let response = await this.axios.get('/leads', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getLead(leadId: string) {
    let response = await this.axios.get(`/leads/${leadId}`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async updateLead(leadId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/leads/${leadId}`, this.addAccountId(data), {
      headers: this.headers
    });
    return response.data;
  }

  async deleteLead(leadId: string) {
    let response = await this.axios.delete(`/leads/${leadId}`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  // ── Calls ──────────────────────────────────────────────

  async listCalls(params?: {
    start?: string;
    end?: string;
    teamId?: string;
    limit?: number;
    page?: number;
  }) {
    let queryParams: Record<string, any> = this.addAccountId();
    if (params?.start) queryParams.start = params.start;
    if (params?.end) queryParams.end = params.end;
    if (params?.teamId) queryParams.team_id = params.teamId;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.page) queryParams.page = params.page;

    let response = await this.axios.get('/calls', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getCall(callId: string) {
    let response = await this.axios.get(`/calls/${callId}`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async createCall(data: {
    teamId: string;
    firstName?: string;
    lastName?: string;
    phoneNumber: string;
    email?: string;
    company?: string;
    category?: string;
    source?: string;
    crmId?: string;
    scheduledAt?: string;
  }) {
    let body: Record<string, any> = this.addAccountId({
      team_id: data.teamId,
      phone_number: data.phoneNumber
    });
    if (data.firstName) body.first_name = data.firstName;
    if (data.lastName) body.last_name = data.lastName;
    if (data.email) body.email = data.email;
    if (data.company) body.company = data.company;
    if (data.category) body.category = data.category;
    if (data.source) body.source = data.source;
    if (data.crmId) body.crm_id = data.crmId;
    if (data.scheduledAt) body.scheduled_at = data.scheduledAt;

    let response = await this.axios.post('/calls', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ── SMS ────────────────────────────────────────────────

  async sendSms(data: { phoneNumber: string; smsNumber: string; message: string }) {
    let body: Record<string, any> = this.addAccountId({
      phone_number: data.phoneNumber,
      sms_number: data.smsNumber,
      message: data.message
    });

    let response = await this.axios.post('/sms', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Teams ──────────────────────────────────────────────

  async listTeams() {
    let response = await this.axios.get('/teams', {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.axios.get(`/teams/${teamId}`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async createTeam(data: Record<string, any>) {
    let body = this.addAccountId(data);
    let response = await this.axios.post('/teams', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateTeam(teamId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/teams/${teamId}`, this.addAccountId(data), {
      headers: this.headers
    });
    return response.data;
  }

  // ── Team Agents ────────────────────────────────────────

  async listTeamAgents(teamId: string) {
    let response = await this.axios.get(`/teams/${teamId}/agents`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async assignAgentsToTeam(teamId: string, agentIds: string[]) {
    let body = this.addAccountId({ agents: agentIds });
    let response = await this.axios.put(`/teams/${teamId}/agents`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async removeAgentFromTeam(teamId: string, agentId: string) {
    let response = await this.axios.delete(`/teams/${teamId}/agents/${agentId}`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async updateTeamAgent(
    teamId: string,
    agentId: string,
    data: { priority?: number; cap?: number }
  ) {
    let body: Record<string, any> = this.addAccountId();
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.cap !== undefined) body.cap = data.cap;

    let response = await this.axios.put(`/teams/${teamId}/agents/${agentId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Agents ─────────────────────────────────────────────

  async listAgents() {
    let response = await this.axios.get('/agents', {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async createAgent(data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    ext?: string;
    timezone?: string;
  }) {
    let body: Record<string, any> = this.addAccountId({
      fname: data.firstName,
      lname: data.lastName,
      phone_number: data.phoneNumber
    });
    if (data.ext) body.ext = data.ext;
    if (data.timezone) body.timezone = data.timezone;

    let response = await this.axios.post('/agents', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateAgent(agentId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/agents/${agentId}`, this.addAccountId(data), {
      headers: this.headers
    });
    return response.data;
  }

  async deleteAgent(agentId: string) {
    let response = await this.axios.delete(`/agents/${agentId}`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async getAgentSchedule(agentId: string) {
    let response = await this.axios.get(`/agents/${agentId}/schedule`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async updateAgentSchedule(agentId: string, schedule: any[]) {
    let body = this.addAccountId({ schedule });
    let response = await this.axios.put(`/agents/${agentId}/schedule`, body, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Clients ────────────────────────────────────────────

  async listClients() {
    let response = await this.axios.get('/clients', {
      headers: this.headers
    });
    return response.data;
  }

  async createClient(data: {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) {
    let response = await this.axios.post(
      '/clients',
      {
        fname: data.firstName,
        lname: data.lastName,
        company: data.company,
        email: data.email,
        phone_number: data.phoneNumber,
        password: data.password
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteClient(clientId: string) {
    let response = await this.axios.delete(`/clients/${clientId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async setClientActive(clientId: string, isActive: boolean) {
    let response = await this.axios.post(
      `/clients/${clientId}/active`,
      {
        is_active: isActive ? 1 : 0
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Webhooks ───────────────────────────────────────────

  async listWebhooks() {
    let response = await this.axios.get('/webhooks', {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/webhooks/${webhookId}`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }

  async createWebhook(data: {
    name: string;
    event: string;
    targetUrl: string;
    callDirection?: string;
    callStatus?: string;
    callLeadStatus?: string;
    teamId?: string;
    numberId?: string;
    field?: string;
    filter?: string;
  }) {
    let body: Record<string, any> = this.addAccountId({
      name: data.name,
      event: data.event,
      target_url: data.targetUrl
    });
    if (data.callDirection) body.call_direction = data.callDirection;
    if (data.callStatus) body.call_status = data.callStatus;
    if (data.callLeadStatus) body.call_lead_status = data.callLeadStatus;
    if (data.teamId) body.team_id = data.teamId;
    if (data.numberId) body.number_id = data.numberId;
    if (data.field) body.field = data.field;
    if (data.filter) body.filter = data.filter;

    let response = await this.axios.post('/webhooks', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateWebhook(webhookId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/webhooks/${webhookId}`, this.addAccountId(data), {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`, {
      headers: this.headers,
      params: this.addAccountId()
    });
    return response.data;
  }
}
