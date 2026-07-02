import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.delighted.com/v1',
      auth: {
        username: config.token,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ---- People ----

  async createPerson(params: {
    email?: string;
    phoneNumber?: string;
    name?: string;
    channel?: 'email' | 'sms';
    delay?: number;
    send?: boolean;
    lastSentAt?: number;
    emailUpdate?: string;
    phoneNumberUpdate?: string;
    properties?: Record<string, string>;
  }) {
    let body: Record<string, any> = {};
    if (params.email) body.email = params.email;
    if (params.phoneNumber) body.phone_number = params.phoneNumber;
    if (params.name) body.name = params.name;
    if (params.channel) body.channel = params.channel;
    if (params.delay !== undefined) body.delay = params.delay;
    if (params.send !== undefined) body.send = params.send;
    if (params.lastSentAt !== undefined) body.last_sent_at = params.lastSentAt;
    if (params.emailUpdate) body.email_update = params.emailUpdate;
    if (params.phoneNumberUpdate) body.phone_number_update = params.phoneNumberUpdate;
    if (params.properties) body.properties = params.properties;

    let response = await this.axios.post('/people.json', body);
    return this.mapPerson(response.data);
  }

  async listPeople(params?: {
    perPage?: number;
    since?: number;
    until?: number;
    email?: string;
    phoneNumber?: string;
  }) {
    let query: Record<string, any> = {};
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;
    if (params?.email) query.email = params.email;
    if (params?.phoneNumber) query.phone_number = params.phoneNumber;

    let response = await this.axios.get('/people.json', { params: query });
    return (response.data as any[]).map((p: any) => this.mapPerson(p));
  }

  async deletePerson(identifier: string) {
    let response = await this.axios.delete(`/people/${encodeURIComponent(identifier)}`);
    return response.data;
  }

  async deletePendingSurveyRequests(personEmail: string) {
    let response = await this.axios.delete(
      `/people/${encodeURIComponent(personEmail)}/survey_requests/pending.json`
    );
    return response.data;
  }

  async unsubscribePerson(personEmail: string) {
    let response = await this.axios.post('/unsubscribes.json', { person_email: personEmail });
    return response.data;
  }

  async listUnsubscribes(params?: {
    perPage?: number;
    page?: number;
    since?: number;
    until?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.page) query.page = params.page;
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;

    let response = await this.axios.get('/unsubscribes.json', { params: query });
    return (response.data as any[]).map((u: any) => ({
      personId: u.person_id,
      email: u.email,
      name: u.name,
      unsubscribedAt: u.unsubscribed_at
    }));
  }

  async listBounces(params?: {
    perPage?: number;
    page?: number;
    since?: number;
    until?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.page) query.page = params.page;
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;

    let response = await this.axios.get('/bounces.json', { params: query });
    return (response.data as any[]).map((b: any) => ({
      personId: b.person_id,
      email: b.email,
      name: b.name,
      bouncedAt: b.bounced_at
    }));
  }

  // ---- Survey Responses ----

  async listSurveyResponses(params?: {
    perPage?: number;
    page?: number;
    since?: number;
    until?: number;
    updatedSince?: number;
    updatedUntil?: number;
    personId?: string;
    personEmail?: string;
    trend?: string;
    order?: string;
    expandPerson?: boolean;
  }) {
    let query: Record<string, any> = {};
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.page) query.page = params.page;
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;
    if (params?.updatedSince) query.updated_since = params.updatedSince;
    if (params?.updatedUntil) query.updated_until = params.updatedUntil;
    if (params?.personId) query.person_id = params.personId;
    if (params?.personEmail) query.person_email = params.personEmail;
    if (params?.trend) query.trend = params.trend;
    if (params?.order) query.order = params.order;
    if (params?.expandPerson) query['expand[]'] = 'person';

    let response = await this.axios.get('/survey_responses.json', { params: query });
    return (response.data as any[]).map((r: any) => this.mapSurveyResponse(r));
  }

  async createSurveyResponse(params: {
    personId: string;
    score: number;
    comment?: string;
    personProperties?: Record<string, string>;
    createdAt?: number;
  }) {
    let body: Record<string, any> = {
      person: params.personId,
      score: params.score
    };
    if (params.comment) body.comment = params.comment;
    if (params.personProperties) body.person_properties = params.personProperties;
    if (params.createdAt) body.created_at = params.createdAt;

    let response = await this.axios.post('/survey_responses.json', body);
    return this.mapSurveyResponse(response.data);
  }

  // ---- Metrics ----

  async getMetrics(params?: { since?: number; until?: number; trend?: string }) {
    let query: Record<string, any> = {};
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;
    if (params?.trend) query.trend = params.trend;

    let response = await this.axios.get('/metrics.json', { params: query });
    let d = response.data;
    return {
      nps: d.nps,
      promoterCount: d.promoter_count,
      promoterPercent: d.promoter_percent,
      passiveCount: d.passive_count,
      passivePercent: d.passive_percent,
      detractorCount: d.detractor_count,
      detractorPercent: d.detractor_percent,
      responseCount: d.response_count
    };
  }

  // ---- Autopilot ----

  async getAutopilotConfig(platform: 'email' | 'sms') {
    let response = await this.axios.get(`/autopilot/${platform}.json`);
    let d = response.data;
    return {
      platformId: d.platform_id,
      active: d.active,
      frequency: d.frequency,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    };
  }

  async addToAutopilot(
    platform: 'email' | 'sms',
    params: {
      personEmail?: string;
      personPhoneNumber?: string;
      personId?: string;
      personName?: string;
      properties?: Record<string, string>;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.personEmail) body.person_email = params.personEmail;
    if (params.personPhoneNumber) body.person_phone_number = params.personPhoneNumber;
    if (params.personId) body.person_id = params.personId;
    if (params.personName) body.person_name = params.personName;
    if (params.properties) body.properties = params.properties;

    let response = await this.axios.post(`/autopilot/${platform}/memberships.json`, body);
    let d = response.data;
    return {
      person: d.person ? this.mapPersonBasic(d.person) : null,
      properties: d.properties || {}
    };
  }

  async listAutopilotMembers(
    platform: 'email' | 'sms',
    params?: {
      perPage?: number;
      personId?: string;
      personEmail?: string;
      personPhoneNumber?: string;
    }
  ) {
    let query: Record<string, any> = {};
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.personId) query.person_id = params.personId;
    if (params?.personEmail) query.person_email = params.personEmail;
    if (params?.personPhoneNumber) query.person_phone_number = params.personPhoneNumber;

    let response = await this.axios.get(`/autopilot/${platform}/memberships.json`, {
      params: query
    });
    return (response.data as any[]).map((m: any) => ({
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      person: m.person ? this.mapPersonBasic(m.person) : null,
      nextSurveyRequest: m.next_survey_request
        ? {
            surveyRequestId: m.next_survey_request.id,
            createdAt: m.next_survey_request.created_at,
            surveyScheduledAt: m.next_survey_request.survey_scheduled_at,
            properties: m.next_survey_request.properties || {}
          }
        : null
    }));
  }

  async removeFromAutopilot(
    platform: 'email' | 'sms',
    params: {
      personId?: string;
      personEmail?: string;
      personPhoneNumber?: string;
    }
  ) {
    let query: Record<string, any> = {};
    if (params.personId) query.person_id = params.personId;
    if (params.personEmail) query.person_email = params.personEmail;
    if (params.personPhoneNumber) query.person_phone_number = params.personPhoneNumber;

    let response = await this.axios.delete(`/autopilot/${platform}/memberships.json`, {
      params: query
    });
    let d = response.data;
    return {
      person: d.person ? this.mapPersonBasic(d.person) : null
    };
  }

  // ---- Mapping helpers ----

  private mapPerson(p: any) {
    return {
      personId: p.id,
      email: p.email || null,
      name: p.name || null,
      phoneNumber: p.phone_number || null,
      createdAt: p.created_at,
      lastSentAt: p.last_sent_at || null,
      lastRespondedAt: p.last_responded_at || null,
      nextSurveyScheduledAt: p.next_survey_scheduled_at || null,
      surveyScheduledAt: p.survey_scheduled_at || null,
      properties: p.properties || {}
    };
  }

  private mapPersonBasic(p: any) {
    return {
      personId: p.id,
      email: p.email || null,
      name: p.name || null,
      phoneNumber: p.phone_number || null,
      createdAt: p.created_at
    };
  }

  private mapSurveyResponse(r: any) {
    let person: any;
    if (typeof r.person === 'object' && r.person !== null) {
      person = this.mapPersonBasic(r.person);
    } else {
      person = r.person;
    }

    return {
      responseId: r.id,
      person,
      surveyType: r.survey_type,
      score: r.score,
      comment: r.comment || null,
      permalink: r.permalink || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      personProperties: r.person_properties || {},
      notes: (r.notes || []).map((n: any) => ({
        noteId: n.id,
        body: n.body,
        createdAt: n.created_at
      })),
      tags: r.tags || [],
      additionalAnswers: (r.additional_answers || []).map((a: any) => ({
        answerId: a.id,
        value: a.value,
        question: a.question
      }))
    };
  }
}
