import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; apiHost: string }) {
    let apiHost = config.apiHost
      .trim()
      .replace(/^https:\/\//, '')
      .replace(/\/$/, '');
    if (!['api.whautomate.com', 'api.in.whautomate.com'].includes(apiHost)) {
      throw createApiServiceError(
        'Use the Global or India API host shown in your Whautomate REST API settings.'
      );
    }
    if (!config.token.trim()) throw createApiServiceError('A Whautomate API key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${apiHost}/v1`,
      authHeader: { name: 'x-api-key', value: config.token },
      timeout: 60_000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Whautomate',
          reason: 'whautomate_api_error'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (
        response.config.method === 'get' &&
        (!response.data || typeof response.data !== 'object')
      ) {
        throw createApiServiceError(
          'Whautomate returned an invalid response instead of the requested resource.'
        );
      }
      if (response.data?.success === false || response.data?.error) {
        throw createApiServiceError(
          'Whautomate reported that the operation failed. Check the resource and request fields before retrying.'
        );
      }
      return response;
    });
  }

  private query(params: Record<string, unknown> = {}) {
    let { search, pageSize, fromDate, toDate, ...rest } = params;
    for (let [key, value] of Object.entries({ page: rest.page, pageSize })) {
      if (
        value !== undefined &&
        (typeof value !== 'number' || !Number.isInteger(value) || value < 1)
      ) {
        throw createApiServiceError(`${key} must be a positive whole number.`);
      }
    }
    return pickDefined({
      ...rest,
      searchText: search,
      limit: pageSize,
      startDate: fromDate,
      endDate: toDate
    });
  }

  private clientPayload(data: Record<string, any>, current: Record<string, any> = {}) {
    let {
      firstName,
      lastName,
      dateOfBirth,
      locationId,
      emergencyContactName,
      emergencyContactPhone,
      ...rest
    } = pickDefined(data);
    if (
      rest.fullName === undefined &&
      Object.keys(current).length > 0 &&
      (firstName === undefined) !== (lastName === undefined)
    ) {
      throw createApiServiceError(
        'To update a client name, provide fullName or both firstName and lastName. The current full name cannot be split into name components reliably.'
      );
    }
    let fullName =
      rest.fullName ?? ([firstName, lastName].filter(Boolean).join(' ') || undefined);
    let payload = pickDefined({
      contactType: current.contactType,
      countryCode: current.countryCode,
      phone: current.phone,
      email: current.email,
      registrationDate: current.registrationDate,
      addressType: current.addressType,
      address: current.address,
      gender: current.gender,
      maritalStatus: current.maritalStatus,
      tags: current.tags,
      notes: current.notes,
      referralSource: current.referralSource,
      primaryStaff: current.primaryStaff,
      customFields: current.customFields,
      photoUrl: current.photo,
      emergencyRelationType: current.emergencyRelationType,
      emergencyCountryCode: current.emergencyCountryCode,
      identificationNumber: current.identificationNumber,
      ...rest,
      fullName: fullName ?? current.fullName,
      dob: dateOfBirth ?? current.dob,
      primaryLocation: locationId ? { id: locationId } : current.primaryLocation,
      emergencyName: emergencyContactName ?? current.emergencyName,
      emergencyPhone: emergencyContactPhone ?? current.emergencyPhone
    });
    if (!payload.fullName || !payload.countryCode || !payload.phone) {
      throw createApiServiceError(
        'fullName (or firstName/lastName), countryCode and phone are required to create a client.'
      );
    }
    return payload;
  }

  private contactPayload(data: Record<string, any>, current: Record<string, any> = {}) {
    let { locationId, ...rest } = pickDefined(data);
    let payload = pickDefined({
      name: current.name,
      phoneNumber: current.phoneNumber,
      stage: current.stage,
      notes: current.notes,
      customFields: current.customFields,
      tags: current.tags,
      ...rest,
      location: locationId ? { id: locationId } : current.location
    });
    if (!payload.name || !payload.phoneNumber || !payload.location?.id) {
      throw createApiServiceError(
        'name, phoneNumber and locationId are required to create a contact. Call list_locations to find a location.'
      );
    }
    return payload;
  }

  private classPayload(data: Record<string, any>, current: Record<string, any> = {}) {
    let { locationId, staffId, serviceId, ...rest } = pickDefined(data);
    let payload = pickDefined({
      date: current.date,
      time: current.time,
      timezone: current.timezone,
      numberOfParticipants: current.numberOfParticipants,
      ...rest,
      location: locationId ? { id: locationId } : current.location,
      staff: staffId ? { id: staffId } : current.staff,
      service: serviceId ? { id: serviceId } : current.service
    });
    if (
      !payload.location?.id ||
      !payload.staff?.id ||
      !payload.service?.id ||
      !payload.date ||
      !payload.time
    ) {
      throw createApiServiceError(
        'locationId, staffId, serviceId, date and time are required to create a class.'
      );
    }
    if (
      payload.numberOfParticipants !== undefined &&
      (!Number.isInteger(payload.numberOfParticipants) || payload.numberOfParticipants < 1)
    ) {
      throw createApiServiceError('numberOfParticipants must be a positive whole number.');
    }
    return payload;
  }

  // ---- Clients ----

  async searchClients(params?: {
    search?: string;
    locationId?: string;
    tags?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axios.get('/clients', {
      params: this.query({
        ...params,
        locationId: undefined,
        primaryLocationId: params?.locationId
      })
    });
    return res.data;
  }

  async getClient(clientId: string) {
    let res = await this.axios.get(`/clients/${encodeURIComponent(clientId)}`);
    return res.data;
  }

  async createClient(data: Record<string, any>) {
    let res = await this.axios.post('/clients', this.clientPayload(data));
    return res.data;
  }

  async updateClient(clientId: string, data: Record<string, any>) {
    let res = await this.axios.put(
      `/clients/${encodeURIComponent(clientId)}`,
      this.clientPayload(data, await this.getClient(clientId))
    );
    return res.data;
  }

  async deleteClient(clientId: string) {
    let res = await this.axios.delete(`/clients/${encodeURIComponent(clientId)}`);
    return res.data;
  }

  async addClientTags(clientId: string, tags: string[]) {
    let res = await this.axios.post(`/clients/${encodeURIComponent(clientId)}/tags/add`, {
      tags
    });
    return res.data;
  }

  async removeClientTags(clientId: string, tags: string[]) {
    let res = await this.axios.post(`/clients/${encodeURIComponent(clientId)}/tags/remove`, {
      tags
    });
    return res.data;
  }

  // ---- Client Tags ----

  async listClientTags(params?: { search?: string }) {
    let res = await this.axios.get('/clientTags', { params: this.query(params) });
    return res.data;
  }

  async createClientTag(data: { name: string }) {
    let res = await this.axios.post('/clientTags', data);
    return res.data;
  }

  async getClientTag(tagId: string) {
    let res = await this.axios.get(`/clientTags/${encodeURIComponent(tagId)}`);
    return res.data;
  }

  async deleteClientTag(tagId: string) {
    let res = await this.axios.delete(`/clientTags/${encodeURIComponent(tagId)}`);
    return res.data;
  }

  // ---- Contacts ----

  async searchContacts(params?: {
    search?: string;
    locationId?: string;
    tags?: string;
    stage?: string;
    channel?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axios.get('/contacts', { params: this.query(params) });
    return res.data;
  }

  async getContact(contactId: string) {
    let res = await this.axios.get(`/contacts/${encodeURIComponent(contactId)}`);
    return res.data;
  }

  async createContact(data: Record<string, any>) {
    let res = await this.axios.post('/contacts', this.contactPayload(data));
    return res.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let res = await this.axios.put(
      `/contacts/${encodeURIComponent(contactId)}`,
      this.contactPayload(data, await this.getContact(contactId))
    );
    return res.data;
  }

  async deleteContact(contactId: string) {
    let res = await this.axios.delete(`/contacts/${encodeURIComponent(contactId)}`);
    return res.data;
  }

  async addContactTags(contactId: string, tags: string[]) {
    let res = await this.axios.post(`/contacts/${encodeURIComponent(contactId)}/tags/add`, {
      tags
    });
    return res.data;
  }

  async removeContactTags(contactId: string, tags: string[]) {
    let res = await this.axios.post(`/contacts/${encodeURIComponent(contactId)}/tags/remove`, {
      tags
    });
    return res.data;
  }

  // ---- Contact Tags ----

  async listContactTags(params?: { search?: string }) {
    let res = await this.axios.get('/contactTags', { params: this.query(params) });
    return res.data;
  }

  async createContactTag(data: { name: string }) {
    let res = await this.axios.post('/contactTags', data);
    return res.data;
  }

  async getContactTag(tagId: string) {
    let res = await this.axios.get(`/contactTags/${encodeURIComponent(tagId)}`);
    return res.data;
  }

  async deleteContactTag(tagId: string) {
    let res = await this.axios.delete(`/contactTags/${encodeURIComponent(tagId)}`);
    return res.data;
  }

  // ---- Messages ----

  async getMessages(
    contactId: string,
    params?: { page?: number; pageSize?: number; search?: string }
  ) {
    let res = await this.axios.get(`/messages/${encodeURIComponent(contactId)}`, {
      params: this.query(params)
    });
    return res.data;
  }

  async sendMessage(channel: string, messageType: string, data: Record<string, any>) {
    let res = await this.axios.post(`/messages/${channel}/${messageType}`, data);
    return res.data;
  }

  // ---- Segments ----

  async listSegments(params?: {
    search?: string;
    locationId?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axios.get('/segments', { params: this.query(params) });
    return res.data;
  }

  async getSegment(segmentId: string) {
    let res = await this.axios.get(`/segments/${encodeURIComponent(segmentId)}`);
    return res.data;
  }

  async createSegment(data: Record<string, any>) {
    let res = await this.axios.post('/segments', data);
    return res.data;
  }

  async deleteSegment(segmentId: string) {
    let res = await this.axios.delete(`/segments/${encodeURIComponent(segmentId)}`);
    return res.data;
  }

  private broadcastPayload(data: Record<string, any>, current: Record<string, any> = {}) {
    let {
      templateName,
      templateLanguage,
      segmentIds,
      mediaUrl,
      locationId,
      targetClassId,
      retargetBroadcastId,
      ...fields
    } = pickDefined(data);
    let payload = pickDefined({
      name: current.name,
      type: current.type,
      status: current.status,
      targetClassStatus: current.targetClassStatus,
      retargetEngagementType: current.retargetEngagementType,
      scheduleDateTime: current.scheduleDateTime,
      headerTextParameters: current.headerTextParameters,
      bodyTextParameters: current.bodyTextParameters,
      buttonUrlParameters: current.buttonUrlParameters,
      locationParameters: current.locationParameters,
      flowParameters: current.flowParameters,
      ...fields,
      location: locationId ? { id: locationId } : current.location,
      template:
        templateName || templateLanguage
          ? pickDefined({
              name: templateName ?? current.template?.name,
              language: templateLanguage ?? current.template?.language
            })
          : current.template,
      segments: segmentIds ? segmentIds.map((id: string) => ({ id })) : current.segments,
      headerMediaUrl: mediaUrl ?? fields.headerMediaUrl ?? current.headerMediaUrl,
      targetClass: targetClassId ? { id: targetClassId } : current.targetClass,
      retargetBroadcast: retargetBroadcastId
        ? { id: retargetBroadcastId }
        : current.retargetBroadcast
    });
    if (!payload.name || !payload.type || !payload.location?.id) {
      throw createApiServiceError(
        'name, type and locationId from list_locations are required to create a broadcast.'
      );
    }
    if (payload.type === 'class' && !payload.targetClass?.id)
      throw createApiServiceError('targetClassId is required for a class broadcast.');
    if (payload.type === 'retarget' && !payload.retargetBroadcast?.id)
      throw createApiServiceError('retargetBroadcastId is required for a retarget broadcast.');
    return payload;
  }

  // ---- Broadcasts ----

  async listBroadcasts(params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get('/broadcasts', { params: this.query(params) });
    return res.data;
  }

  async getBroadcast(broadcastId: string) {
    let res = await this.axios.get(`/broadcasts/${encodeURIComponent(broadcastId)}`);
    return res.data;
  }

  async createBroadcast(data: Record<string, any>) {
    let res = await this.axios.post('/broadcasts', this.broadcastPayload(data));
    return res.data;
  }

  async updateBroadcast(broadcastId: string, data: Record<string, any>) {
    let res = await this.axios.put(
      `/broadcasts/${encodeURIComponent(broadcastId)}`,
      this.broadcastPayload(data, await this.getBroadcast(broadcastId))
    );
    return res.data;
  }

  async deleteBroadcast(broadcastId: string) {
    let res = await this.axios.delete(`/broadcasts/${encodeURIComponent(broadcastId)}`);
    return res.data;
  }

  async getBroadcastLogs(broadcastId: string, params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get(`/broadcasts/${encodeURIComponent(broadcastId)}/logs`, {
      params: this.query(params)
    });
    return res.data;
  }

  // ---- Appointments ----

  async getAppointmentSlots(params: {
    serviceId: string;
    staffId?: string;
    locationId?: string;
    fromDate: string;
    toDate: string;
    timezone?: string;
  }) {
    let start = new Date(`${params.fromDate}T00:00:00.000Z`);
    let end = new Date(`${params.toDate}T00:00:00.000Z`);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      start.toISOString().slice(0, 10) !== params.fromDate ||
      end.toISOString().slice(0, 10) !== params.toDate ||
      end < start ||
      (end.getTime() - start.getTime()) / 86_400_000 >= 31
    ) {
      throw createApiServiceError(
        'Use valid YYYY-MM-DD dates in an ascending range of at most 31 days.'
      );
    }
    let results: Record<string, any>[] = [];
    for (let day = start.getTime(); day <= end.getTime(); day += 86_400_000) {
      let res = await this.axios.get('/appointments/slots', {
        params: pickDefined({
          serviceId: params.serviceId,
          staffId: params.staffId,
          locationId: params.locationId,
          timezone: params.timezone,
          date: new Date(day).toISOString().slice(0, 10)
        })
      });
      if (!Array.isArray(res.data))
        throw createApiServiceError(
          'Whautomate returned an invalid appointment-slots response.'
        );
      results.push(...res.data);
    }
    return results;
  }

  async searchAppointments(params?: {
    fromDate?: string;
    toDate?: string;
    clientId?: string;
    serviceId?: string;
    staffId?: string;
    locationId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axios.get('/appointments', { params: this.query(params) });
    return res.data;
  }

  async getAppointment(appointmentId: string) {
    let res = await this.axios.get(`/appointments/${encodeURIComponent(appointmentId)}`);
    return res.data;
  }

  async createAppointment(data: Record<string, any>) {
    let { clientId, serviceId, staffId, locationId, ...fields } = pickDefined(data);
    if (!clientId || !serviceId || !locationId || !fields.date || !fields.time) {
      throw createApiServiceError(
        'clientId, serviceId, locationId, date and time are required to book an appointment.'
      );
    }
    let res = await this.axios.post(
      '/appointments',
      pickDefined({
        ...fields,
        client: { id: clientId },
        service: { id: serviceId },
        location: { id: locationId },
        staff: staffId ? { id: staffId } : undefined
      })
    );
    return res.data;
  }

  async rescheduleAppointment(data: {
    appointmentId: string;
    date: string;
    time: string;
    staffId?: string;
    locationId?: string;
    timezone?: string;
  }) {
    let location = data.locationId
      ? { id: data.locationId }
      : (await this.getAppointment(data.appointmentId)).location;
    if (!location?.id)
      throw createApiServiceError(
        'The appointment has no location. Provide locationId from list_locations.'
      );
    let res = await this.axios.post(
      '/appointments/reschedule',
      pickDefined({
        appointmentId: data.appointmentId,
        date: data.date,
        time: data.time,
        staffId: data.staffId,
        timezone: data.timezone,
        location
      })
    );
    return res.data;
  }

  async cancelAppointment(data: {
    appointmentId: string;
    reason?: string;
    locationId?: string;
  }) {
    let location = data.locationId
      ? { id: data.locationId }
      : (await this.getAppointment(data.appointmentId)).location;
    if (!location?.id)
      throw createApiServiceError(
        'The appointment has no location. Provide locationId from list_locations.'
      );
    let res = await this.axios.post(
      '/appointments/cancel',
      pickDefined({
        appointmentId: data.appointmentId,
        location,
        cancellationReason: data.reason
      })
    );
    return res.data;
  }

  // ---- Classes ----

  async searchClasses(params?: {
    fromDate?: string;
    toDate?: string;
    locationId?: string;
    staffId?: string;
    serviceId?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axios.get('/classes', { params: this.query(params) });
    return res.data;
  }

  async getClass(classId: string) {
    let res = await this.axios.get(`/classes/${encodeURIComponent(classId)}`);
    return res.data;
  }

  async createClass(data: Record<string, any>) {
    let res = await this.axios.post('/classes', this.classPayload(data));
    return res.data;
  }

  async updateClass(classId: string, data: Record<string, any>) {
    let res = await this.axios.put(
      `/classes/${encodeURIComponent(classId)}`,
      this.classPayload(data, await this.getClass(classId))
    );
    return res.data;
  }

  async deleteClass(classId: string) {
    let res = await this.axios.delete(`/classes/${encodeURIComponent(classId)}`);
    return res.data;
  }

  async getClassParticipants(classId: string) {
    let res = await this.axios.get(`/classes/${encodeURIComponent(classId)}/participants`);
    return res.data;
  }

  async addClassParticipant(classId: string, data: { clientId: string; status?: string }) {
    let res = await this.axios.post(
      `/classes/${encodeURIComponent(classId)}/participants/add`,
      pickDefined({ client: { id: data.clientId }, status: data.status ?? 'BOOKED' })
    );
    return res.data;
  }

  async cancelClassParticipant(
    classId: string,
    data: { clientId?: string; participantId?: string; reason?: string }
  ) {
    let participantId = data.participantId;
    if (!participantId && data.clientId) {
      let participants = await this.getClassParticipants(classId);
      if (!Array.isArray(participants))
        throw createApiServiceError(
          'Whautomate returned an invalid class-participants response.'
        );
      let matches = participants.filter(
        participant => participant.client?.id === data.clientId
      );
      if (matches.length !== 1 || !matches[0]?.id) {
        throw createApiServiceError(
          'Could not identify one class participant for this client. List the class participants and provide participantId.'
        );
      }
      participantId = matches[0].id;
    }
    if (!participantId)
      throw createApiServiceError(
        'participantId or clientId is required to cancel a class participant.'
      );
    let res = await this.axios.post(
      `/classes/${encodeURIComponent(classId)}/participants/cancel`,
      pickDefined({
        participantId,
        cancellationReason: data.reason
      })
    );
    return res.data;
  }

  async getClientClassBookings(
    clientId: string,
    params?: { page?: number; pageSize?: number }
  ) {
    let res = await this.axios.get(
      `/classes/clients/${encodeURIComponent(clientId)}/bookings`,
      { params: this.query(params) }
    );
    return res.data;
  }

  // ---- Services ----

  async listServices(params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get('/services', { params: this.query(params) });
    return res.data;
  }

  async getService(serviceId: string) {
    let res = await this.axios.get(`/services/${encodeURIComponent(serviceId)}`);
    return res.data;
  }

  async createService(data: Record<string, any>) {
    let res = await this.axios.post('/services', data);
    return res.data;
  }

  async updateService(serviceId: string, data: Record<string, any>) {
    let res = await this.axios.put(`/services/${encodeURIComponent(serviceId)}`, data);
    return res.data;
  }

  // ---- Service Categories ----

  async listServiceCategories(params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get('/serviceCategories', { params: this.query(params) });
    return res.data;
  }

  async getServiceCategory(categoryId: string) {
    let res = await this.axios.get(`/serviceCategories/${encodeURIComponent(categoryId)}`);
    return res.data;
  }

  async createServiceCategory(data: Record<string, any>) {
    let { locationId, ...fields } = pickDefined(data);
    if (!fields.name || !locationId)
      throw createApiServiceError(
        'name and locationId from list_locations are required to create a service category.'
      );
    let res = await this.axios.post('/serviceCategories', {
      ...fields,
      location: { id: locationId }
    });
    return res.data;
  }

  async deleteServiceCategory(categoryId: string) {
    let res = await this.axios.delete(`/serviceCategories/${encodeURIComponent(categoryId)}`);
    return res.data;
  }

  // ---- Staff ----

  async listStaff(params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get('/staffs', { params: this.query(params) });
    return res.data;
  }

  async getStaff(staffId: string) {
    let res = await this.axios.get(`/staffs/${encodeURIComponent(staffId)}`);
    return res.data;
  }

  async getStaffAvailabilityBlocks(
    staffId: string,
    params?: { fromDate?: string; toDate?: string }
  ) {
    let res = await this.axios.get(
      `/staffs/${encodeURIComponent(staffId)}/availabilityBlocks`,
      { params: this.query(params) }
    );
    return res.data;
  }

  async createStaffAvailabilityBlock(staffId: string, data: Record<string, any>) {
    let { startDate, endDate, ...fields } = pickDefined(data);
    if ((!fields.date || !fields.slots?.length) && startDate && endDate) {
      let start = new Date(startDate),
        end = new Date(endDate);
      if (
        !/(Z|[+-]\d{2}:\d{2})$/.test(startDate) ||
        !/(Z|[+-]\d{2}:\d{2})$/.test(endDate) ||
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        end <= start ||
        start.toISOString().slice(0, 10) !== end.toISOString().slice(0, 10)
      ) {
        throw createApiServiceError(
          'Legacy block datetimes must include a timezone and describe an ascending interval on one UTC day. Alternatively provide blockDate, blockSlots and timezone.'
        );
      }
      fields.date = start.toISOString().slice(0, 10);
      fields.timezone = 'UTC';
      fields.slots = [
        {
          startTime: start.toISOString().slice(11, 16),
          endTime: end.toISOString().slice(11, 16),
          startTimeUTC: start.toISOString(),
          endTimeUTC: end.toISOString()
        }
      ];
    }
    if (!fields.date || !fields.slots?.length)
      throw createApiServiceError(
        'blockDate and nonempty blockSlots are required to block staff time.'
      );
    let res = await this.axios.post(
      `/staffs/${encodeURIComponent(staffId)}/availabilityBlocks`,
      { ...fields, staff: { id: staffId } }
    );
    return res.data;
  }

  async getStaffAvailabilityBlock(staffId: string, blockId: string) {
    let res = await this.axios.get(
      `/staffs/${encodeURIComponent(staffId)}/availabilityBlocks/${encodeURIComponent(blockId)}`
    );
    return res.data;
  }

  async deleteStaffAvailabilityBlock(staffId: string, blockId: string) {
    let res = await this.axios.delete(
      `/staffs/${encodeURIComponent(staffId)}/availabilityBlocks/${encodeURIComponent(blockId)}`
    );
    return res.data;
  }

  // ---- Locations ----

  async listLocations() {
    let res = await this.axios.get('/locations');
    return res.data;
  }

  async getLocation(locationId: string) {
    let res = await this.axios.get(`/locations/${encodeURIComponent(locationId)}`);
    return res.data;
  }

  // ---- Webhooks ----

  async listWebhooks() {
    let res = await this.axios.get('/webhooks');
    return res.data;
  }

  async getWebhook(webhookId: string) {
    let res = await this.axios.get(`/webhooks/${webhookId}`);
    return res.data;
  }

  async createWebhook(data: {
    serverUrl: string;
    eventTypes: string[];
    customHeaders?: Record<string, string>;
    isActive?: boolean;
  }) {
    let res = await this.axios.post('/webhooks', data);
    return res.data;
  }

  async updateWebhook(webhookId: string, data: Record<string, any>) {
    let res = await this.axios.put(`/webhooks/${webhookId}`, data);
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }
}
