import { createAxios } from 'slates';
import { signRequest } from './signing';

export interface CognitoClientConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export class CognitoClient {
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private sessionToken?: string;

  constructor(config: CognitoClientConfig) {
    this.region = config.region;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.sessionToken = config.sessionToken;
  }

  private async request(action: string, body: Record<string, any>): Promise<any> {
    let host = `cognito-idp.${this.region}.amazonaws.com`;
    let bodyStr = JSON.stringify(body);

    let headers = await signRequest({
      method: 'POST',
      host,
      path: '/',
      region: this.region,
      service: 'cognito-idp',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': `AWSCognitoIdentityProviderService.${action}`
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

  // ---- User Pool Operations ----

  async listUserPools(maxResults: number = 60, nextToken?: string): Promise<any> {
    let body: Record<string, any> = { MaxResults: maxResults };
    if (nextToken) body.NextToken = nextToken;
    return this.request('ListUserPools', body);
  }

  async createUserPool(params: Record<string, any>): Promise<any> {
    return this.request('CreateUserPool', params);
  }

  async describeUserPool(userPoolId: string): Promise<any> {
    return this.request('DescribeUserPool', { UserPoolId: userPoolId });
  }

  async updateUserPool(params: Record<string, any>): Promise<any> {
    return this.request('UpdateUserPool', params);
  }

  async deleteUserPool(userPoolId: string): Promise<any> {
    return this.request('DeleteUserPool', { UserPoolId: userPoolId });
  }

  // ---- User Operations ----

  async listUsers(
    userPoolId: string,
    options?: {
      limit?: number;
      paginationToken?: string;
      filter?: string;
      attributesToGet?: string[];
    }
  ): Promise<any> {
    let body: Record<string, any> = { UserPoolId: userPoolId };
    if (options?.limit) body.Limit = options.limit;
    if (options?.paginationToken) body.PaginationToken = options.paginationToken;
    if (options?.filter) body.Filter = options.filter;
    if (options?.attributesToGet) body.AttributesToGet = options.attributesToGet;
    return this.request('ListUsers', body);
  }

  async adminCreateUser(params: Record<string, any>): Promise<any> {
    return this.request('AdminCreateUser', params);
  }

  async adminGetUser(userPoolId: string, username: string): Promise<any> {
    return this.request('AdminGetUser', { UserPoolId: userPoolId, Username: username });
  }

  async adminUpdateUserAttributes(
    userPoolId: string,
    username: string,
    attributes: Array<{ Name: string; Value: string }>
  ): Promise<any> {
    return this.request('AdminUpdateUserAttributes', {
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: attributes
    });
  }

  async adminDeleteUser(userPoolId: string, username: string): Promise<any> {
    return this.request('AdminDeleteUser', { UserPoolId: userPoolId, Username: username });
  }

  async adminDisableUser(userPoolId: string, username: string): Promise<any> {
    return this.request('AdminDisableUser', { UserPoolId: userPoolId, Username: username });
  }

  async adminEnableUser(userPoolId: string, username: string): Promise<any> {
    return this.request('AdminEnableUser', { UserPoolId: userPoolId, Username: username });
  }

  async adminConfirmSignUp(userPoolId: string, username: string): Promise<any> {
    return this.request('AdminConfirmSignUp', { UserPoolId: userPoolId, Username: username });
  }

  async adminResetUserPassword(userPoolId: string, username: string): Promise<any> {
    return this.request('AdminResetUserPassword', {
      UserPoolId: userPoolId,
      Username: username
    });
  }

  async adminSetUserPassword(
    userPoolId: string,
    username: string,
    password: string,
    permanent: boolean
  ): Promise<any> {
    return this.request('AdminSetUserPassword', {
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: permanent
    });
  }

  // ---- Group Operations ----

  async listGroups(userPoolId: string, limit?: number, nextToken?: string): Promise<any> {
    let body: Record<string, any> = { UserPoolId: userPoolId };
    if (limit) body.Limit = limit;
    if (nextToken) body.NextToken = nextToken;
    return this.request('ListGroups', body);
  }

  async createGroup(params: Record<string, any>): Promise<any> {
    return this.request('CreateGroup', params);
  }

  async getGroup(userPoolId: string, groupName: string): Promise<any> {
    return this.request('GetGroup', { UserPoolId: userPoolId, GroupName: groupName });
  }

  async updateGroup(params: Record<string, any>): Promise<any> {
    return this.request('UpdateGroup', params);
  }

  async deleteGroup(userPoolId: string, groupName: string): Promise<any> {
    return this.request('DeleteGroup', { UserPoolId: userPoolId, GroupName: groupName });
  }

  async adminAddUserToGroup(
    userPoolId: string,
    username: string,
    groupName: string
  ): Promise<any> {
    return this.request('AdminAddUserToGroup', {
      UserPoolId: userPoolId,
      Username: username,
      GroupName: groupName
    });
  }

  async adminRemoveUserFromGroup(
    userPoolId: string,
    username: string,
    groupName: string
  ): Promise<any> {
    return this.request('AdminRemoveUserFromGroup', {
      UserPoolId: userPoolId,
      Username: username,
      GroupName: groupName
    });
  }

  async listUsersInGroup(
    userPoolId: string,
    groupName: string,
    limit?: number,
    nextToken?: string
  ): Promise<any> {
    let body: Record<string, any> = { UserPoolId: userPoolId, GroupName: groupName };
    if (limit) body.Limit = limit;
    if (nextToken) body.NextToken = nextToken;
    return this.request('ListUsersInGroup', body);
  }

  async adminListGroupsForUser(
    userPoolId: string,
    username: string,
    limit?: number,
    nextToken?: string
  ): Promise<any> {
    let body: Record<string, any> = { UserPoolId: userPoolId, Username: username };
    if (limit) body.Limit = limit;
    if (nextToken) body.NextToken = nextToken;
    return this.request('AdminListGroupsForUser', body);
  }

  // ---- Identity Provider Operations ----

  async listIdentityProviders(
    userPoolId: string,
    maxResults?: number,
    nextToken?: string
  ): Promise<any> {
    let body: Record<string, any> = { UserPoolId: userPoolId };
    if (maxResults) body.MaxResults = maxResults;
    if (nextToken) body.NextToken = nextToken;
    return this.request('ListIdentityProviders', body);
  }

  async createIdentityProvider(params: Record<string, any>): Promise<any> {
    return this.request('CreateIdentityProvider', params);
  }

  async describeIdentityProvider(userPoolId: string, providerName: string): Promise<any> {
    return this.request('DescribeIdentityProvider', {
      UserPoolId: userPoolId,
      ProviderName: providerName
    });
  }

  async updateIdentityProvider(params: Record<string, any>): Promise<any> {
    return this.request('UpdateIdentityProvider', params);
  }

  async deleteIdentityProvider(userPoolId: string, providerName: string): Promise<any> {
    return this.request('DeleteIdentityProvider', {
      UserPoolId: userPoolId,
      ProviderName: providerName
    });
  }

  // ---- App Client Operations ----

  async listUserPoolClients(
    userPoolId: string,
    maxResults?: number,
    nextToken?: string
  ): Promise<any> {
    let body: Record<string, any> = { UserPoolId: userPoolId };
    if (maxResults) body.MaxResults = maxResults;
    if (nextToken) body.NextToken = nextToken;
    return this.request('ListUserPoolClients', body);
  }

  async createUserPoolClient(params: Record<string, any>): Promise<any> {
    return this.request('CreateUserPoolClient', params);
  }

  async describeUserPoolClient(userPoolId: string, clientId: string): Promise<any> {
    return this.request('DescribeUserPoolClient', {
      UserPoolId: userPoolId,
      ClientId: clientId
    });
  }

  async updateUserPoolClient(params: Record<string, any>): Promise<any> {
    return this.request('UpdateUserPoolClient', params);
  }

  async deleteUserPoolClient(userPoolId: string, clientId: string): Promise<any> {
    return this.request('DeleteUserPoolClient', {
      UserPoolId: userPoolId,
      ClientId: clientId
    });
  }

  // ---- Resource Server Operations ----

  async createResourceServer(params: Record<string, any>): Promise<any> {
    return this.request('CreateResourceServer', params);
  }

  async describeResourceServer(userPoolId: string, identifier: string): Promise<any> {
    return this.request('DescribeResourceServer', {
      UserPoolId: userPoolId,
      Identifier: identifier
    });
  }

  async listResourceServers(
    userPoolId: string,
    maxResults?: number,
    nextToken?: string
  ): Promise<any> {
    let body: Record<string, any> = { UserPoolId: userPoolId };
    if (maxResults) body.MaxResults = maxResults;
    if (nextToken) body.NextToken = nextToken;
    return this.request('ListResourceServers', body);
  }

  async updateResourceServer(params: Record<string, any>): Promise<any> {
    return this.request('UpdateResourceServer', params);
  }

  async deleteResourceServer(userPoolId: string, identifier: string): Promise<any> {
    return this.request('DeleteResourceServer', {
      UserPoolId: userPoolId,
      Identifier: identifier
    });
  }
}
