import { createAxios } from '@slates/provider';
import { withFirebaseApiError } from './errors';

let remoteConfigAxios = createAxios({
  baseURL: 'https://firebaseremoteconfig.googleapis.com/v1'
});

export interface RemoteConfigParameter {
  defaultValue?: { value: string } | { useInAppDefault: boolean };
  conditionalValues?: Record<string, { value: string }>;
  description?: string;
  valueType?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
}

export interface RemoteConfigCondition {
  name: string;
  expression: string;
  tagColor?: string;
}

export interface RemoteConfigTemplate {
  conditions: RemoteConfigCondition[];
  parameters: Record<string, RemoteConfigParameter>;
  parameterGroups: Record<
    string,
    {
      description?: string;
      parameters: Record<string, RemoteConfigParameter>;
    }
  >;
  etag: string;
  version?: {
    versionNumber?: string;
    updateTime?: string;
    updateUser?: {
      email?: string;
    };
    updateOrigin?: string;
    updateType?: string;
    description?: string;
  };
}

export class RemoteConfigClient {
  private token: string;
  private projectId: string;

  constructor(params: { token: string; projectId: string }) {
    this.token = params.token;
    this.projectId = params.projectId;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'x-goog-user-project': this.projectId
    };
  }

  async getTemplate(): Promise<RemoteConfigTemplate> {
    let response = await withFirebaseApiError('Remote Config get template', () =>
      remoteConfigAxios.get(`/projects/${this.projectId}/remoteConfig`, {
        headers: this.headers
      })
    );

    return {
      ...response.data,
      etag: response.headers.etag || response.data.etag || ''
    };
  }

  async publishTemplate(
    template: {
      conditions?: RemoteConfigCondition[];
      parameters?: Record<string, RemoteConfigParameter>;
      parameterGroups?: Record<
        string,
        { description?: string; parameters: Record<string, RemoteConfigParameter> }
      >;
    },
    etag: string
  ): Promise<RemoteConfigTemplate> {
    let response = await withFirebaseApiError('Remote Config publish template', () =>
      remoteConfigAxios.put(`/projects/${this.projectId}/remoteConfig`, template, {
        headers: {
          ...this.headers,
          'If-Match': etag
        }
      })
    );

    return {
      ...response.data,
      etag: response.headers.etag || response.data.etag || ''
    };
  }

  async listVersions(params?: { pageSize?: number; pageToken?: string }): Promise<{
    versions: Array<{
      versionNumber: string;
      updateTime: string;
      updateUser?: { email?: string };
      updateOrigin?: string;
      updateType?: string;
      description?: string;
    }>;
    nextPageToken?: string;
  }> {
    let response = await withFirebaseApiError('Remote Config list versions', () =>
      remoteConfigAxios.get(`/projects/${this.projectId}/remoteConfig:listVersions`, {
        headers: this.headers,
        params: {
          pageSize: params?.pageSize || 10,
          pageToken: params?.pageToken
        }
      })
    );

    return {
      versions: response.data.versions || [],
      nextPageToken: response.data.nextPageToken
    };
  }

  async rollback(versionNumber: string): Promise<RemoteConfigTemplate> {
    let response = await withFirebaseApiError('Remote Config rollback', () =>
      remoteConfigAxios.post(
        `/projects/${this.projectId}/remoteConfig:rollback`,
        {
          versionNumber
        },
        {
          headers: this.headers
        }
      )
    );

    return {
      ...response.data,
      etag: response.headers.etag || response.data.etag || ''
    };
  }
}
