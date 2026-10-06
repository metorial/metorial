import { createAxios } from 'slates';
import { clean, fail, id, instance, jsonBytes, type Row, token, upstream } from './validation';
export class WorkflowClient {
  private baseUrl: string;
  private secrets: string[];
  constructor(options: { baseUrl: string; secrets?: string[] }) {
    this.baseUrl = instance(options.baseUrl);
    this.secrets = options.secrets ?? [];
  }
  async invoke(
    workflowId: string,
    workflowToken: string,
    action: 'trigger' | 'triggerAsync' | 'status',
    parameters?: Row,
    environment?: string,
    executionId?: string
  ) {
    const secret = token(workflowToken),
      workflow = id(workflowId, 'workflow ID');
    if (environment !== undefined) id(environment, 'exact environment from the webhook URL');
    if (action === 'status' && !executionId)
      fail('Provide executionId returned by triggerAsync.', 'invalid_input');
    if (action === 'status' && parameters !== undefined)
      fail('Status requests do not accept workflow parameters.', 'invalid_input');
    const bytes = jsonBytes(parameters ?? {});
    const axios = createAxios({
      baseURL: `${this.baseUrl}/api/v2/webhooks/workflows`,
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024
    });
    let response: { data: unknown; headers: Record<string, unknown> };
    try {
      response = await axios.request<unknown>({
        method: action === 'status' ? 'GET' : 'POST',
        url: `/${encodeURIComponent(workflow)}/${action === 'status' ? `status/${encodeURIComponent(id(executionId, 'execution ID'))}` : action === 'triggerAsync' ? 'trigger-async' : 'trigger'}`,
        params: { environment },
        data: action === 'status' ? undefined : JSON.parse(bytes.toString('utf8'))
      });
    } catch (e) {
      throw upstream(e, action !== 'status');
    }
    clean({ ...response.headers }, [secret, ...this.secrets]);
    return clean(response.data, [secret, ...this.secrets]);
  }
}
