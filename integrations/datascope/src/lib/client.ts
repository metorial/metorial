import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://www.mydatascope.com/api/external';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'DataScope',
          reason: 'datascope_api_error',
          extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure)
        })
    });
  }

  private unwrap(data: unknown): unknown {
    if (
      isApiErrorRecord(data) &&
      (data.success === false ||
        data.status === 'error' ||
        data.status === 'failed' ||
        data.status === 'failure' ||
        (data.error !== undefined &&
          data.error !== null &&
          data.error !== false &&
          data.error !== ''))
    ) {
      throw buildApiServiceError(
        { response: { status: 200, data } },
        {
          providerLabel: 'DataScope',
          reason: 'datascope_api_error'
        }
      );
    }
    return data;
  }

  // ─── Answers ──────────────────────────────────────────────

  async getAnswers(params: {
    formId?: string;
    userId?: string;
    start?: string;
    end?: string;
    locationId?: string;
    dateModified?: boolean;
    limit?: number;
    offset?: number;
  }) {
    validatePagination(params.limit, params.offset, 200);
    let response = await this.axios.get('/v2/answers', {
      params: {
        form_id: params.formId,
        user_id: params.userId,
        start: params.start,
        end: params.end,
        location_id: params.locationId,
        date_modified: params.dateModified,
        limit: params.limit ?? 200,
        offset: params.offset ?? 0
      }
    });
    return this.unwrap(response.data);
  }

  async getAnswersDetailed(params: {
    formId?: string;
    userId?: string;
    start?: string;
    end?: string;
    locationId?: string;
  }) {
    let response = await this.axios.get('/answers', {
      params: {
        form_id: params.formId,
        user_id: params.userId,
        start: params.start,
        end: params.end,
        location_id: params.locationId
      }
    });
    return this.unwrap(response.data);
  }

  async changeFormAnswer(params: {
    formName: string;
    formCode: string;
    questionName: string;
    questionValue: string;
    subformIndex?: number;
  }) {
    if (
      params.subformIndex !== undefined &&
      (!Number.isInteger(params.subformIndex) || params.subformIndex < 1)
    ) {
      throw createApiServiceError('Subform index must be a whole number starting at 1.');
    }
    let response = await this.axios.post('/change_form_answer', {
      form_name: params.formName,
      form_code: params.formCode,
      question_name: params.questionName,
      question_value: params.questionValue,
      ...(params.subformIndex !== undefined ? { subform_index: params.subformIndex } : {})
    });
    let data = this.unwrap(response.data);
    if (Array.isArray(data)) {
      for (let item of data) this.unwrap(item);
    }
    return data;
  }

  // ─── Locations ────────────────────────────────────────────

  async getLocations() {
    let response = await this.axios.get('/locations');
    return this.unwrap(response.data);
  }

  async createLocation(location: {
    name: string;
    description?: string;
    code?: string;
    address?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    companyCode?: string;
    companyName?: string;
    email?: string;
  }) {
    let response = await this.axios.post('/locations', {
      location: {
        name: location.name,
        description: location.description,
        code: location.code,
        address: location.address,
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        phone: location.phone,
        company_code: location.companyCode,
        company_name: location.companyName,
        email: location.email
      }
    });
    return this.unwrap(response.data);
  }

  async updateLocation(
    locationId: string,
    location: {
      name?: string;
      description?: string;
      code?: string;
      address?: string;
      city?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      phone?: string;
      companyCode?: string;
      companyName?: string;
      email?: string;
    }
  ) {
    let response = await this.axios.post(`/locations/${encodeURIComponent(locationId)}`, {
      location: {
        name: location.name,
        description: location.description,
        code: location.code,
        address: location.address,
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        phone: location.phone,
        company_code: location.companyCode,
        company_name: location.companyName,
        email: location.email
      }
    });
    return this.unwrap(response.data);
  }

  // ─── Lists / Metadata ────────────────────────────────────

  async getListElements(metadataType: string) {
    let response = await this.axios.get('/metadata_objects', {
      params: { metadata_type: metadataType }
    });
    return this.unwrap(response.data);
  }

  async getListElement(metadataType: string, metadataId: string) {
    let response = await this.axios.get('/metadata_object', {
      params: {
        metadata_type: metadataType,
        metadata_id: metadataId
      }
    });
    return this.unwrap(response.data);
  }

  async createListElement(
    metadataType: string,
    element: {
      name: string;
      description?: string;
      code?: string;
      attribute1?: string;
      attribute2?: string;
    }
  ) {
    let response = await this.axios.post(
      '/metadata_object',
      {
        list_object: {
          name: element.name,
          description: element.description,
          code: element.code,
          attribute1: element.attribute1,
          attribute2: element.attribute2
        }
      },
      {
        params: { metadata_type: metadataType }
      }
    );
    return this.unwrap(response.data);
  }

  async updateListElement(
    elementId: string,
    element: {
      name?: string;
      description?: string;
      code?: string;
      attribute1?: string;
      attribute2?: string;
    }
  ) {
    let response = await this.axios.post(`/metadata_object/${encodeURIComponent(elementId)}`, {
      list_object: {
        name: element.name,
        description: element.description,
        code: element.code,
        attribute1: element.attribute1,
        attribute2: element.attribute2
      }
    });
    return this.unwrap(response.data);
  }

  async createList(list: {
    name: string;
    description?: string;
    code?: string;
    listType?: string;
  }) {
    let response = await this.axios.post('/metadata_types', {
      list: {
        name: list.name,
        description: list.description,
        code: list.code,
        list_type: list.listType ?? 'standard'
      }
    });
    return this.unwrap(response.data);
  }

  async updateList(
    listId: string,
    list: {
      name?: string;
      description?: string;
      code?: string;
      listType?: string;
    }
  ) {
    let response = await this.axios.post(`/metadata_types/${encodeURIComponent(listId)}`, {
      list: {
        name: list.name,
        description: list.description,
        code: list.code,
        list_type: list.listType
      }
    });
    return this.unwrap(response.data);
  }

  async bulkUpdateListElements(params: {
    metadataType: string;
    name: string;
    elements: Array<{
      code: string;
      name: string;
      description?: string;
      attribute1?: string;
      attribute2?: string;
    }>;
  }) {
    if (params.metadataType === 'locations') {
      throw createApiServiceError(
        'Use the location tools to manage locations; bulk list updates do not support locations.'
      );
    }
    let response = await this.axios.post('/metadata_objects/bulk_update', {
      metadata_type: params.metadataType,
      name: params.name,
      list_objects: params.elements.map(el => ({
        code: el.code,
        name: el.name,
        description: el.description,
        attribute1: el.attribute1,
        attribute2: el.attribute2
      }))
    });
    return this.unwrap(response.data);
  }

  // ─── Task Assignment ──────────────────────────────────────

  async assignTask(params: {
    formId: string;
    userEmail: string;
    date: string;
    locationCode?: string;
    locationName?: string;
    locationAddress?: string;
    locationPhone?: string;
    locationEmail?: string;
    companyName?: string;
    companyCode?: string;
    latitude?: number;
    longitude?: number;
    taskInstruction?: string;
    gap?: number;
    code?: string;
  }) {
    let response = await this.axios.post('/assign_task', {
      form_id: params.formId,
      user_id: params.userEmail,
      date: params.date,
      l_code: params.locationCode,
      location_name: params.locationName,
      location_address: params.locationAddress,
      l_phone: params.locationPhone,
      l_email: params.locationEmail,
      c_name: params.companyName,
      c_code: params.companyCode,
      latitude: params.latitude,
      longitude: params.longitude,
      task_instruction: params.taskInstruction,
      gap: params.gap,
      code: params.code
    });
    return this.unwrap(response.data);
  }

  async getAnswerStatuses() {
    let response = await this.axios.get('/list_states');
    return expectArray(this.unwrap(response.data), 'answer statuses');
  }

  async changeAnswerStatus(params: { formName: string; formCode: string; statusId: number }) {
    if (!Number.isInteger(params.statusId) || params.statusId < 1) {
      throw createApiServiceError(
        'Status ID must be a positive whole number from list_answer_statuses.'
      );
    }
    let response = await this.axios.post('/change_state', {
      form_name: params.formName,
      form_code: params.formCode,
      form_state_id: params.statusId
    });
    return this.unwrap(response.data);
  }

  async getTaskAssignment(taskId: string) {
    let response = await this.axios.get(`/task_assigns/${encodeURIComponent(taskId)}`);
    return this.unwrap(response.data);
  }

  async listTaskAssignments(params: {
    start?: string;
    end?: string;
    status?: string;
    locationId?: string;
    userEmail?: string;
    limit?: number;
    offset?: number;
  }) {
    validatePagination(params.limit, params.offset, 300);
    let response = await this.axios.get('/task_assigns', {
      params: {
        start: params.start,
        end: params.end,
        status: params.status,
        location_id: params.locationId,
        user_email: params.userEmail,
        limit: params.limit,
        offset: params.offset
      }
    });
    let data = this.unwrap(response.data);
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError('DataScope returned an invalid task assignment response.');
    }
    let tasks = expectArray(data.task_assigns, 'task assignments');
    return { tasks, raw: data };
  }

  // ─── Notifications ────────────────────────────────────────

  async getNotifications(params: { start?: string; end?: string }) {
    let response = await this.axios.get('/notifications', {
      params: {
        start: params.start,
        end: params.end
      }
    });
    return this.unwrap(response.data);
  }

  // ─── Files ────────────────────────────────────────────────

  async getFiles(params: { start?: string; end?: string }) {
    let response = await this.axios.get('/files', {
      params: {
        start: params.start,
        end: params.end
      }
    });
    return this.unwrap(response.data);
  }
}

export function expectArray(data: unknown, resource: string): unknown[] {
  if (!Array.isArray(data)) {
    throw createApiServiceError(
      `DataScope returned an invalid ${resource} response; expected a list.`
    );
  }
  return data;
}

function validatePagination(
  limit: number | undefined,
  offset: number | undefined,
  maximum: number
) {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > maximum)) {
    throw createApiServiceError(`Limit must be a whole number from 1 to ${maximum}.`);
  }
  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
    throw createApiServiceError('Offset must be a nonnegative whole number.');
  }
}
