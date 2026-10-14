import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';

export interface SuperSaasAuth {
  token: string;
  accountName: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(auth: SuperSaasAuth) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://www.supersaas.com',
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SuperSaaS',
          reason: 'SUPERSAAS_API_ERROR'
        }),
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
    if (
      foreignKey &&
      !getResponseHeaderValue(response.headers, 'location') &&
      !isApiErrorRecord(response.data)
    ) {
      return this.getUser(`${foreignKey}fk`);
    }
    return this.createdRecord(response, 'users', { ...userData, fk: foreignKey });
  }

  async updateUser(userId: string, userData: Record<string, any>): Promise<any> {
    let existing = await this.getUser(userId);
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
        params: { ...userParams, webhook: 'true', notfound: 'error' }
      }
    );
    return {
      ...existing,
      ...userData,
      ...(isApiErrorRecord(response.data) ? response.data : {})
    };
  }

  async deleteUser(userId: string): Promise<void> {
    await this.axios.delete(`/api/users/${encodeURIComponent(userId)}.json`);
  }

  // ─── Appointments ──────────────────────────────────────────────────

  async getAppointment(
    appointmentId: string,
    scheduleId?: string,
    form?: boolean
  ): Promise<any> {
    let resolved = await this.resolveAppointment(appointmentId, scheduleId, form);
    return { ...resolved.booking, schedule_id: resolved.scheduleId };
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
      resourceId?: string;
      serviceId?: string;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(`/api/range/${encodeURIComponent(scheduleId)}.json`, {
      params: {
        from: params?.from,
        to: params?.to,
        limit: params?.limit,
        offset: params?.offset,
        form: params?.form ? 'true' : undefined,
        user: params?.user,
        resource_id: params?.resourceId,
        service_id: params?.serviceId,
        slot: 'true'
      }
    });
    return this.appointmentCollection(response.data).map(booking => ({
      ...booking,
      schedule_id: scheduleId
    }));
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
    return this.appointmentCollection(response.data).map(booking => ({
      ...booking,
      schedule_id: scheduleId
    }));
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
        maxresults: params?.limit
      }
    });
    return this.collection(response.data, ['slots']);
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
    return this.appointmentCollection(response.data).map(booking => ({
      ...booking,
      schedule_id: scheduleId
    }));
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
      bookingParams.user_id = userId;
    }
    for (let [key, value] of Object.entries(bookingData)) {
      if (value !== undefined && value !== null) {
        bookingParams[`booking[${key}]`] = value;
      }
    }

    let response = await this.axios.post('/api/bookings.json', null, {
      params: { ...bookingParams, webhook: 'true' }
    });
    return {
      ...this.createdRecord(response, 'bookings', bookingData),
      schedule_id: scheduleId,
      user_id: userId
    };
  }

  async updateAppointment(
    appointmentId: string,
    bookingData: Record<string, any>,
    scheduleId?: string
  ): Promise<any> {
    let resolved = await this.resolveAppointment(appointmentId, scheduleId);
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
        params: { ...bookingParams, schedule_id: resolved.scheduleId, webhook: 'true' }
      }
    );
    return {
      ...resolved.booking,
      ...bookingData,
      ...(isApiErrorRecord(response.data) ? response.data : {}),
      id: appointmentId,
      schedule_id: resolved.scheduleId
    };
  }

  async deleteAppointment(appointmentId: string, scheduleId?: string): Promise<void> {
    let resolved = await this.resolveAppointment(appointmentId, scheduleId);
    await this.axios.delete(`/api/bookings/${encodeURIComponent(appointmentId)}.json`, {
      params: { schedule_id: resolved.scheduleId }
    });
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
    return isApiErrorRecord(response.data) ? response.data : { code: newCode };
  }

  async deletePromotion(promotionCode: string): Promise<void> {
    await this.axios.delete('/api/promotions.json', { params: { id: promotionCode } });
  }

  async listSlots(
    scheduleId: string,
    params?: { start?: string; finish?: string; limit?: number; offset?: number }
  ): Promise<any[]> {
    let response = await this.axios.get('/api/slots.json', {
      params: { schedule_id: scheduleId, ...params }
    });
    return this.collection(response.data, ['slots']);
  }

  private appointmentCollection(data: unknown): any[] {
    if (isApiErrorRecord(data) && Array.isArray(data.slots)) {
      return data.slots.flatMap((slot: any) => {
        if (!Array.isArray(slot.bookings)) {
          throw createApiServiceError('SuperSaaS returned slots without booking details.', {
            reason: 'SUPERSAAS_RESPONSE_INVALID'
          });
        }
        return slot.bookings.map((booking: any) => ({
          start: slot.start,
          finish: slot.finish,
          ...booking,
          slot_id: booking.slot_id ?? slot.id
        }));
      });
    }
    return this.collection(data, ['bookings']);
  }

  private collection(data: unknown, keys: string[]): any[] {
    if (Array.isArray(data)) return data;
    if (isApiErrorRecord(data)) {
      for (let key of keys) {
        if (Array.isArray(data[key])) return data[key];
      }
    }
    throw createApiServiceError('SuperSaaS returned an unexpected collection response.', {
      reason: 'SUPERSAAS_RESPONSE_INVALID'
    });
  }

  private createdRecord(
    response: { data: unknown; headers: unknown },
    collection: string,
    fields: Record<string, any>
  ): Record<string, any> {
    let data = isApiErrorRecord(response.data) ? response.data : {};
    let location = getResponseHeaderValue(response.headers, 'location');
    let id =
      data.id ?? location?.match(new RegExp(`/api/${collection}/(\\d+)\\.(?:json|xml)`))?.[1];
    if (id == null) {
      throw createApiServiceError(
        'SuperSaaS accepted the creation but did not return its ID. Check the account before retrying.',
        { reason: 'SUPERSAAS_CREATED_ID_MISSING' }
      );
    }
    return { ...fields, ...data, id };
  }

  private async resolveAppointment(
    appointmentId: string,
    scheduleId?: string,
    form?: boolean
  ): Promise<{ scheduleId: string; booking: any }> {
    let scheduleIds = scheduleId
      ? [scheduleId]
      : (await this.listSchedules()).map(schedule => String(schedule.id ?? schedule[0]));
    for (let id of scheduleIds) {
      try {
        let response = await this.axios.get(
          `/api/bookings/${encodeURIComponent(appointmentId)}.json`,
          { params: { schedule_id: id, form: form ? 'true' : undefined } }
        );
        return { scheduleId: id, booking: response.data };
      } catch (error) {
        if (
          scheduleId ||
          !isApiErrorRecord(error) ||
          !isApiErrorRecord(error.data) ||
          Number(error.data.upstreamStatus) !== 404
        )
          throw error;
      }
    }
    throw createApiServiceError(
      'Appointment was not found in any account schedule. Call list_appointments to discover an appointment ID and provide its scheduleId.',
      { reason: 'SUPERSAAS_APPOINTMENT_NOT_FOUND', upstreamStatus: 404 }
    );
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
