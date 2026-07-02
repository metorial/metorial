import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://exist.io/api/2'
});

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface UserProfile {
  username: string;
  first_name: string;
  last_name: string;
  avatar: string;
  timezone: string;
  imperial_distance: boolean;
  imperial_weight: boolean;
  imperial_energy: boolean;
  imperial_liquid: boolean;
  imperial_temperature: boolean;
  trial: boolean;
  delinquent: boolean;
}

export interface AttributeTemplate {
  name: string;
  label: string;
  group: {
    name: string;
    label: string;
    priority: number;
  };
  priority: number;
  value_type: number;
  value_type_description: string;
}

export interface AttributeValue {
  date: string;
  value: number | string | null;
}

export interface Attribute {
  template: string;
  name: string;
  label: string;
  group: {
    name: string;
    label: string;
    priority: number;
  };
  priority: number;
  manual: boolean;
  active: boolean;
  value_type: number;
  value_type_description: string;
  service: {
    name: string;
    label: string;
  } | null;
  values?: AttributeValue[];
}

export interface Correlation {
  date: string;
  period: number;
  attribute: string;
  attribute2: string;
  value: number;
  p: number;
  percentage: number;
  stars: number;
  second_person: string;
  second_person_elements: string[];
  attribute_category: string | null;
  strength_description: string;
  stars_description: string;
  description: string | null;
}

export interface Insight {
  created: string;
  target_date: string;
  type: {
    name: string;
    period: number;
    priority: number;
    attribute: {
      name: string;
      label: string;
      group: {
        name: string;
        label: string;
      };
    };
  };
  html: string;
  text: string;
}

export interface Average {
  attribute: string;
  date: string;
  overall: number;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface WriteResult<T = Record<string, unknown>> {
  success: T[];
  failed: Array<T & { error: string; error_code: string }>;
}

export class Client {
  private token: string;
  private authType: string;

  constructor(config: { token: string; authType?: string }) {
    this.token = config.token;
    this.authType = config.authType || 'oauth';
  }

  private get headers() {
    if (this.authType === 'simple_token') {
      return { Authorization: `Token ${this.token}` };
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  async getProfile(): Promise<UserProfile> {
    let response = await http.get('/accounts/profile/', {
      headers: this.headers
    });
    return response.data;
  }

  async getAttributes(params?: {
    groups?: string;
    attributes?: string;
    limit?: number;
    page?: number;
    owned?: boolean;
    manual?: boolean;
    includeInactive?: boolean;
  }): Promise<PaginatedResponse<Attribute>> {
    let response = await http.get('/attributes/', {
      headers: this.headers,
      params: {
        groups: params?.groups,
        attributes: params?.attributes,
        limit: params?.limit,
        page: params?.page,
        owned: params?.owned,
        manual: params?.manual,
        include_inactive: params?.includeInactive
      }
    });
    return response.data;
  }

  async getAttributesWithValues(params?: {
    groups?: string;
    attributes?: string;
    days?: number;
    dateMax?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Attribute>> {
    let response = await http.get('/attributes/with-values/', {
      headers: this.headers,
      params: {
        groups: params?.groups,
        attributes: params?.attributes,
        days: params?.days,
        date_max: params?.dateMax,
        limit: params?.limit,
        page: params?.page
      }
    });
    return response.data;
  }

  async getAttributeValues(params: {
    attribute: string;
    limit?: number;
    page?: number;
    dateMin?: string;
    dateMax?: string;
  }): Promise<PaginatedResponse<AttributeValue>> {
    let response = await http.get('/attributes/values/', {
      headers: this.headers,
      params: {
        attribute: params.attribute,
        limit: params.limit,
        page: params.page,
        date_min: params.dateMin,
        date_max: params.dateMax
      }
    });
    return response.data;
  }

  async getAttributeTemplates(params?: {
    groups?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<AttributeTemplate>> {
    let response = await http.get('/attributes/templates/', {
      headers: this.headers,
      params: {
        groups: params?.groups,
        limit: params?.limit,
        page: params?.page
      }
    });
    return response.data;
  }

  async acquireAttributes(
    attributes: Array<{ template?: string; name?: string; manual?: boolean }>
  ): Promise<WriteResult> {
    let response = await http.post('/attributes/acquire/', attributes, {
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      params: { success_objects: 1 }
    });
    return response.data;
  }

  async releaseAttributes(attributes: Array<{ name: string }>): Promise<WriteResult> {
    let response = await http.post('/attributes/release/', attributes, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getOwnedAttributes(params?: {
    groups?: string;
    attributes?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Attribute>> {
    let response = await http.get('/attributes/owned/', {
      headers: this.headers,
      params: {
        groups: params?.groups,
        attributes: params?.attributes,
        limit: params?.limit,
        page: params?.page
      }
    });
    return response.data;
  }

  async createAttributes(
    attributes: Array<{
      template?: string;
      label?: string;
      group?: string;
      valueType?: number;
      manual?: boolean;
    }>
  ): Promise<WriteResult> {
    let payload = attributes.map(attr => {
      if (attr.template) {
        return { template: attr.template, manual: attr.manual };
      }
      return {
        label: attr.label,
        group: attr.group,
        value_type: attr.valueType,
        manual: attr.manual
      };
    });
    let response = await http.post('/attributes/create/', payload, {
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      params: { success_objects: 1 }
    });
    return response.data;
  }

  async updateAttributeValues(
    updates: Array<{ name: string; date: string; value: number | string }>
  ): Promise<WriteResult> {
    let response = await http.post('/attributes/update/', updates, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async incrementAttributeValues(
    increments: Array<{ name: string; date?: string; value: number }>
  ): Promise<WriteResult> {
    let response = await http.post('/attributes/increment/', increments, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getCorrelations(params?: {
    attribute?: string;
    limit?: number;
    page?: number;
    strong?: boolean;
    confident?: boolean;
  }): Promise<PaginatedResponse<Correlation>> {
    let response = await http.get('/correlations/', {
      headers: this.headers,
      params: {
        attribute: params?.attribute,
        limit: params?.limit,
        page: params?.page,
        strong: params?.strong,
        confident: params?.confident
      }
    });
    return response.data;
  }

  async getCorrelationCombo(params: {
    attribute: string;
    attribute2: string;
  }): Promise<Correlation> {
    let response = await http.get('/correlations/combo/', {
      headers: this.headers,
      params: {
        attribute: params.attribute,
        attribute2: params.attribute2
      }
    });
    return response.data;
  }

  async getInsights(params?: {
    limit?: number;
    page?: number;
    dateMin?: string;
    dateMax?: string;
    priority?: number;
  }): Promise<PaginatedResponse<Insight>> {
    let response = await http.get('/insights/', {
      headers: this.headers,
      params: {
        limit: params?.limit,
        page: params?.page,
        date_min: params?.dateMin,
        date_max: params?.dateMax,
        priority: params?.priority
      }
    });
    return response.data;
  }

  async getAverages(params?: {
    groups?: string;
    attributes?: string;
    limit?: number;
    page?: number;
    dateMin?: string;
    dateMax?: string;
    includeHistorical?: boolean;
  }): Promise<PaginatedResponse<Average>> {
    let response = await http.get('/averages/', {
      headers: this.headers,
      params: {
        groups: params?.groups,
        attributes: params?.attributes,
        limit: params?.limit,
        page: params?.page,
        date_min: params?.dateMin,
        date_max: params?.dateMax,
        include_historical: params?.includeHistorical
      }
    });
    return response.data;
  }
}
