import { createAxios } from 'slates';
import { hubSpotApiError } from './errors';

export class HubSpotClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.hubapi.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    this.http.interceptors.response.use(
      response => response,
      error => Promise.reject(hubSpotApiError(error))
    );
  }

  // ── CRM Objects (generic) ──

  async createObject(
    objectType: string,
    properties: Record<string, any>,
    associations?: any[]
  ): Promise<any> {
    let body: Record<string, any> = { properties };
    if (associations && associations.length > 0) {
      body.associations = associations;
    }
    let response = await this.http.post(`/crm/v3/objects/${objectType}`, body);
    return response.data;
  }

  async getObject(
    objectType: string,
    objectId: string,
    properties?: string[],
    associations?: string[]
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (properties && properties.length > 0) {
      params.properties = properties.join(',');
    }
    if (associations && associations.length > 0) {
      params.associations = associations.join(',');
    }
    let response = await this.http.get(`/crm/v3/objects/${objectType}/${objectId}`, {
      params
    });
    return response.data;
  }

  async updateObject(
    objectType: string,
    objectId: string,
    properties: Record<string, any>
  ): Promise<any> {
    let response = await this.http.patch(`/crm/v3/objects/${objectType}/${objectId}`, {
      properties
    });
    return response.data;
  }

  async deleteObject(objectType: string, objectId: string): Promise<void> {
    await this.http.delete(`/crm/v3/objects/${objectType}/${objectId}`);
  }

  async listObjects(
    objectType: string,
    limit: number = 10,
    after?: string,
    properties?: string[]
  ): Promise<any> {
    let params: Record<string, any> = { limit };
    if (after) {
      params.after = after;
    }
    if (properties && properties.length > 0) {
      params.properties = properties.join(',');
    }
    let response = await this.http.get(`/crm/v3/objects/${objectType}`, { params });
    return response.data;
  }

  async batchCreateObjects(
    objectType: string,
    inputs: Array<{ properties: Record<string, any>; associations?: any[] }>
  ): Promise<any> {
    let response = await this.http.post(`/crm/v3/objects/${objectType}/batch/create`, {
      inputs
    });
    return response.data;
  }

  async batchUpdateObjects(
    objectType: string,
    inputs: Array<{ id: string; properties: Record<string, any> }>
  ): Promise<any> {
    let response = await this.http.post(`/crm/v3/objects/${objectType}/batch/update`, {
      inputs
    });
    return response.data;
  }

  // ── Search ──

  async searchObjects(
    objectType: string,
    searchRequest: {
      filterGroups?: Array<{
        filters: Array<{
          propertyName: string;
          operator: string;
          value?: string;
          values?: string[];
          highValue?: string;
        }>;
      }>;
      sorts?: Array<{ propertyName: string; direction: string }>;
      query?: string;
      properties?: string[];
      limit?: number;
      after?: number;
    }
  ): Promise<any> {
    let response = await this.http.post(`/crm/v3/objects/${objectType}/search`, searchRequest);
    return response.data;
  }

  // ── Associations ──

  async createAssociation(
    fromObjectType: string,
    fromObjectId: string,
    toObjectType: string,
    toObjectId: string,
    associationTypeId: number,
    associationCategory: string
  ): Promise<any> {
    let response = await this.http.put(
      `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}`,
      [{ associationCategory, associationTypeId }]
    );
    return response.data;
  }

  async deleteAssociation(
    fromObjectType: string,
    fromObjectId: string,
    toObjectType: string,
    toObjectId: string
  ): Promise<void> {
    await this.http.delete(
      `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}`
    );
  }

  async getAssociations(
    fromObjectType: string,
    fromObjectId: string,
    toObjectType: string
  ): Promise<any> {
    let response = await this.http.get(
      `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}`
    );
    return response.data;
  }

  // ── Engagements ──

  async createEngagement(
    engagementType: string,
    properties: Record<string, any>,
    associations?: any[]
  ): Promise<any> {
    let body: Record<string, any> = { properties };
    if (associations && associations.length > 0) {
      body.associations = associations;
    }
    let response = await this.http.post(`/crm/v3/objects/${engagementType}`, body);
    return response.data;
  }

  async getEngagement(
    engagementType: string,
    engagementId: string,
    properties?: string[]
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (properties && properties.length > 0) {
      params.properties = properties.join(',');
    }
    let response = await this.http.get(`/crm/v3/objects/${engagementType}/${engagementId}`, {
      params
    });
    return response.data;
  }

  async updateEngagement(
    engagementType: string,
    engagementId: string,
    properties: Record<string, any>
  ): Promise<any> {
    let response = await this.http.patch(`/crm/v3/objects/${engagementType}/${engagementId}`, {
      properties
    });
    return response.data;
  }

  async deleteEngagement(engagementType: string, engagementId: string): Promise<void> {
    await this.http.delete(`/crm/v3/objects/${engagementType}/${engagementId}`);
  }

  // ── Properties ──

  async listProperties(objectType: string): Promise<any> {
    let response = await this.http.get(`/crm/v3/properties/${objectType}`);
    return response.data;
  }

  async createProperty(
    objectType: string,
    property: {
      name: string;
      label: string;
      type: string;
      fieldType: string;
      groupName: string;
      description?: string;
      options?: Array<{
        label: string;
        value: string;
        description?: string;
        displayOrder?: number;
      }>;
    }
  ): Promise<any> {
    let response = await this.http.post(`/crm/v3/properties/${objectType}`, property);
    return response.data;
  }

  async updateProperty(
    objectType: string,
    propertyName: string,
    updates: Record<string, any>
  ): Promise<any> {
    let response = await this.http.patch(
      `/crm/v3/properties/${objectType}/${propertyName}`,
      updates
    );
    return response.data;
  }

  async deleteProperty(objectType: string, propertyName: string): Promise<void> {
    await this.http.delete(`/crm/v3/properties/${objectType}/${propertyName}`);
  }

  // ── Pipelines ──

  async listPipelines(objectType: string): Promise<any> {
    let response = await this.http.get(`/crm/v3/pipelines/${objectType}`);
    return response.data;
  }

  async getPipeline(objectType: string, pipelineId: string): Promise<any> {
    let response = await this.http.get(`/crm/v3/pipelines/${objectType}/${pipelineId}`);
    return response.data;
  }

  async createPipeline(
    objectType: string,
    pipeline: {
      label: string;
      displayOrder: number;
      stages: Array<{ label: string; displayOrder: number; metadata: Record<string, string> }>;
    }
  ): Promise<any> {
    let response = await this.http.post(`/crm/v3/pipelines/${objectType}`, pipeline);
    return response.data;
  }

  async updatePipeline(
    objectType: string,
    pipelineId: string,
    updates: Record<string, any>
  ): Promise<any> {
    let response = await this.http.patch(
      `/crm/v3/pipelines/${objectType}/${pipelineId}`,
      updates
    );
    return response.data;
  }

  async deletePipeline(objectType: string, pipelineId: string): Promise<void> {
    await this.http.delete(`/crm/v3/pipelines/${objectType}/${pipelineId}`);
  }

  // ── Lists ──

  async createList(
    name: string,
    processingType: string,
    objectTypeId: string,
    filterBranch?: any
  ): Promise<any> {
    let body: Record<string, any> = { name, processingType, objectTypeId };
    if (filterBranch) {
      body.filterBranch = filterBranch;
    }
    let response = await this.http.post('/crm/v3/lists/', body);
    return response.data.list ?? response.data;
  }

  async getList(listId: string): Promise<any> {
    let response = await this.http.get(`/crm/v3/lists/${listId}`);
    return response.data.list ?? response.data;
  }

  async updateListName(listId: string, name: string): Promise<any> {
    let response = await this.http.put(`/crm/v3/lists/${listId}/update-list-name`, null, {
      params: { listName: name }
    });
    return response.data.updatedList ?? response.data.list ?? response.data;
  }

  async deleteList(listId: string): Promise<void> {
    await this.http.delete(`/crm/v3/lists/${listId}`);
  }

  async addToList(listId: string, recordIds: string[]): Promise<any> {
    let response = await this.http.put(`/crm/v3/lists/${listId}/memberships/add`, recordIds);
    return response.data;
  }

  async removeFromList(listId: string, recordIds: string[]): Promise<any> {
    let response = await this.http.put(
      `/crm/v3/lists/${listId}/memberships/remove`,
      recordIds
    );
    return response.data;
  }

  async getListMemberships(listId: string, limit: number = 100, after?: string): Promise<any> {
    let params: Record<string, any> = { limit };
    if (after) {
      params.after = after;
    }
    let response = await this.http.get(`/crm/v3/lists/${listId}/memberships`, { params });
    return response.data;
  }

  async searchLists(query: string, processingTypes?: string[]): Promise<any> {
    let body: Record<string, any> = { query };
    if (processingTypes && processingTypes.length > 0) {
      body.processingTypes = processingTypes;
    }
    let response = await this.http.post('/crm/v3/lists/search', body);
    return response.data;
  }

  // ── Owners ──

  async listOwners(limit: number = 100, after?: string, email?: string): Promise<any> {
    let params: Record<string, any> = { limit };
    if (after) {
      params.after = after;
    }
    if (email) {
      params.email = email;
    }
    let response = await this.http.get('/crm/v3/owners/', { params });
    return response.data;
  }

  async getOwner(ownerId: string): Promise<any> {
    let response = await this.http.get(`/crm/v3/owners/${ownerId}`);
    return response.data;
  }

  // ── Recently Modified (for polling) ──

  async getRecentlyModified(
    objectType: string,
    since?: string,
    limit: number = 50
  ): Promise<any> {
    let searchRequest: any = {
      sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
      properties: ['hs_lastmodifieddate', 'hs_object_id', 'createdate'],
      limit
    };

    if (since) {
      searchRequest.filterGroups = [
        {
          filters: [
            {
              propertyName: 'hs_lastmodifieddate',
              operator: 'GTE',
              value: since
            }
          ]
        }
      ];
    }

    let response = await this.http.post(`/crm/v3/objects/${objectType}/search`, searchRequest);
    return response.data;
  }

  // ── Email (Transactional) ──

  async sendTransactionalEmail(
    emailId: number,
    to: string,
    properties?: Record<string, string>,
    contactProperties?: Record<string, string>
  ): Promise<any> {
    let body: Record<string, any> = {
      emailId,
      message: { to }
    };
    if (properties) {
      body.customProperties = properties;
    }
    if (contactProperties) {
      body.contactProperties = contactProperties;
    }
    let response = await this.http.post('/marketing/v3/transactional/single-email/send', body);
    return response.data;
  }
}
