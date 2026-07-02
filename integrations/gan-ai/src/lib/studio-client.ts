import { createAxios } from 'slates';

export class StudioClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.gan.ai',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ---- Workspaces ----

  async listWorkspaces(): Promise<{
    workspaces: Array<{
      workspace_id: string;
      role: string;
      title: string;
    }>;
  }> {
    let response = await this.axios.get('/workspaces');
    return response.data;
  }

  // ---- Projects ----

  async listProjects(workspaceId: string): Promise<{
    data: Array<{
      user_id: string;
      project_id: string;
      title: string;
      project_type: string;
      thumbnail: string | null;
      status: string;
      language: string | null;
      tags: { colors: string[]; names: string[] } | null;
      available_credits: number;
      utilised_credits: number;
      video: string | null;
      smart_url: string | null;
      recording_script: string | null;
      created_at: string;
      updated_at: string;
    }>;
    size: number;
    unpublished_projects: number;
  }> {
    let response = await this.axios.get('/projects/v2', {
      headers: {
        'x-workspace-id': workspaceId
      }
    });
    return response.data;
  }

  // ---- Personalized Video Creation ----

  async createVideos(params: {
    workspaceId: string;
    projectId: string;
    videos: Record<string, string>[];
  }): Promise<
    Array<{
      video_url: string;
      audio_url: string;
      inference_id: string;
      project_id: string;
      unique_id: string;
      smart_url: string;
      permalink: string;
      thumbnail_url: string;
    }>
  > {
    let response = await this.axios.post('/create_video/bulk', params.videos, {
      params: {
        project_id: params.projectId
      },
      headers: {
        'x-workspace-id': params.workspaceId
      }
    });
    return response.data;
  }

  // ---- Video Status ----

  async getVideoStatus(params: {
    workspaceId: string;
    projectId: string;
    inferenceId: string;
  }): Promise<{
    gen_status: string;
    video_url: string | null;
    permalink: string | null;
    thumbnail_url: string | null;
    smart_url: string | null;
    error: { status_code: number; message: string } | null;
  }> {
    let response = await this.axios.get(
      `/projects/${params.projectId}/inference/${params.inferenceId}/video_status`,
      {
        headers: {
          'x-workspace-id': params.workspaceId
        }
      }
    );
    return response.data;
  }

  // ---- Webhooks ----

  async registerWebhook(params: {
    projectId: string;
    url: string;
    enable?: boolean;
    authorization?: string;
  }): Promise<{
    enable: boolean;
    url: string;
    Authorization: string;
    message: string;
  }> {
    let response = await this.axios.post(`/projects/${params.projectId}/webhook`, {
      enable: params.enable ?? true,
      url: params.url,
      ...(params.authorization ? { Authorization: params.authorization } : {})
    });
    return response.data;
  }

  async unregisterWebhook(projectId: string): Promise<{
    enable: boolean;
    url: string;
    message: string;
  }> {
    let response = await this.axios.post(`/projects/${projectId}/webhook`, {
      enable: false,
      url: ''
    });
    return response.data;
  }
}
