import { createAxios } from 'slates';
import { signRequest } from './signing';

export interface IdentityClientConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export class CognitoIdentityClient {
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private sessionToken?: string;

  constructor(config: IdentityClientConfig) {
    this.region = config.region;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.sessionToken = config.sessionToken;
  }

  private async request(action: string, body: Record<string, any>): Promise<any> {
    let host = `cognito-identity.${this.region}.amazonaws.com`;
    let bodyStr = JSON.stringify(body);

    let headers = await signRequest({
      method: 'POST',
      host,
      path: '/',
      region: this.region,
      service: 'cognito-identity',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': `com.amazonaws.cognito.identity.model.AWSCognitoIdentityService.${action}`
      },
      body: bodyStr,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      sessionToken: this.sessionToken
    });

    let ax = createAxios({
      baseURL: `https://${host}`
    });

    let response = await ax.post('/', bodyStr, { headers });
    return response.data;
  }

  async listIdentityPools(maxResults: number = 60, nextToken?: string): Promise<any> {
    let body: Record<string, any> = { MaxResults: maxResults };
    if (nextToken) body.NextToken = nextToken;
    return this.request('ListIdentityPools', body);
  }

  async createIdentityPool(params: Record<string, any>): Promise<any> {
    return this.request('CreateIdentityPool', params);
  }

  async describeIdentityPool(identityPoolId: string): Promise<any> {
    return this.request('DescribeIdentityPool', { IdentityPoolId: identityPoolId });
  }

  async updateIdentityPool(params: Record<string, any>): Promise<any> {
    return this.request('UpdateIdentityPool', params);
  }

  async deleteIdentityPool(identityPoolId: string): Promise<any> {
    return this.request('DeleteIdentityPool', { IdentityPoolId: identityPoolId });
  }

  async getIdentityPoolRoles(identityPoolId: string): Promise<any> {
    return this.request('GetIdentityPoolRoles', { IdentityPoolId: identityPoolId });
  }

  async setIdentityPoolRoles(params: Record<string, any>): Promise<any> {
    return this.request('SetIdentityPoolRoles', params);
  }
}
