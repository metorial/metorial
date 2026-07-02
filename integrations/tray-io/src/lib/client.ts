import { createAxios } from 'slates';
import { getGraphqlUrl, getRestBaseUrl } from './endpoints';

export class TrayGraphqlClient {
  private token: string;
  private region: string;

  constructor(config: { token: string; region: string }) {
    this.token = config.token;
    this.region = config.region;
  }

  private getAxios() {
    return createAxios({
      baseURL: getGraphqlUrl(this.region),
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    let http = this.getAxios();
    let response = await http.post('', { query, variables });
    let data = response.data;
    if (data.errors && data.errors.length > 0) {
      throw new Error(`GraphQL Error: ${data.errors.map((e: any) => e.message).join(', ')}`);
    }
    return data.data;
  }

  // ---- User Management ----

  async createExternalUser(input: {
    name: string;
    externalUserId: string;
  }): Promise<{ userId: string }> {
    let result = await this.graphql<{ createExternalUser: { userId: string } }>(
      `
      mutation CreateExternalUser($input: CreateExternalUserInput!) {
        createExternalUser(input: $input) {
          userId
        }
      }
    `,
      { input }
    );
    return result.createExternalUser;
  }

  async deleteExternalUser(userId: string): Promise<void> {
    await this.graphql(
      `
      mutation RemoveExternalUser($input: RemoveExternalUserInput!) {
        removeExternalUser(input: $input) {
          clientMutationId
        }
      }
    `,
      { input: { userId } }
    );
  }

  async authorize(userId: string): Promise<{ accessToken: string }> {
    let result = await this.graphql<{ authorize: { accessToken: string } }>(
      `
      mutation Authorize($input: AuthorizeInput!) {
        authorize(input: $input) {
          accessToken
        }
      }
    `,
      { input: { userId } }
    );
    return result.authorize;
  }

  async generateAuthorizationCode(userId: string): Promise<{ authorizationCode: string }> {
    let result = await this.graphql<{
      generateAuthorizationCode: { authorizationCode: string };
    }>(
      `
      mutation GenerateAuthorizationCode($input: GenerateAuthorizationCodeInput!) {
        generateAuthorizationCode(input: $input) {
          authorizationCode
        }
      }
    `,
      { input: { userId } }
    );
    return result.generateAuthorizationCode;
  }

  async listUsers(criteria?: {
    externalUserId?: string;
  }): Promise<Array<{ id: string; name: string; externalUserId: string }>> {
    let result = await this.graphql<{
      users: { edges: Array<{ node: { id: string; name: string; externalUserId: string } }> };
    }>(
      `
      query ListUsers($criteria: UserCriteria) {
        users(criteria: $criteria) {
          edges {
            node {
              id
              name
              externalUserId
            }
          }
        }
      }
    `,
      { criteria: criteria || {} }
    );
    return result.users.edges.map((e: any) => e.node);
  }

  // ---- Solution Management ----

  async listSolutions(): Promise<
    Array<{ solutionId: string; title: string; description: string; tags: string[] }>
  > {
    let result = await this.graphql<{
      viewer: { solutions: { edges: Array<{ node: any }> } };
    }>(`
      query ListSolutions {
        viewer {
          solutions {
            edges {
              node {
                id
                title
                description
                tags
              }
            }
          }
        }
      }
    `);
    return result.viewer.solutions.edges.map((e: any) => ({
      solutionId: e.node.id,
      title: e.node.title,
      description: e.node.description,
      tags: e.node.tags || []
    }));
  }

  // ---- Solution Instance Management ----

  async listSolutionInstances(): Promise<
    Array<{
      solutionInstanceId: string;
      name: string;
      enabled: boolean;
      created: string;
      owner: string;
      hasNewerVersion: boolean;
    }>
  > {
    let result = await this.graphql<{
      viewer: { solutionInstances: { edges: Array<{ node: any }> } };
    }>(`
      query ListSolutionInstances {
        viewer {
          solutionInstances {
            edges {
              node {
                id
                name
                enabled
                created
                owner
                solutionVersionFlags {
                  hasNewerVersion
                }
              }
            }
          }
        }
      }
    `);
    return result.viewer.solutionInstances.edges.map((e: any) => ({
      solutionInstanceId: e.node.id,
      name: e.node.name,
      enabled: e.node.enabled,
      created: e.node.created,
      owner: e.node.owner,
      hasNewerVersion: e.node.solutionVersionFlags?.hasNewerVersion ?? false
    }));
  }

  async getSolutionInstance(solutionInstanceId: string): Promise<{
    solutionInstanceId: string;
    name: string;
    enabled: boolean;
    created: string;
    authValues: Array<{ externalId: string; authId: string }>;
    configValues: Array<{ externalId: string; value: string }>;
  }> {
    let result = await this.graphql<{
      viewer: { solutionInstances: { edges: Array<{ node: any }> } };
    }>(
      `
      query GetSolutionInstance($criteria: SolutionInstanceCriteria) {
        viewer {
          solutionInstances(criteria: $criteria) {
            edges {
              node {
                id
                name
                enabled
                created
                authValues {
                  externalId
                  authId
                }
                configValues {
                  externalId
                  value
                }
              }
            }
          }
        }
      }
    `,
      { criteria: { ids: solutionInstanceId } }
    );

    let node = result.viewer.solutionInstances.edges[0]?.node;
    if (!node) {
      throw new Error(`Solution instance ${solutionInstanceId} not found`);
    }
    return {
      solutionInstanceId: node.id,
      name: node.name,
      enabled: node.enabled,
      created: node.created,
      authValues: node.authValues || [],
      configValues: node.configValues || []
    };
  }

  async createSolutionInstance(input: {
    solutionId: string;
    instanceName: string;
    authValues?: Array<{ externalId: string; authId: string }>;
    configValues?: Array<{ externalId: string; value: string }>;
  }): Promise<{
    solutionInstanceId: string;
    name: string;
    enabled: boolean;
    created: string;
  }> {
    let result = await this.graphql<{ createSolutionInstance: { solutionInstance: any } }>(
      `
      mutation CreateSolutionInstance($input: CreateSolutionInstanceInput!) {
        createSolutionInstance(input: $input) {
          solutionInstance {
            id
            name
            enabled
            created
          }
        }
      }
    `,
      { input }
    );
    let si = result.createSolutionInstance.solutionInstance;
    return {
      solutionInstanceId: si.id,
      name: si.name,
      enabled: si.enabled,
      created: si.created
    };
  }

  async updateSolutionInstance(input: {
    solutionInstanceId: string;
    instanceName?: string;
    enabled?: boolean;
    configValues?: Array<{ externalId: string; value: string }>;
    authValues?: Array<{ externalId: string; authId: string }>;
  }): Promise<{
    solutionInstanceId: string;
    name: string;
    enabled: boolean;
    created: string;
  }> {
    let result = await this.graphql<{ updateSolutionInstance: { solutionInstance: any } }>(
      `
      mutation UpdateSolutionInstance($input: UpdateSolutionInstanceInput!) {
        updateSolutionInstance(input: $input) {
          solutionInstance {
            id
            name
            enabled
            created
          }
        }
      }
    `,
      { input }
    );
    let si = result.updateSolutionInstance.solutionInstance;
    return {
      solutionInstanceId: si.id,
      name: si.name,
      enabled: si.enabled,
      created: si.created
    };
  }

  async removeSolutionInstance(solutionInstanceId: string): Promise<void> {
    await this.graphql(
      `
      mutation RemoveSolutionInstance($input: RemoveSolutionInstanceInput!) {
        removeSolutionInstance(input: $input) {
          clientMutationId
        }
      }
    `,
      { input: { solutionInstanceId } }
    );
  }

  async upgradeSolutionInstance(
    solutionInstanceId: string
  ): Promise<{ solutionInstanceId: string }> {
    let result = await this.graphql<{
      upgradeSolutionInstance: { solutionInstance: { id: string } };
    }>(
      `
      mutation UpgradeSolutionInstance($input: UpgradeSolutionInstanceInput!) {
        upgradeSolutionInstance(input: $input) {
          solutionInstance {
            id
          }
        }
      }
    `,
      { input: { solutionInstanceId } }
    );
    return { solutionInstanceId: result.upgradeSolutionInstance.solutionInstance.id };
  }

  // ---- Authentication Management (GraphQL) ----

  async listAuthentications(): Promise<
    Array<{
      authenticationId: string;
      name: string;
      serviceId: string;
      serviceName: string;
      serviceTitle: string;
      serviceEnvironmentId: string;
    }>
  > {
    let result = await this.graphql<{
      viewer: { authentications: { edges: Array<{ node: any }> } };
    }>(`
      query ListAuthentications {
        viewer {
          authentications {
            edges {
              node {
                id
                name
                service {
                  id
                  name
                  title
                }
                serviceEnvironment {
                  id
                }
              }
            }
          }
        }
      }
    `);
    return result.viewer.authentications.edges.map((e: any) => ({
      authenticationId: e.node.id,
      name: e.node.name,
      serviceId: e.node.service?.id || '',
      serviceName: e.node.service?.name || '',
      serviceTitle: e.node.service?.title || '',
      serviceEnvironmentId: e.node.serviceEnvironment?.id || ''
    }));
  }

  async createUserAuthentication(input: {
    name: string;
    serviceId: string;
    serviceEnvironmentId: string;
    data: Record<string, any>;
    scopes?: string[];
    hidden?: boolean;
  }): Promise<{ authenticationId: string }> {
    let result = await this.graphql<{
      createUserAuthentication: { authenticationId: string };
    }>(
      `
      mutation CreateUserAuthentication($input: CreateUserAuthenticationInput!) {
        createUserAuthentication(input: $input) {
          authenticationId
        }
      }
    `,
      {
        input: {
          name: input.name,
          serviceId: input.serviceId,
          serviceEnvironmentId: input.serviceEnvironmentId,
          data: JSON.stringify(input.data),
          scopes: input.scopes || [],
          hidden: input.hidden ?? false
        }
      }
    );
    return result.createUserAuthentication;
  }

  // ---- Call Connector (GraphQL) ----

  async callConnector(input: {
    connector: string;
    version: string;
    operation: string;
    authId: string;
    operationInput: Record<string, any>;
  }): Promise<any> {
    let result = await this.graphql<{ callConnector: { output: string } }>(
      `
      mutation CallConnector($input: CallConnectorInput!) {
        callConnector(input: $input) {
          output
        }
      }
    `,
      {
        input: {
          connector: input.connector,
          version: input.version,
          operation: input.operation,
          authId: input.authId,
          input: JSON.stringify(input.operationInput)
        }
      }
    );
    try {
      return JSON.parse(result.callConnector.output);
    } catch {
      return result.callConnector.output;
    }
  }
}

export class TrayRestClient {
  private token: string;
  private region: string;

  constructor(config: { token: string; region: string }) {
    this.token = config.token;
    this.region = config.region;
  }

  private getAxios() {
    return createAxios({
      baseURL: getRestBaseUrl(this.region),
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Connectors ----

  async listConnectors(): Promise<
    Array<{
      connectorName: string;
      version: string;
      title: string;
      description: string;
    }>
  > {
    let http = this.getAxios();
    let response = await http.get('/core/v1/connectors');
    let elements = response.data.elements || response.data;
    return (Array.isArray(elements) ? elements : []).map((c: any) => ({
      connectorName: c.name,
      version: c.version,
      title: c.title,
      description: c.description
    }));
  }

  async getConnectorOperations(
    connectorName: string,
    version: string
  ): Promise<
    Array<{
      operationName: string;
      title: string;
      description: string;
      inputSchema: any;
      outputSchema: any;
      hasDynamicOutput: boolean;
    }>
  > {
    let http = this.getAxios();
    let response = await http.get(
      `/core/v1/connectors/${encodeURIComponent(connectorName)}/versions/${encodeURIComponent(version)}/operations`
    );
    let ops = response.data.elements || response.data;
    return (Array.isArray(ops) ? ops : []).map((op: any) => ({
      operationName: op.name,
      title: op.title,
      description: op.description,
      inputSchema: op.inputSchema,
      outputSchema: op.outputSchema,
      hasDynamicOutput: op.hasDynamicOutput ?? false
    }));
  }

  async getServiceEnvironments(
    connectorName: string,
    version: string
  ): Promise<
    Array<{
      serviceEnvironmentId: string;
      title: string;
      scopes: any[];
      userData: any;
      credentials: any;
    }>
  > {
    let http = this.getAxios();
    let response = await http.get(
      `/core/v1/connectors/${encodeURIComponent(connectorName)}/versions/${encodeURIComponent(version)}/service-environments`
    );
    let envs = response.data.elements || response.data;
    return (Array.isArray(envs) ? envs : []).map((env: any) => ({
      serviceEnvironmentId: env.id,
      title: env.title || '',
      scopes: env.scopes || [],
      userData: env.userData || null,
      credentials: env.credentials || null
    }));
  }

  async callConnector(
    connectorName: string,
    version: string,
    operation: string,
    authId: string,
    operationInput: Record<string, any>
  ): Promise<{ outcome: string; output: any }> {
    let http = this.getAxios();
    let response = await http.post(
      `/core/v1/connectors/${encodeURIComponent(connectorName)}/versions/${encodeURIComponent(version)}/call`,
      {
        operation,
        authId,
        input: operationInput
      }
    );
    return {
      outcome: response.data.outcome,
      output: response.data.output
    };
  }

  // ---- Authentications (REST) ----

  async createAuthentication(input: {
    name: string;
    serviceEnvironmentId: string;
    data: Record<string, any>;
    scopes?: string[];
    hidden?: boolean;
  }): Promise<{ authenticationId: string }> {
    let http = this.getAxios();
    let response = await http.post('/core/v1/authentications', {
      name: input.name,
      serviceEnvironmentId: input.serviceEnvironmentId,
      data: input.data,
      scopes: input.scopes || [],
      hidden: input.hidden ?? false
    });
    return { authenticationId: response.data.id || response.data.authenticationId };
  }

  async getAuthentication(
    authenticationId: string,
    includeCredentials?: boolean
  ): Promise<{
    authenticationId: string;
    name: string;
    serviceEnvironmentId: string;
    scopes: string[];
  }> {
    let http = this.getAxios();
    let url = `/core/v1/authentications/${encodeURIComponent(authenticationId)}`;
    if (includeCredentials) {
      url += '?include_credentials=true';
    }
    let response = await http.get(url);
    return {
      authenticationId: response.data.id || authenticationId,
      name: response.data.name,
      serviceEnvironmentId: response.data.serviceEnvironmentId,
      scopes: response.data.scopes || []
    };
  }

  async deleteAuthentication(authenticationId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/core/v1/authentications/${encodeURIComponent(authenticationId)}`);
  }
}
