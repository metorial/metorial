import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  requestAxiosData
} from 'slates';

let DEFAULT_API_URL = 'https://api.grafbase.com/graphql';

export interface ClientConfig {
  token: string;
  apiUrl?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface Connection<T> {
  nodes: T[];
  pageInfo: PageInfo;
}

interface Account {
  id: string;
  name: string;
  slug: string;
}

interface Branch {
  id: string;
  name: string;
  operationChecksEnabled?: boolean;
}

interface GraphSummary {
  id: string;
  slug: string;
  createdAt: string;
}

export interface Graph extends GraphSummary {
  account: Account;
  productionBranch: Branch;
  branches: Connection<Branch>;
}

interface Subgraph {
  name: string;
  url: string | null;
  schema: string;
}

interface Viewer {
  id: string;
  name: string;
  organizations: Connection<Account>;
}

interface MutationPayload {
  __typename: string;
  graph?: GraphSummary;
  branch?: Branch | null;
  messages?: string[];
  deploymentError?: string;
}

interface Diagnostic {
  message: string;
  severity: string;
  step: string;
}

interface SchemaCheckPayload extends MutationPayload {
  id: string;
  errorCount: number;
  diagnostics: Diagnostic[];
}

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: { message?: string; extensions?: { code?: string } }[];
}

let graphFields = `
  id
  slug
  createdAt
  account { id name slug }
  productionBranch { id name }
  branches(first: $first, after: $after) {
    nodes { id name }
    pageInfo { hasNextPage endCursor }
  }
`;

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private endpoint: string;

  constructor(config: ClientConfig) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Grafbase personal access token is required.');
    }

    try {
      let endpoint = new URL(config.apiUrl || DEFAULT_API_URL);
      if (!['http:', 'https:'].includes(endpoint.protocol)) {
        throw createApiServiceError('Grafbase API URL must use HTTP or HTTPS.');
      }
      if (endpoint.pathname === '/') endpoint.pathname = '/graphql';
      this.endpoint = endpoint.toString();
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Grafbase',
        reason: 'invalid_api_url',
        operation: 'configure API URL',
        fallbackMessage: 'Provide a valid Grafbase GraphQL API URL.'
      });
    }

    this.axios = createAuthenticatedAxios({
      authHeader: { value: `Bearer ${config.token}` }
    });
  }

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    let response = await requestAxiosData<GraphQLResponse<T>>(
      'GraphQL request',
      () => this.axios.post(this.endpoint, { query, variables }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Grafbase',
          reason: 'grafbase_api_error',
          operation
        })
    );

    if (response?.errors?.length) {
      throw createApiServiceError(
        `Grafbase GraphQL request failed: ${response.errors.map(error => error.message || 'Unknown GraphQL error').join('; ')}`,
        { upstreamCode: response.errors[0]?.extensions?.code }
      );
    }
    if (response?.data == null) {
      throw createApiServiceError('Grafbase returned no GraphQL response data.');
    }
    return response.data;
  }

  private requireSuccess<T extends MutationPayload>(
    payload: T | null | undefined,
    expected: string[],
    operation: string
  ): T {
    if (!payload || !expected.includes(payload.__typename)) {
      throw createApiServiceError(
        `Grafbase ${operation} failed: ${payload?.deploymentError || payload?.messages?.join('; ') || payload?.__typename || 'Missing mutation result'}.`,
        { upstreamCode: payload?.__typename }
      );
    }
    return payload;
  }

  async getViewer(first = 100, after?: string): Promise<Viewer> {
    let result = await this.graphql<{ viewer: Viewer | null }>(
      `
      query GetViewer($first: Int!, $after: String) {
        viewer {
          id
          name
          organizations(first: $first, after: $after) {
            nodes { id name slug }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `,
      { first, after }
    );
    if (!result.viewer) {
      throw createApiServiceError(
        'No Grafbase user was returned. Use a personal access token with Management API access.'
      );
    }
    return result.viewer;
  }

  async getAccountBySlug(slug: string): Promise<Account> {
    let result = await this.graphql<{ accountBySlug: Account | null }>(
      `
      query GetAccount($slug: String!) {
        accountBySlug(slug: $slug) { id name slug }
      }
    `,
      { slug }
    );
    if (!result.accountBySlug) throw createApiServiceError('Grafbase account not found.');
    return result.accountBySlug;
  }

  async listGraphs(accountSlug: string, first = 100, after?: string) {
    let result = await this.graphql<{
      accountBySlug:
        | (Account & { graphs: Connection<Pick<Graph, 'id' | 'slug' | 'createdAt'>> })
        | null;
    }>(
      `
      query ListGraphs($slug: String!, $first: Int!, $after: String) {
        accountBySlug(slug: $slug) {
          id name slug
          graphs(first: $first, after: $after) {
            nodes { id slug createdAt }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `,
      { slug: accountSlug, first, after }
    );
    if (!result.accountBySlug) throw createApiServiceError('Grafbase account not found.');
    return result.accountBySlug;
  }

  async createGraph(input: { accountId: string; slug: string }): Promise<GraphSummary> {
    let result = await this.graphql<{ graphCreate: MutationPayload }>(
      `
      mutation CreateGraph($input: GraphCreateInput!) {
        graphCreate(input: $input) {
          __typename
          ... on GraphCreateSuccess { graph { id slug createdAt } }
        }
      }
    `,
      { input: { accountId: input.accountId, graphSlug: input.slug } }
    );
    let payload = this.requireSuccess(
      result.graphCreate,
      ['GraphCreateSuccess'],
      'create graph'
    );
    if (!payload.graph)
      throw createApiServiceError('Grafbase did not return the created graph.');
    return payload.graph;
  }

  async getGraph(
    accountSlug: string,
    graphSlug: string,
    first = 100,
    after?: string
  ): Promise<Graph | null> {
    let result = await this.graphql<{ graphByAccountSlug: Graph | null }>(
      `
      query GetGraph($accountSlug: String!, $graphSlug: String!, $first: Int!, $after: String) {
        graphByAccountSlug(accountSlug: $accountSlug, graphSlug: $graphSlug) { ${graphFields} }
      }
    `,
      { accountSlug, graphSlug, first, after }
    );
    return result.graphByAccountSlug;
  }

  async getGraphById(graphId: string, first = 100, after?: string): Promise<Graph | null> {
    let result = await this.graphql<{ node: (Graph & { __typename: string }) | null }>(
      `
      query GetGraphByID($id: ID!, $first: Int!, $after: String) {
        node(id: $id) {
          __typename
          ... on Graph { ${graphFields} }
        }
      }
    `,
      { id: graphId, first, after }
    );
    return result.node?.__typename === 'Graph' ? result.node : null;
  }

  async deleteGraph(input: { graphId: string }) {
    let result = await this.graphql<{ graphDelete: MutationPayload }>(
      `
      mutation DeleteGraph($input: GraphDeleteInput!) {
        graphDelete(input: $input) { __typename }
      }
    `,
      { input: { id: input.graphId } }
    );
    this.requireSuccess(result.graphDelete, ['GraphDeleteSuccess'], 'delete graph');
  }

  private async requireGraph(graphId: string): Promise<Graph> {
    let graph = await this.getGraphById(graphId, 1);
    if (!graph)
      throw createApiServiceError(
        'Grafbase graph not found. Call list_graphs to discover graph IDs.'
      );
    return graph;
  }

  async createBranch(input: { graphId: string; name: string }): Promise<Branch> {
    let graph = await this.requireGraph(input.graphId);
    let result = await this.graphql<{ branchCreate: MutationPayload }>(
      `
      mutation CreateBranch($input: BranchCreateInput!, $accountSlug: String!, $graphSlug: String!, $branchName: String!) {
        branchCreate(input: $input) {
          __typename
          ... on Query {
            branch(accountSlug: $accountSlug, graphSlug: $graphSlug, name: $branchName) { id name }
          }
        }
      }
    `,
      {
        input: {
          accountSlug: graph.account.slug,
          graphSlug: graph.slug,
          branchName: input.name
        },
        accountSlug: graph.account.slug,
        graphSlug: graph.slug,
        branchName: input.name
      }
    );
    let payload = this.requireSuccess(result.branchCreate, ['Query'], 'create branch');
    if (!payload.branch)
      throw createApiServiceError('Grafbase did not return the created branch.');
    return payload.branch;
  }

  async getBranch(
    accountSlug: string,
    graphSlug: string,
    branchName: string
  ): Promise<Branch | null> {
    let result = await this.graphql<{ branch: Branch | null }>(
      `
      query GetBranch($accountSlug: String!, $graphSlug: String!, $branchName: String!) {
        branch(accountSlug: $accountSlug, graphSlug: $graphSlug, name: $branchName) {
          id name operationChecksEnabled
        }
      }
    `,
      { accountSlug, graphSlug, branchName }
    );
    return result.branch;
  }

  async deleteBranch(accountSlug: string, graphSlug: string, branchName: string) {
    let result = await this.graphql<{ branchDelete: MutationPayload }>(
      `
      mutation DeleteBranch($accountSlug: String!, $graphSlug: String!, $branchName: String!) {
        branchDelete(accountSlug: $accountSlug, graphSlug: $graphSlug, branchName: $branchName) { __typename }
      }
    `,
      { accountSlug, graphSlug, branchName }
    );
    this.requireSuccess(result.branchDelete, ['Query'], 'delete branch');
  }

  async publishSubgraph(input: {
    graphId: string;
    branch?: string;
    name: string;
    url?: string;
    schema: string;
    message?: string;
    virtual?: boolean;
  }) {
    let graph = await this.requireGraph(input.graphId);
    let result = await this.graphql<{ publish: MutationPayload }>(
      `
      mutation PublishSubgraph($input: PublishInput!) {
        publish(input: $input) {
          __typename
          ... on FederatedGraphCompositionError { messages }
          ... on PublishDeploymentFailure { deploymentError }
        }
      }
    `,
      {
        input: {
          accountSlug: graph.account.slug,
          graphSlug: graph.slug,
          subgraph: input.name,
          schema: input.schema,
          url: input.url,
          branch: input.branch,
          message: input.message,
          virtual: input.virtual
        }
      }
    );
    let payload = this.requireSuccess(
      result.publish,
      ['PublishSuccess', 'PublishNoChange', 'FederatedGraphCompositionError'],
      'publish subgraph'
    );
    return {
      published: payload.__typename !== 'FederatedGraphCompositionError',
      compositionErrors: payload.messages || []
    };
  }

  async checkSubgraph(input: {
    graphId: string;
    branch?: string;
    name: string;
    schema: string;
  }) {
    let graph = await this.requireGraph(input.graphId);
    let result = await this.graphql<{ schemaCheckCreate: SchemaCheckPayload }>(
      `
      mutation CheckSubgraph($input: SchemaCheckCreateInput!) {
        schemaCheckCreate(input: $input) {
          __typename
          ... on SchemaCheck { id errorCount diagnostics { message severity step } }
        }
      }
    `,
      {
        input: {
          accountSlug: graph.account.slug,
          graphSlug: graph.slug,
          subgraphName: input.name,
          schema: input.schema,
          branch: input.branch
        }
      }
    );
    return this.requireSuccess(result.schemaCheckCreate, ['SchemaCheck'], 'check subgraph');
  }

  async listSubgraphs(
    accountSlug: string,
    graphSlug: string,
    branch?: string
  ): Promise<Subgraph[]> {
    let result = await this.graphql<{ branch: { subgraphs: Subgraph[] } | null }>(
      `
      query ListSubgraphs($accountSlug: String!, $graphSlug: String!, $branchName: String) {
        branch(accountSlug: $accountSlug, graphSlug: $graphSlug, name: $branchName) {
          subgraphs { name url schema }
        }
      }
    `,
      { accountSlug, graphSlug, branchName: branch || 'main' }
    );
    if (!result.branch) throw createApiServiceError('Grafbase branch not found.');
    return result.branch.subgraphs;
  }

  async getSchema(
    accountSlug: string,
    graphSlug: string,
    branch?: string,
    subgraphName?: string
  ): Promise<string | null> {
    if (subgraphName) {
      let subgraphs = await this.listSubgraphs(accountSlug, graphSlug, branch);
      return subgraphs.find(subgraph => subgraph.name === subgraphName)?.schema ?? null;
    }
    let result = await this.graphql<{ branch: { federatedSchema: string | null } | null }>(
      `
      query GetFederatedSchema($accountSlug: String!, $graphSlug: String!, $branchName: String) {
        branch(accountSlug: $accountSlug, graphSlug: $graphSlug, name: $branchName) { federatedSchema }
      }
    `,
      { accountSlug, graphSlug, branchName: branch || 'main' }
    );
    if (!result.branch) throw createApiServiceError('Grafbase branch not found.');
    return result.branch.federatedSchema;
  }

  async executeGraphQL(query: string, variables?: Record<string, unknown>): Promise<unknown> {
    return this.graphql(query, variables);
  }
}
