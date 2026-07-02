import { createAxios } from 'slates';

export interface GraphQLClientConfig {
  token: string;
  spaceId: string;
  environmentId: string;
  region: 'us' | 'eu';
  preview?: boolean;
  previewToken?: string;
}

let getGraphQLBaseUrl = (region: 'us' | 'eu') =>
  region === 'eu' ? 'https://graphql.eu.contentful.com' : 'https://graphql.contentful.com';

export class ContentfulGraphQLClient {
  private http: ReturnType<typeof createAxios>;
  private spaceId: string;
  private environmentId: string;

  constructor(config: GraphQLClientConfig) {
    this.spaceId = config.spaceId;
    this.environmentId = config.environmentId;

    let effectiveToken =
      config.preview && config.previewToken ? config.previewToken : config.token;

    this.http = createAxios({
      baseURL: getGraphQLBaseUrl(config.region),
      headers: {
        Authorization: `Bearer ${effectiveToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private graphqlPath() {
    return `/content/v1/spaces/${this.spaceId}/environments/${this.environmentId}`;
  }

  async query(query: string, variables?: Record<string, any>): Promise<any> {
    let body: Record<string, any> = { query };
    if (variables && Object.keys(variables).length > 0) {
      body.variables = variables;
    }

    let response = await this.http.post(this.graphqlPath(), body);
    return response.data;
  }

  async introspect(): Promise<any> {
    let introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          types {
            kind
            name
            description
            fields(includeDeprecated: false) {
              name
              description
              type {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
              args {
                name
                description
                type {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    return this.query(introspectionQuery);
  }

  async getAvailableContentTypes(): Promise<any> {
    let introspectionQuery = `
      query {
        __schema {
          queryType {
            fields {
              name
              description
              type {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    `;

    return this.query(introspectionQuery);
  }
}
