import { createAxios } from 'slates';

export interface DsmClientConfig {
  token: string;
  dsmBaseUrl: string;
}

export class DsmClient {
  private token: string;
  private dsmBaseUrl: string;

  constructor(config: DsmClientConfig) {
    this.token = config.token;
    this.dsmBaseUrl = config.dsmBaseUrl;
  }

  async getDesignTokens(
    format: string = 'json',
    exportFormat: string = 'lookup'
  ): Promise<any> {
    let url = `${this.dsmBaseUrl}/style-data.${format}`;
    let params: Record<string, string> = {};
    if (format === 'json') {
      params.exportFormat = exportFormat;
    }

    let axios = createAxios();
    let response = await axios.get(url, {
      headers: {
        'X-API-KEY': this.token
      },
      params
    });

    return response.data;
  }

  async getDesignTokensStyleDictionary(): Promise<ArrayBuffer> {
    let url = `${this.dsmBaseUrl}/tokens-style-dictionary.zip`;

    let axios = createAxios();
    let response = await axios.get(url, {
      headers: {
        'X-API-KEY': this.token
      },
      responseType: 'arraybuffer'
    });

    return response.data;
  }

  async getIcons(): Promise<ArrayBuffer> {
    let url = `${this.dsmBaseUrl}/icons.zip`;

    let axios = createAxios();
    let response = await axios.get(url, {
      headers: {
        'X-API-KEY': this.token
      },
      responseType: 'arraybuffer'
    });

    return response.data;
  }

  async getStyleParams(type: string): Promise<string> {
    let url = `${this.dsmBaseUrl}/_style-params.${type}`;

    let axios = createAxios();
    let response = await axios.get(url, {
      headers: {
        'X-API-KEY': this.token
      }
    });

    return response.data;
  }
}

export interface ScimClientConfig {
  token: string;
  scimBaseUrl: string;
}

export class ScimClient {
  private token: string;
  private scimBaseUrl: string;

  constructor(config: ScimClientConfig) {
    this.token = config.token;
    this.scimBaseUrl = config.scimBaseUrl;
  }

  private getAxios() {
    return createAxios({
      baseURL: this.scimBaseUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/scim+json'
      }
    });
  }

  async listUsers(filter?: string, startIndex?: number, count?: number): Promise<any> {
    let axios = this.getAxios();
    let params: Record<string, string | number> = {};
    if (filter) params.filter = filter;
    if (startIndex !== undefined) params.startIndex = startIndex;
    if (count !== undefined) params.count = count;

    let response = await axios.get('/Users', { params });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/Users/${userId}`);
    return response.data;
  }

  async createUser(user: {
    userName: string;
    givenName: string;
    familyName: string;
    email: string;
    active?: boolean;
  }): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/Users', {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: user.userName,
      name: {
        givenName: user.givenName,
        familyName: user.familyName
      },
      emails: [
        {
          value: user.email,
          type: 'work',
          primary: true
        }
      ],
      active: user.active ?? true
    });
    return response.data;
  }

  async updateUser(
    userId: string,
    updates: {
      userName?: string;
      givenName?: string;
      familyName?: string;
      email?: string;
      active?: boolean;
    }
  ): Promise<any> {
    let axios = this.getAxios();
    let body: Record<string, any> = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User']
    };

    if (updates.userName !== undefined) body.userName = updates.userName;
    if (updates.givenName !== undefined || updates.familyName !== undefined) {
      body.name = {};
      if (updates.givenName !== undefined) body.name.givenName = updates.givenName;
      if (updates.familyName !== undefined) body.name.familyName = updates.familyName;
    }
    if (updates.email !== undefined) {
      body.emails = [{ value: updates.email, type: 'work', primary: true }];
    }
    if (updates.active !== undefined) body.active = updates.active;

    let response = await axios.put(`/Users/${userId}`, body);
    return response.data;
  }

  async deactivateUser(userId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.patch(`/Users/${userId}`, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [
        {
          op: 'replace',
          value: { active: false }
        }
      ]
    });
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/Users/${userId}`);
  }
}
