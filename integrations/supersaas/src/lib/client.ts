import { createAxios } from 'slates';

export interface SuperSaasAuth {
  token: string;
  accountName: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(auth: SuperSaasAuth) {
    this.axios = createAxios({
      baseURL: 'https://www.supersaas.com',
      params: {
        account: auth.accountName,
        api_key: auth.token
      }
    });
  }

  // ─── Schedules & Information ───────────────────────────────────────

  async listSchedules(): Promise<any[]> {
    let response = await this.axios.get('/api/schedules.json');
    return response.data;
  }

  async listResources(scheduleId: string): Promise<any[]> {
    let response = await this.axios.get('/api/resources.json', {
      params: { schedule_id: scheduleId }
    });
    return response.data;
  }

  async getFieldList(scheduleId?: string): Promise<any[]> {
    let response = await this.axios.get('/api/field_list.json', {
      params: scheduleId ? { schedule_id: scheduleId } : {}
    });
    return response.data;
  }

  async listGroups(): Promise<any[]> {
    let response = await this.axios.get('/api/groups.json');
    return response.data;
  }

  async listFormTemplates(): Promise<any[]> {
    let response = await this.axios.get('/api/super_forms.json');
    return response.data;
  }

  // ─── Users ─────────────────────────────────────────────────────────

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(`/api/users/${encodeURIComponent(userId)}.json`);
    return response.data;
  }

  async listUsers(params?: {
    limit?: number;
    offset?: number;
    form?: boolean;
  }): Promise<any[]> {
    let response = await this.axios.get('/api/users.json', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        form: params?.form ? 'true' : undefined
      }
    });
    return response.data;
  }

  async createUser(userData: Record<string, any>, foreignKey?: string): Promise<any> {
    let userParams: Record<string, any> = {};
    for (let [key, value] of Object.entries(userData)) {
      if (value !== undefined && value !== null) {
        userParams[`user[${key}]`] = value;
      }
    }

    let url = foreignKey
      ? `/api/users/${encodeURIComponent(`${foreignKey}fk`)}.json`
      : '/api/users.json';

    let response = await this.axios.post(url, null, {
      params: { ...userParams, webhook: 'true' }
    });
    return response.data;
  }

  async updateUser(userId: string, userData: Record<string, any>): Promise<any> {
    let userParams: Record<string, any> = {};
    for (let [key, value] of Object.entries(userData)) {
      if (value !== undefined && value !== null) {
        userParams[`user[${key}]`] = value;
      }
    }

    let response = await this.axios.put(
      `/api/users/${encodeURIComponent(userId)}.json`,
      null,
      {
        params: { ...userParams, webhook: 'true' }
      }
    );
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.axios.delete(`/api/users/${encodeURIComponent(userId)}.json`);
  }

  // ─── Appointments ──────────────────────────────────────────────────

  async getAppointment(appointmentId: string): Promise<any> {
    let response = await this.axios.get(
      `/api/bookings/${encodeURIComponent(appointmentId)}.json`
    );
    return response.data;
  }

  async listAppointments(
    scheduleId: string,
    params?: {
      form?: boolean;
      limit?: number;
      offset?: number;
      from?: string;
      to?: string;
      user?: string;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(`/api/range/${encodeURIComponent(scheduleId)}.json`, {
      params: {
        from: params?.from,
        to: params?.to,
        limit: params?.limit,
        offset: params?.offset,
        form: params?.form ? 'true' : undefined,
        user: params?.user
      }
    });
    return response.data;
  }

  async getAgenda(
    scheduleId: string,
    userId: string,
    params?: {
      from?: string;
      slot?: boolean;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(`/api/agenda/${encodeURIComponent(scheduleId)}.json`, {
      params: {
        user: userId,
        from: params?.from,
        slot: params?.slot ? 'true' : undefined
      }
    });
    return response.data;
  }

  async getAvailability(
    scheduleId: string,
    params?: {
      from?: string;
      length?: number;
      resource?: string;
      full?: boolean;
      limit?: number;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(`/api/free/${encodeURIComponent(scheduleId)}.json`, {
      params: {
        from: params?.from,
        length: params?.length,
        resource: params?.resource,
        full: params?.full ? 'true' : undefined,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async getRecentChanges(
    scheduleId: string,
    params?: {
      from?: string;
      slot?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(
      `/api/changes/${encodeURIComponent(scheduleId)}.json`,
      {
        params: {
          from: params?.from,
          slot: params?.slot ? 'true' : undefined,
          limit: params?.limit,
          offset: params?.offset
        }
      }
    );
    return response.data;
  }

  async createAppointment(
    scheduleId: string,
    bookingData: Record<string, any>,
    userId?: string
  ): Promise<any> {
    let bookingParams: Record<string, any> = {
      schedule_id: scheduleId
    };
    if (userId) {
      bookingParams.user = userId;
    }
    for (let [key, value] of Object.entries(bookingData)) {
      if (value !== undefined && value !== null) {
        bookingParams[`booking[${key}]`] = value;
      }
    }

    let response = await this.axios.post('/api/bookings.json', null, {
      params: { ...bookingParams, webhook: 'true' }
    });
    return response.data;
  }

  async updateAppointment(
    appointmentId: string,
    bookingData: Record<string, any>
  ): Promise<any> {
    let bookingParams: Record<string, any> = {};
    for (let [key, value] of Object.entries(bookingData)) {
      if (value !== undefined && value !== null) {
        bookingParams[`booking[${key}]`] = value;
      }
    }

    let response = await this.axios.put(
      `/api/bookings/${encodeURIComponent(appointmentId)}.json`,
      null,
      {
        params: { ...bookingParams, webhook: 'true' }
      }
    );
    return response.data;
  }

  async deleteAppointment(appointmentId: string): Promise<void> {
    await this.axios.delete(`/api/bookings/${encodeURIComponent(appointmentId)}.json`);
  }

  // ─── Forms ─────────────────────────────────────────────────────────

  async getFormEntries(
    formId: string,
    params?: {
      from?: string;
      limit?: number;
      offset?: number;
      user?: string;
    }
  ): Promise<any[]> {
    let response = await this.axios.get('/api/forms.json', {
      params: {
        form_id: formId,
        from: params?.from,
        limit: params?.limit,
        offset: params?.offset,
        user: params?.user
      }
    });
    return response.data;
  }

  async getFormEntry(formEntryId: string): Promise<any> {
    let response = await this.axios.get('/api/forms.json', {
      params: { id: formEntryId }
    });
    return response.data;
  }

  // ─── Promotions ────────────────────────────────────────────────────

  async listPromotions(params?: { limit?: number; offset?: number }): Promise<any[]> {
    let response = await this.axios.get('/api/promotions.json', {
      params: {
        limit: params?.limit,
        offset: params?.offset
      }
    });
    return response.data;
  }

  async getPromotion(promotionCode: string): Promise<any> {
    let response = await this.axios.get('/api/promotions.json', {
      params: { id: promotionCode }
    });
    return response.data;
  }

  async duplicatePromotion(newCode: string, templateCode: string): Promise<any> {
    let response = await this.axios.post('/api/promotions.json', null, {
      params: {
        id: newCode,
        template_code: templateCode
      }
    });
    return response.data;
  }

  // ─── Webhooks ──────────────────────────────────────────────────────

  async createWebhook(eventCode: string, parentId: string, targetUrl: string): Promise<any> {
    let response = await this.axios.post('/api/hooks', null, {
      params: {
        event: eventCode,
        parent_id: parentId,
        target_url: targetUrl
      }
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string, parentId: string): Promise<void> {
    await this.axios.delete(`/api/hooks/${encodeURIComponent(webhookId)}`, {
      params: {
        parent_id: parentId
      }
    });
  }
}
