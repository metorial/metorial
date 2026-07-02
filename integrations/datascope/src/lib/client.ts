import { createAxios } from 'slates';

let BASE_URL = 'https://www.mydatascope.com/api/external';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
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
    return response.data;
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
    return response.data;
  }

  async changeFormAnswer(params: {
    formName: string;
    formCode: string;
    questionName: string;
    questionValue: string;
    subformIndex?: number;
  }) {
    let response = await this.axios.post('/change_form_answer', {
      form_name: params.formName,
      form_code: params.formCode,
      question_name: params.questionName,
      question_value: params.questionValue,
      ...(params.subformIndex !== undefined ? { subform_index: params.subformIndex } : {})
    });
    return response.data;
  }

  // ─── Locations ────────────────────────────────────────────

  async getLocations() {
    let response = await this.axios.get('/locations');
    return response.data;
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
    return response.data;
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
    let response = await this.axios.post(`/locations/${locationId}`, {
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
    return response.data;
  }

  // ─── Lists / Metadata ────────────────────────────────────

  async getListElements(metadataType: string) {
    let response = await this.axios.get('/metadata_objects', {
      params: { metadata_type: metadataType }
    });
    return response.data;
  }

  async getListElement(metadataType: string, metadataId: string) {
    let response = await this.axios.get('/metadata_object', {
      params: {
        metadata_type: metadataType,
        metadata_id: metadataId
      }
    });
    return response.data;
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
    return response.data;
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
    let response = await this.axios.post(`/metadata_object/${elementId}`, {
      list_object: {
        name: element.name,
        description: element.description,
        code: element.code,
        attribute1: element.attribute1,
        attribute2: element.attribute2
      }
    });
    return response.data;
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
    return response.data;
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
    let response = await this.axios.post(`/metadata_types/${listId}`, {
      list: {
        name: list.name,
        description: list.description,
        code: list.code,
        list_type: list.listType
      }
    });
    return response.data;
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
    return response.data;
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
    return response.data;
  }

  // ─── Notifications ────────────────────────────────────────

  async getNotifications(params: { start?: string; end?: string }) {
    let response = await this.axios.get('/notifications', {
      params: {
        start: params.start,
        end: params.end
      }
    });
    return response.data;
  }

  // ─── Files ────────────────────────────────────────────────

  async getFiles(params: { start?: string; end?: string }) {
    let response = await this.axios.get('/files', {
      params: {
        start: params.start,
        end: params.end
      }
    });
    return response.data;
  }
}
