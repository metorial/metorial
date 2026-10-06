import { encodeFormBody } from './client';
import { createTwilioAxios } from './http';
import { pathId } from './validation';

export class StudioClient {
  private axios: ReturnType<typeof createTwilioAxios>;

  constructor(token: string, accountSid?: string, pageToken?: string) {
    this.axios = createTwilioAxios('studio', token, accountSid, pageToken);
  }

  async listFlows(pageSize?: number): Promise<any> {
    let response = await this.axios.get('/Flows', {
      params: { PageSize: pageSize ?? 50 }
    });
    return response.data;
  }

  async getFlow(flowSid: string): Promise<any> {
    let response = await this.axios.get(`/Flows/${pathId(flowSid)}`);
    return response.data;
  }

  async deleteFlow(flowSid: string): Promise<void> {
    await this.axios.delete(`/Flows/${pathId(flowSid)}`);
  }

  async triggerFlowExecution(
    flowSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Flows/${pathId(flowSid)}/Executions`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async listExecutions(flowSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`/Flows/${pathId(flowSid)}/Executions`, {
      params: { PageSize: pageSize ?? 50 }
    });
    return response.data;
  }

  async getExecution(flowSid: string, executionSid: string): Promise<any> {
    let response = await this.axios.get(
      `/Flows/${pathId(flowSid)}/Executions/${pathId(executionSid)}`
    );
    return response.data;
  }

  async listExecutionSteps(
    flowSid: string,
    executionSid: string,
    pageSize?: number
  ): Promise<any> {
    let response = await this.axios.get(
      `/Flows/${pathId(flowSid)}/Executions/${pathId(executionSid)}/Steps`,
      {
        params: { PageSize: pageSize ?? 50 }
      }
    );
    return response.data;
  }
}
