import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface CmsEntityField {
  name: string;
  dataType: string;
  uniqueName?: string;
  options?: Record<string, unknown>;
}

export class BotstarClient {
  private axios;

  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('An account-level API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://apis.botstar.com/v1',
      authHeader: { value: `Bearer ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'BotStar',
          reason: 'botstar_api_error'
        })
    });
  }

  // ---- Bots ----

  async listBots(): Promise<any[]> {
    let response = await this.axios.get('/bots/');
    return response.data;
  }

  async getBot(botId: string): Promise<any> {
    let response = await this.axios.get(`/bots/${encodeURIComponent(botId)}`);
    return response.data;
  }

  async createBot(name: string): Promise<any> {
    let response = await this.axios.post('/bots/', { name });
    return response.data;
  }

  async publishBot(botId: string): Promise<any> {
    let response = await this.axios.post(`/bots/${encodeURIComponent(botId)}/publish`);
    return response.data;
  }

  // ---- Bot Attributes ----

  async listBotAttributes(botId: string, env?: string): Promise<any[]> {
    let response = await this.axios.get(`/bots/${encodeURIComponent(botId)}/attributes`, {
      params: { env }
    });
    return response.data;
  }

  async createBotAttribute(
    botId: string,
    attribute: { name: string; dataType: string; desc?: string; value?: string },
    env?: string
  ): Promise<any> {
    let response = await this.axios.post(
      `/bots/${encodeURIComponent(botId)}/attributes`,
      {
        name: attribute.name,
        data_type: attribute.dataType,
        desc: attribute.desc,
        value: attribute.value
      },
      { params: { env: env === 'live' ? 'draft,live' : env } }
    );
    return response.data;
  }

  async updateBotAttribute(
    botId: string,
    attributeId: string,
    updates: { desc?: string; value?: string },
    env?: string
  ): Promise<any> {
    let response = await this.axios.patch(
      `/bots/${encodeURIComponent(botId)}/attributes/${encodeURIComponent(attributeId)}`,
      updates,
      {
        params: { env: env === 'live' ? 'draft,live' : env }
      }
    );
    return response.data;
  }

  async deleteBotAttribute(botId: string, attributeId: string, env?: string): Promise<any> {
    let response = await this.axios.delete(
      `/bots/${encodeURIComponent(botId)}/attributes/${encodeURIComponent(attributeId)}`,
      {
        params: { env: env === 'live' ? 'draft,live' : env }
      }
    );
    return response.data;
  }

  // ---- Users ----

  async getUser(botId: string, userId: string): Promise<any> {
    let response = await this.axios.get(
      `/bots/${encodeURIComponent(botId)}/users/${encodeURIComponent(userId)}`
    );
    return response.data;
  }

  async updateUser(botId: string, userId: string, updates: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(
      `/bots/${encodeURIComponent(botId)}/users/${encodeURIComponent(userId)}`,
      updates
    );
    return response.data;
  }

  async createUserAttribute(
    botId: string,
    fieldName: string,
    fieldType: string
  ): Promise<any> {
    let response = await this.axios.post(
      `/bots/${encodeURIComponent(botId)}/users/attributes`,
      {
        field_name: fieldName,
        field_type: fieldType
      }
    );
    return response.data;
  }

  // ---- CMS Entities ----

  async listCmsEntities(botId: string, env?: string): Promise<any[]> {
    let response = await this.axios.get(`/bots/${encodeURIComponent(botId)}/cms_entities`, {
      params: { env }
    });
    return response.data;
  }

  async getCmsEntity(botId: string, entityId: string, env?: string): Promise<any> {
    let response = await this.axios.get(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}`,
      {
        params: { env }
      }
    );
    return response.data;
  }

  async createCmsEntity(
    botId: string,
    entity: { name: string; fields?: CmsEntityField[] },
    env?: string
  ): Promise<any> {
    let response = await this.axios.post(
      `/bots/${encodeURIComponent(botId)}/cms_entities`,
      {
        name: entity.name,
        fields: entity.fields?.map(field => ({
          name: field.name,
          unique_name: field.uniqueName ?? field.name,
          data_type: field.dataType,
          options: field.options
        }))
      },
      { params: { env: env === 'live' ? 'draft,live' : env } }
    );
    return response.data;
  }

  async updateCmsEntity(
    botId: string,
    entityId: string,
    updates: { name?: string },
    env?: string
  ): Promise<any> {
    let response = await this.axios.patch(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}`,
      updates,
      {
        params: { env: env === 'live' ? 'draft,live' : env }
      }
    );
    return response.data;
  }

  async deleteCmsEntity(botId: string, entityId: string, env?: string): Promise<any> {
    let response = await this.axios.delete(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}`,
      {
        params: { env: env === 'live' ? 'draft,live' : env }
      }
    );
    return response.data;
  }

  // ---- CMS Entity Fields ----

  async addCmsEntityFields(
    botId: string,
    entityId: string,
    fields: any[],
    env?: string
  ): Promise<any> {
    let response = await this.axios.post(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}/fields`,
      fields,
      {
        params: { env: env === 'live' ? 'draft,live' : env }
      }
    );
    return response.data;
  }

  async updateCmsEntityFields(
    botId: string,
    entityId: string,
    fields: any,
    env?: string
  ): Promise<any> {
    let response = await this.axios.patch(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}/fields`,
      fields,
      {
        params: { env: env === 'live' ? 'draft,live' : env }
      }
    );
    return response.data;
  }

  async deleteCmsEntityFields(
    botId: string,
    entityId: string,
    uniqueNames: string[],
    env?: string
  ): Promise<any> {
    let response = await this.axios.delete(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}/fields`,
      {
        params: {
          env: env === 'live' ? 'draft,live' : env,
          unique_names: uniqueNames.join(',')
        }
      }
    );
    return response.data;
  }

  // ---- CMS Entity Items ----

  async listCmsEntityItems(
    botId: string,
    entityId: string,
    options?: { env?: string; page?: number; limit?: number; name?: string; status?: string }
  ): Promise<any[]> {
    let response = await this.axios.get(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}/items`,
      {
        params: {
          env: options?.env,
          page: options?.page,
          limit: options?.limit,
          name: options?.name,
          status: options?.status
        }
      }
    );
    return response.data;
  }

  async getCmsEntityItem(
    botId: string,
    entityId: string,
    itemId: string,
    env?: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}/items/${encodeURIComponent(itemId)}`,
      {
        params: { env }
      }
    );
    return response.data;
  }

  async createCmsEntityItem(
    botId: string,
    entityId: string,
    item: Record<string, any>,
    env?: string
  ): Promise<any> {
    let response = await this.axios.post(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}/items`,
      item,
      {
        params: { env: env === 'live' ? 'draft,live' : env }
      }
    );
    return response.data;
  }

  async updateCmsEntityItem(
    botId: string,
    entityId: string,
    itemId: string,
    updates: Record<string, any>,
    env?: string
  ): Promise<any> {
    let response = await this.axios.patch(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}/items/${encodeURIComponent(itemId)}`,
      updates,
      {
        params: { env: env === 'live' ? 'draft,live' : env }
      }
    );
    return response.data;
  }

  async deleteCmsEntityItem(
    botId: string,
    entityId: string,
    itemId: string,
    env?: string
  ): Promise<any> {
    let response = await this.axios.delete(
      `/bots/${encodeURIComponent(botId)}/cms_entities/${encodeURIComponent(entityId)}/items/${encodeURIComponent(itemId)}`,
      {
        params: { env: env === 'live' ? 'draft,live' : env }
      }
    );
    return response.data;
  }

  // ---- Messages (Public API) ----

  async sendMessage(
    recipientId: string,
    message: Record<string, any>,
    messageTag?: string
  ): Promise<any> {
    let body: Record<string, any> = {
      recipient: { id: recipientId },
      message
    };
    if (messageTag) {
      body.options = { message_tag: messageTag };
    }
    let response = await this.axios.post('/messages', body);
    return response.data;
  }
}
