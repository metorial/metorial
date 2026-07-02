import { createAxios } from 'slates';
import { encodeFormBody } from './client';

export class StudioClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://studio.twilio.com/v2',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  async listFlows(pageSize?: number): Promise<any> {
    let response = await this.axios.get('/Flows', {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getFlow(flowSid: string): Promise<any> {
    let response = await this.axios.get(`/Flows/${flowSid}`);
    return response.data;
  }

  async deleteFlow(flowSid: string): Promise<void> {
    await this.axios.delete(`/Flows/${flowSid}`);
  }

  async triggerFlowExecution(
    flowSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Flows/${flowSid}/Executions`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async listExecutions(flowSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`/Flows/${flowSid}/Executions`, {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getExecution(flowSid: string, executionSid: string): Promise<any> {
    let response = await this.axios.get(`/Flows/${flowSid}/Executions/${executionSid}`);
    return response.data;
  }

  async listExecutionSteps(
    flowSid: string,
    executionSid: string,
    pageSize?: number
  ): Promise<any> {
    let response = await this.axios.get(`/Flows/${flowSid}/Executions/${executionSid}/Steps`, {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }
}
