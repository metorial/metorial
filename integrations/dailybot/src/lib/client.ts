import { pickDefined } from 'slates';
import { createDailyBotAxios } from './http';

export class DailyBotClient {
  private axios: ReturnType<typeof createDailyBotAxios>;

  constructor(config: { token: string }) {
    this.axios = createDailyBotAxios(config.token);
  }

  // ── Me / Organization ───────────────────────────────────────────────

  async getMe(includeEmail?: boolean): Promise<any> {
    let response = await this.axios.get('/me/', {
      params: pickDefined({ include_email: includeEmail })
    });
    return response.data;
  }

  async getOrganization(): Promise<any> {
    let response = await this.axios.get('/organization/');
    return response.data;
  }

  // ── Users ───────────────────────────────────────────────────────────

  async listUsers(
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      onlyActive?: boolean;
      includeEmail?: boolean;
    } = {}
  ): Promise<any> {
    let response = await this.axios.get('/users/', {
      params: pickDefined({
        page: params.page,
        page_size: params.pageSize,
        search: params.search,
        only_active: params.onlyActive,
        include_email: params.includeEmail
      })
    });
    return response.data;
  }

  async getUser(userUuid: string): Promise<any> {
    let response = await this.axios.get(`/users/${encodeURIComponent(userUuid)}/`);
    return response.data;
  }

  async updateUser(userUuid: string, data: Record<string, any>): Promise<void> {
    await this.axios.patch(`/users/${encodeURIComponent(userUuid)}/`, data);
  }

  async inviteUsers(identifiers: string[]): Promise<any> {
    let response = await this.axios.post('/invite-user/', {
      users_identifiers: identifiers
    });
    return response.data;
  }

  // ── Teams ───────────────────────────────────────────────────────────

  async listTeams(params: { page?: number; pageSize?: number } = {}): Promise<any> {
    let response = await this.axios.get('/teams/', {
      params: pickDefined({ page: params.page, page_size: params.pageSize })
    });
    return response.data;
  }

  async getTeam(teamUuid: string): Promise<any> {
    let response = await this.axios.get(`/teams/${encodeURIComponent(teamUuid)}/`);
    return response.data;
  }

  async listTeamMembers(teamUuid: string): Promise<any[]> {
    let response = await this.axios.get(`/teams/${encodeURIComponent(teamUuid)}/members/`);
    return response.data?.results ?? response.data;
  }

  async addTeamMembers(teamUuid: string, memberUuids: string[]): Promise<void> {
    let members = memberUuids.map(uuid => ({
      uuid,
      platform: 'dailybot'
    }));
    await this.axios.post(`/teams/${encodeURIComponent(teamUuid)}/member/`, { members });
  }

  async removeTeamMember(teamUuid: string, userUuid: string): Promise<void> {
    await this.axios.delete(
      `/teams/${encodeURIComponent(teamUuid)}/member/${encodeURIComponent(userUuid)}/`
    );
  }

  // ── Check-ins ───────────────────────────────────────────────────────

  async listCheckins(
    params: {
      includeSummary?: boolean;
      date?: string;
      page?: number;
      pageSize?: number;
      search?: string;
      teamUuid?: string;
      userUuid?: string;
    } = {}
  ): Promise<any> {
    let query = pickDefined({
      include_summary: params.includeSummary,
      date: params.date,
      page: params.page,
      page_size: params.pageSize,
      search: params.search,
      team_uuid: params.teamUuid,
      user_uuid: params.userUuid
    });
    let response = await this.axios.get('/checkins/', { params: query });
    return response.data;
  }

  async getCheckin(
    checkinUuid: string,
    params?: {
      includeSummary?: boolean;
      date?: string;
    }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.includeSummary) query.include_summary = true;
    if (params?.date) query.date = params.date;
    let response = await this.axios.get(`/checkins/${encodeURIComponent(checkinUuid)}/`, {
      params: query
    });
    return response.data;
  }

  async createCheckin(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/checkins/', data);
    return response.data;
  }

  async updateCheckin(checkinUuid: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(
      `/checkins/${encodeURIComponent(checkinUuid)}/`,
      data
    );
    return response.data;
  }

  async deleteCheckin(checkinUuid: string): Promise<void> {
    await this.axios.delete(`/checkins/${encodeURIComponent(checkinUuid)}/`);
  }

  async getCheckinResponses(
    checkinUuid: string,
    params?: {
      dateStart?: string;
      dateEnd?: string;
      limit?: number;
      offset?: number;
      page?: number;
      pageSize?: number;
    }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.dateStart) query.date_start = params.dateStart;
    if (params?.dateEnd) query.date_end = params.dateEnd;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.page !== undefined) query.page = params.page;
    if (params?.pageSize !== undefined) query.page_size = params.pageSize;
    let response = await this.axios.get(
      `/checkins/${encodeURIComponent(checkinUuid)}/responses/`,
      {
        params: query
      }
    );
    return response.data;
  }

  async sendCheckinReminders(
    checkinUuid: string,
    data: {
      usersUuids?: string[];
      usersEmails?: string[];
      reminderTriggeredByUser?: string;
      isReminderTriggeredByMe?: boolean;
      date?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.usersUuids) body.users_uuids = data.usersUuids;
    if (data.usersEmails) body.users_emails = data.usersEmails;
    if (data.reminderTriggeredByUser)
      body.reminder_triggered_by_user = data.reminderTriggeredByUser;
    if (data.isReminderTriggeredByMe !== undefined)
      body.is_reminder_triggered_by_me = data.isReminderTriggeredByMe;
    if (data.date) body.date = data.date;
    let response = await this.axios.post(
      `/checkins/${encodeURIComponent(checkinUuid)}/send-reminders/`,
      body
    );
    return response.data;
  }

  // ── Forms ───────────────────────────────────────────────────────────

  async listForms(
    params: {
      limit?: number;
      offset?: number;
      search?: string;
      includeArchived?: boolean;
    } = {}
  ): Promise<any> {
    let response = await this.axios.get('/forms/', {
      params: pickDefined({
        limit: params.limit,
        offset: params.offset,
        search: params.search,
        include_archived: params.includeArchived
      })
    });
    return response.data;
  }

  async getForm(formUuid: string): Promise<any> {
    let response = await this.axios.get(`/forms/${encodeURIComponent(formUuid)}/`);
    return response.data;
  }

  async getFormResponses(
    formUuid: string,
    params: {
      all?: boolean;
      userUuid?: string;
      search?: string;
      state?: string;
      order?: 'recent' | 'oldest';
      dateStart?: string;
      dateEnd?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/forms/${encodeURIComponent(formUuid)}/responses/`, {
      params: pickDefined({
        all: params.all,
        user: params.userUuid,
        search: params.search,
        state: params.state,
        order: params.order,
        start_date: params.dateStart,
        end_date: params.dateEnd,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  // ── Templates ───────────────────────────────────────────────────────

  async listTemplates(params: {
    type: 'check-ins' | 'forms';
    systemDefault?: boolean;
    page?: number;
    pageSize?: number;
    renderSpecialVars?: boolean;
    followupId?: string;
  }): Promise<any> {
    let query: Record<string, any> = { type: params.type };
    if (params.systemDefault !== undefined) query.system_default = params.systemDefault;
    if (params.page !== undefined) query.page = params.page;
    if (params.pageSize !== undefined) query.page_size = params.pageSize;
    if (params.renderSpecialVars !== undefined)
      query.render_special_vars = params.renderSpecialVars;
    if (params.followupId !== undefined) query.followup_id = params.followupId;
    let response = await this.axios.get('/templates/', { params: query });
    return response.data;
  }

  async getTemplate(templateUuid: string): Promise<any> {
    let response = await this.axios.get(`/templates/${encodeURIComponent(templateUuid)}/`);
    return response.data;
  }

  // ── Messaging ───────────────────────────────────────────────────────

  async sendMessage(data: {
    message: string;
    targetUsers?: string[];
    targetTeams?: string[];
    targetChannels?: Array<{ id: string; channel_type?: string; thread?: string }>;
    imageUrl?: string;
    buttons?: Array<{
      label: string;
      value: string;
      type?: string;
      url?: string;
      callbackUrl?: string;
    }>;
    botMessageId?: string;
  }): Promise<void> {
    let body: Record<string, any> = { message: data.message };
    if (data.targetUsers) body.target_users = data.targetUsers;
    if (data.targetTeams) body.target_teams = data.targetTeams;
    if (data.targetChannels) body.target_channels = data.targetChannels;
    if (data.imageUrl) body.image_url = data.imageUrl;
    if (data.buttons)
      body.buttons = data.buttons.map(button =>
        pickDefined({
          label: button.label,
          value: button.value,
          button_type: button.type ?? 'interactive',
          url: button.url,
          callback_url: button.callbackUrl
        })
      );
    if (data.botMessageId !== undefined) body.bot_message_id = data.botMessageId;
    await this.axios.post('/send-message/', body);
  }

  async sendEmail(data: {
    usersUuids: string[];
    emailSubject: string;
    emailContent: string;
  }): Promise<void> {
    await this.axios.post('/send-email/', {
      users_uuids: data.usersUuids,
      email_subject: data.emailSubject,
      email_content: data.emailContent
    });
  }

  // ── Kudos ───────────────────────────────────────────────────────────

  async giveKudos(data: {
    receivers: string[];
    content: string;
    companyValue?: string;
    isAnonymous?: boolean;
    byDailybot?: boolean;
  }): Promise<any> {
    let body: Record<string, any> = {
      receivers: data.receivers,
      content: data.content
    };
    if (data.companyValue) body.company_value = data.companyValue;
    if (data.isAnonymous !== undefined) body.is_anonymous = data.isAnonymous;
    if (data.byDailybot !== undefined) body.by_dailybot = data.byDailybot;
    let response = await this.axios.post('/kudos/', body);
    return response.data;
  }

  // ── Webhooks ────────────────────────────────────────────────────────

  async createWebhook(data: {
    hookUrl: string;
    name?: string;
    subscriptions?: string[];
    subscribedObjects?: string[];
    bearer?: string;
    immediateSampleEvent?: boolean;
  }): Promise<any> {
    let body: Record<string, any> = {
      hook_url: data.hookUrl
    };
    if (data.name) body.name = data.name;
    if (data.subscriptions) body.subscriptions = data.subscriptions;
    if (data.subscribedObjects) body.subscribed_objects = data.subscribedObjects;
    if (data.bearer) body.bearer = data.bearer;
    if (data.immediateSampleEvent !== undefined)
      body.immediate_sample_event = data.immediateSampleEvent;
    let response = await this.axios.post('/webhook-subscription/', body);
    return response.data;
  }

  async deleteWebhook(hookId: string, hookUrl: string): Promise<void> {
    await this.axios.delete('/webhook-subscription/', {
      params: {
        hook_id: hookId,
        hook_url: hookUrl
      }
    });
  }
}
