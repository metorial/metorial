import { createAxios } from 'slates';

let BASE_URL = 'https://api.endorsal.io/v1';

export interface EndorsalContact {
  _id: string;
  email?: string;
  phone?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  externalID?: string;
  importedFrom?: string;
  avatar?: string;
  location?: string;
  position?: string;
  company?: string;
  website?: string;
  property?: string;
  customAttributes?: Record<string, unknown>;
  activity?: Record<string, unknown>;
  archived?: boolean;
  added?: number;
  updated?: number;
}

export interface EndorsalTestimonial {
  _id: string;
  name?: string;
  comments?: string;
  property?: string;
  rating?: number;
  avatar?: string;
  email?: string;
  location?: string;
  position?: string;
  company?: string;
  approved?: number;
  featured?: number;
  added?: number;
  updated?: number;
  tags?: string[];
  source?: string;
}

export interface EndorsalCampaign {
  _id: string;
  name?: string;
  property?: string;
  enabled?: boolean;
  stats?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  created?: number;
  updated?: number;
}

export interface EndorsalWidget {
  _id: string;
  name?: string;
  property?: string;
  type?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  created?: number;
  updated?: number;
}

export interface EndorsalListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Contacts ---

  async listContacts(params?: {
    limit?: number;
    page?: number;
  }): Promise<EndorsalListResponse<EndorsalContact>> {
    let response = await this.axios.get('/contacts', { params });
    return response.data;
  }

  async getContact(contactId: string): Promise<EndorsalContact> {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(
    data: {
      email?: string;
      phone?: string;
      name?: string;
      externalID?: string;
      importedFrom?: string;
      avatar?: string;
      location?: string;
      position?: string;
      company?: string;
      website?: string;
      propertyID?: string;
      customAttributes?: Record<string, unknown>;
    },
    params?: { campaignID?: string }
  ): Promise<EndorsalContact> {
    let response = await this.axios.post('/contacts', data, { params });
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      avatar?: string;
      location?: string;
      position?: string;
      company?: string;
      website?: string;
      customAttributes?: Record<string, unknown>;
    }
  ): Promise<EndorsalContact> {
    let response = await this.axios.patch(`/contacts/${contactId}`, data);
    return response.data;
  }

  async archiveContact(contactId: string): Promise<EndorsalContact> {
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data;
  }

  // --- Testimonials ---

  async listTestimonials(params?: {
    limit?: number;
    page?: number;
  }): Promise<EndorsalListResponse<EndorsalTestimonial>> {
    let response = await this.axios.get('/testimonials', { params });
    return response.data;
  }

  async getTestimonial(testimonialId: string): Promise<EndorsalTestimonial> {
    let response = await this.axios.get(`/testimonials/${testimonialId}`);
    return response.data;
  }

  async createTestimonial(data: {
    name: string;
    comments: string;
    propertyID: string;
    rating?: number;
    avatar?: string;
    email?: string;
    location?: string;
    position?: string;
    company?: string;
    approved?: number;
    featured?: number;
    added?: number;
  }): Promise<EndorsalTestimonial> {
    let response = await this.axios.post('/testimonials', data);
    return response.data;
  }

  async updateTestimonial(
    testimonialId: string,
    data: {
      name?: string;
      comments?: string;
      rating?: number;
      avatar?: string;
      email?: string;
      location?: string;
      position?: string;
      company?: string;
      approved?: number;
      featured?: number;
    }
  ): Promise<EndorsalTestimonial> {
    let response = await this.axios.patch(`/testimonials/${testimonialId}`, data);
    return response.data;
  }

  async deleteTestimonial(testimonialId: string): Promise<void> {
    await this.axios.delete(`/testimonials/${testimonialId}`);
  }

  async getTestimonialsForContact(
    contactId: string
  ): Promise<EndorsalListResponse<EndorsalTestimonial>> {
    let response = await this.axios.get(`/contacts/${contactId}/testimonials`);
    return response.data;
  }

  async getTestimonialsForTag(
    tagId: string
  ): Promise<EndorsalListResponse<EndorsalTestimonial>> {
    let response = await this.axios.get(`/tags/${tagId}/testimonials`);
    return response.data;
  }

  // --- AutoRequest Campaigns ---

  async listCampaigns(params?: {
    limit?: number;
    page?: number;
  }): Promise<EndorsalListResponse<EndorsalCampaign>> {
    let response = await this.axios.get('/autorequests/campaigns', { params });
    return response.data;
  }

  async getCampaign(campaignId: string): Promise<EndorsalCampaign> {
    let response = await this.axios.get(`/autorequests/campaigns/${campaignId}`);
    return response.data;
  }

  // --- Widgets ---

  async listWidgets(params?: {
    limit?: number;
    page?: number;
  }): Promise<EndorsalListResponse<EndorsalWidget>> {
    let response = await this.axios.get('/widgets', { params });
    return response.data;
  }

  // --- SuperLinks ---

  async createSuperLink(data: {
    name?: string;
    email?: string;
    company?: string;
    position?: string;
    location?: string;
    propertyID: string;
    [key: string]: unknown;
  }): Promise<{ url: string; [key: string]: unknown }> {
    let response = await this.axios.post('/superlinks', data);
    return response.data;
  }
}
