import { createAxios } from 'slates';

let DEFAULT_API_URL = 'https://api.grafbase.com/graphql';

export interface ClientConfig {
  token: string;
  apiUrl?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let baseURL = config.apiUrl || DEFAULT_API_URL;
    // Extract base URL (remove /graphql suffix if present for baseURL)
    let base = baseURL.replace(/\/graphql$/, '');
    this.axios = createAxios({
      baseURL: base,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    let response = await this.axios.post('/graphql', {
      query,
      variables
    });

    let data = response.data;

    if (data.errors && data.errors.length > 0) {
      let messages = data.errors.map((e: any) => e.message).join('; ');
      throw new Error(`GraphQL error: ${messages}`);
    }

    return data.data;
  }

  // ---- Account & Organization ----

  async getViewer(): Promise<any> {
    let result = await this.graphql(`
      query {
        viewer {
          user {
            id
            name
          }
          organizations {
            nodes {
              id
              name
              slug
            }
          }
        }
      }
    `);
    return result.viewer;
  }

  async getAccountBySlug(slug: string): Promise<any> {
    let result = await this.graphql(
      `
      query GetAccount($slug: String!) {
        accountBySlug(slug: $slug) {
          id
          name
          slug
        }
      }
    `,
      { slug }
    );
    return result.accountBySlug;
  }

  // ---- Graph Management ----

  async createGraph(input: { accountId: string; slug: string }): Promise<any> {
    let result = await this.graphql(
      `
      mutation CreateGraph($input: GraphCreateInput!) {
        graphCreate(input: $input) {
          ... on GraphCreateSuccess {
            graph {
              id
              slug
              createdAt
            }
          }
          ... on AccountDoesNotExistError {
            __typename
          }
          ... on SlugTooLongError {
            __typename
          }
          ... on SlugInvalidError {
            __typename
          }
          ... on SlugAlreadyExistsError {
            __typename
          }
          ... on DuplicateGraphError {
            __typename
          }
        }
      }
    `,
      { input }
    );

    let payload = result.graphCreate;
    if (payload.__typename && payload.__typename !== 'GraphCreateSuccess') {
      throw new Error(`Failed to create graph: ${payload.__typename}`);
    }
    return payload.graph;
  }

  async getGraph(accountSlug: string, graphSlug: string): Promise<any> {
    let result = await this.graphql(
      `
      query GetGraph($accountSlug: String!, $graphSlug: String!) {
        graphByAccountSlug(accountSlug: $accountSlug, graphSlug: $graphSlug) {
          id
          slug
          createdAt
          account {
            id
            name
            slug
          }
          branches {
            nodes {
              id
              name
            }
          }
        }
      }
    `,
      { accountSlug, graphSlug }
    );
    return result.graphByAccountSlug;
  }

  async getGraphById(graphId: string): Promise<any> {
    let result = await this.graphql(
      `
      query GetGraphByID($id: ID!) {
        node(id: $id) {
          ... on Graph {
            id
            slug
            createdAt
            account {
              id
              name
              slug
            }
            branches {
              nodes {
                id
                name
              }
            }
          }
        }
      }
    `,
      { id: graphId }
    );
    return result.node;
  }

  async deleteGraph(input: { graphId: string }): Promise<any> {
    let result = await this.graphql(
      `
      mutation DeleteGraph($input: GraphDeleteInput!) {
        graphDelete(input: $input) {
          ... on GraphDeleteSuccess {
            __typename
          }
          ... on GraphDoesNotExistError {
            __typename
          }
        }
      }
    `,
      { input }
    );

    let payload = result.graphDelete;
    if (payload.__typename === 'GraphDoesNotExistError') {
      throw new Error('Graph does not exist');
    }
    return payload;
  }

  // ---- Branch Management ----

  async createBranch(input: { graphId: string; name: string }): Promise<any> {
    let result = await this.graphql(
      `
      mutation CreateBranch($input: BranchCreateInput!) {
        branchCreate(input: $input) {
          ... on BranchCreateSuccess {
            branch {
              id
              name
            }
          }
          ... on GraphDoesNotExistError {
            __typename
          }
          ... on BranchAlreadyExistsError {
            __typename
          }
        }
      }
    `,
      { input }
    );

    let payload = result.branchCreate;
    if (payload.__typename && payload.__typename !== 'BranchCreateSuccess') {
      throw new Error(`Failed to create branch: ${payload.__typename}`);
    }
    return payload.branch;
  }

  async getBranch(accountSlug: string, graphSlug: string, branchName: string): Promise<any> {
    let result = await this.graphql(
      `
      query GetBranch($accountSlug: String!, $graphSlug: String!, $branchName: String!) {
        branch(accountSlug: $accountSlug, graphSlug: $graphSlug, name: $branchName) {
          id
          name
          operationChecksEnabled
        }
      }
    `,
      { accountSlug, graphSlug, branchName }
    );
    return result.branch;
  }

  async deleteBranch(
    accountSlug: string,
    graphSlug: string,
    branchName: string
  ): Promise<any> {
    let result = await this.graphql(
      `
      mutation DeleteBranch($accountSlug: String!, $graphSlug: String!, $branchName: String!) {
        branchDelete(accountSlug: $accountSlug, graphSlug: $graphSlug, branchName: $branchName) {
          ... on BranchDeleteSuccess {
            __typename
          }
          ... on BranchDoesNotExistError {
            __typename
          }
          ... on CannotDeleteProductionBranchError {
            __typename
          }
        }
      }
    `,
      { accountSlug, graphSlug, branchName }
    );

    let payload = result.branchDelete;
    if (payload.__typename === 'BranchDoesNotExistError') {
      throw new Error('Branch does not exist');
    }
    if (payload.__typename === 'CannotDeleteProductionBranchError') {
      throw new Error('Cannot delete the production branch');
    }
    return payload;
  }

  // ---- Schema Registry: Publish ----

  async publishSubgraph(input: {
    graphId: string;
    branch?: string;
    name: string;
    url?: string;
    schema: string;
    message?: string;
  }): Promise<any> {
    let result = await this.graphql(
      `
      mutation SubgraphPublish($input: SubgraphPublishInput!) {
        subgraphPublish(input: $input) {
          ... on SubgraphPublishSuccess {
            __typename
            compositionErrors
          }
          ... on SubgraphPublishError {
            __typename
            message
          }
        }
      }
    `,
      { input }
    );

    let payload = result.subgraphPublish;
    if (payload.__typename === 'SubgraphPublishError') {
      throw new Error(`Subgraph publish error: ${payload.message}`);
    }
    return payload;
  }

  // ---- Schema Registry: Check ----

  async checkSubgraph(input: {
    graphId: string;
    branch?: string;
    name: string;
    schema: string;
  }): Promise<any> {
    let result = await this.graphql(
      `
      mutation SubgraphCheck($input: SubgraphCheckInput!) {
        subgraphCheck(input: $input) {
          ... on SubgraphCheckSuccess {
            __typename
            compositionErrors
            breakingChanges {
              severity
              message
              path
            }
            lintErrors {
              message
              severity
            }
          }
          ... on SubgraphCheckError {
            __typename
            message
          }
        }
      }
    `,
      { input }
    );

    let payload = result.subgraphCheck;
    if (payload.__typename === 'SubgraphCheckError') {
      throw new Error(`Subgraph check error: ${payload.message}`);
    }
    return payload;
  }

  // ---- Subgraph Listing ----

  async listSubgraphs(
    accountSlug: string,
    graphSlug: string,
    branch?: string
  ): Promise<any[]> {
    let branchName = branch || 'main';
    let result = await this.graphql(
      `
      query ListSubgraphs($accountSlug: String!, $graphSlug: String!, $branchName: String!) {
        branch(accountSlug: $accountSlug, graphSlug: $graphSlug, name: $branchName) {
          subgraphs {
            name
            url
            schema
          }
        }
      }
    `,
      { accountSlug, graphSlug, branchName }
    );
    return result.branch?.subgraphs || [];
  }

  // ---- Schema Retrieval ----

  async getSchema(
    accountSlug: string,
    graphSlug: string,
    branch?: string,
    subgraphName?: string
  ): Promise<string | null> {
    let branchName = branch || 'main';

    if (subgraphName) {
      let result = await this.graphql(
        `
        query GetSubgraphSchema($accountSlug: String!, $graphSlug: String!, $branchName: String!) {
          branch(accountSlug: $accountSlug, graphSlug: $graphSlug, name: $branchName) {
            subgraphs {
              name
              schema
            }
          }
        }
      `,
        { accountSlug, graphSlug, branchName }
      );

      let subgraphs = result.branch?.subgraphs || [];
      let subgraph = subgraphs.find((s: any) => s.name === subgraphName);
      return subgraph?.schema || null;
    }

    let result = await this.graphql(
      `
      query GetFederatedSchema($accountSlug: String!, $graphSlug: String!, $branchName: String!) {
        branch(accountSlug: $accountSlug, graphSlug: $graphSlug, name: $branchName) {
          federatedSchema
        }
      }
    `,
      { accountSlug, graphSlug, branchName }
    );

    return result.branch?.federatedSchema || null;
  }

  // ---- Generic GraphQL ----

  async executeGraphQL(query: string, variables?: Record<string, any>): Promise<any> {
    return this.graphql(query, variables);
  }
}
