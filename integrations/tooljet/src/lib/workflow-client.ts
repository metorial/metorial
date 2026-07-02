import { createAxios } from 'slates';

export class WorkflowClient {
  private axios;

  constructor(options: { baseUrl: string }) {
    this.axios = createAxios({
      baseURL: `${options.baseUrl.replace(/\/+$/, '')}/api/v2/webhooks/workflows`,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async triggerWorkflow(
    workflowId: string,
    workflowToken: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${encodeURIComponent(workflowId)}/trigger`,
      parameters ?? {},
      {
        headers: {
          Authorization: `Bearer ${workflowToken}`
        }
      }
    );
    return response.data;
  }
}
