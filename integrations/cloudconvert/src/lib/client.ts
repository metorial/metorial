import { createAxios, pickDefined } from 'slates';
import { z } from 'zod';
import { containsCredential, invalidInput, invalidResponse, upstreamError } from './errors';
import {
  environmentSchema,
  formatSchema,
  jobPageSchema,
  jobSchema,
  taskPageSchema,
  taskSchema,
  userSchema
} from './schemas';
import { exactId, httpUrl, type Tasks, validateTasks } from './validation';

const BASE_URLS = {
  production: 'https://api.cloudconvert.com/v2',
  sandbox: 'https://api.sandbox.cloudconvert.com/v2'
};
const SYNC_URLS = {
  production: 'https://sync.api.cloudconvert.com/v2',
  sandbox: 'https://api.sandbox.cloudconvert.com/v2'
};
type Request = Parameters<ReturnType<typeof createAxios>['request']>[0];
export type Connection = {
  auth: { token: string; refreshToken?: string; environment?: string };
  config?: Record<string, unknown>;
};
export const clientFor = (ctx: Connection) =>
  new Client({
    token: ctx.auth.token,
    refreshToken: ctx.auth.refreshToken,
    environment: ctx.auth.environment ?? ctx.config?.environment
  });

export class Client {
  readonly environment: 'production' | 'sandbox';
  private readonly token: string;
  private readonly secrets: string[];
  constructor(config: { token: string; refreshToken?: string; environment?: unknown }) {
    if (
      typeof config.token !== 'string' ||
      !config.token ||
      config.token !== config.token.trim() ||
      [...config.token].some(char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127)
    )
      throw invalidInput('A valid CloudConvert access token or API key is required.');
    const env = environmentSchema.safeParse(config.environment ?? 'production');
    if (!env.success) throw invalidInput('Choose the production or sandbox API environment.');
    this.environment = env.data;
    this.token = config.token;
    this.secrets = [config.token, config.refreshToken].filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    );
  }
  private async request(options: Request, operation: string, sync = false, recovery?: string) {
    try {
      const response = await createAxios({
        baseURL: sync ? SYNC_URLS[this.environment] : BASE_URLS[this.environment],
        timeout: sync ? 60000 : 30000,
        maxRedirects: 0,
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }
      }).request<unknown>(options);
      if (containsCredential(response.data, this.secrets))
        throw invalidResponse(
          'CloudConvert returned sensitive connection data instead of a usable response. Read existing resources before repeating the operation.'
        );
      return response;
    } catch (error) {
      // Expected not-found reads can otherwise return their diagnostic body with a successful deletion.
      if (error && typeof error === 'object') {
        const captured = error as { message?: unknown; data?: unknown; response?: unknown };
        if (
          containsCredential(
            { message: captured.message, data: captured.data, response: captured.response },
            this.secrets
          )
        )
          throw invalidResponse(
            'CloudConvert returned sensitive connection data. The operation outcome is not confirmed; inspect the existing resource before repeating any write.'
          );
      }
      throw upstreamError(error, operation, recovery);
    }
  }
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) throw invalidResponse();
    return result.data;
  }
  private data<T>(schema: z.ZodType<T>, value: unknown): T {
    return this.parse(z.object({ data: schema }), value).data;
  }
  private job(value: unknown) {
    const job = this.data(jobSchema, value);
    const ids = new Set<string>();
    for (const task of job.tasks) {
      if (ids.has(task.id) || (task.job_id !== undefined && task.job_id !== job.id))
        throw invalidResponse('CloudConvert returned conflicting job task identities.');
      ids.add(task.id);
    }
    return job;
  }
  confirmCreatedGraph(
    job: z.infer<typeof jobSchema>,
    tasks: Tasks,
    tag?: string,
    created?: z.infer<typeof jobSchema>
  ) {
    if (
      job.tasks.length !== Object.keys(tasks).length ||
      new Set(job.tasks.map(task => task.name)).size !== job.tasks.length ||
      (tag !== undefined && job.tag !== tag) ||
      job.tasks.some(task => {
        const requested = task.name === undefined ? undefined : tasks[task.name];
        return (
          !requested ||
          requested.operation !== task.operation ||
          (created !== undefined &&
            !created.tasks.some(
              original => original.id === task.id && original.name === task.name
            ))
        );
      })
    )
      throw invalidResponse(
        `Job ${job.id} may already exist, but its task graph was not confirmed. Use get_job or list_jobs with the supplied unique tag before repeating creation.`
      );
  }
  async createJob(tasks: Tasks, tag?: string, webhookUrl?: string, webhookEvents?: string[]) {
    validateTasks(tasks);
    if (tag !== undefined && (typeof tag !== 'string' || tag.length > 255))
      throw invalidInput('Job tag must be at most 255 characters.');
    if (webhookUrl !== undefined) httpUrl(webhookUrl, 'Webhook URL');
    if (
      webhookEvents !== undefined &&
      (!webhookUrl ||
        webhookEvents.length !== 2 ||
        !webhookEvents.includes('job.finished') ||
        !webhookEvents.includes('job.failed'))
    )
      throw invalidInput(
        'Job webhooks always send both job.finished and job.failed. Omit webhookEvents or provide those two events with webhookUrl.'
      );
    const response = await this.request(
      {
        method: 'POST',
        url: '/jobs',
        data: pickDefined({ tasks, tag, webhook_url: webhookUrl })
      },
      'create job',
      false,
      `Creation may have been accepted. Use list_jobs with the supplied unique tag${tag === undefined ? ' (no tag was supplied)' : ''} before retrying; repeating can consume credits.`
    );
    try {
      const job = this.job(response.data);
      this.confirmCreatedGraph(job, tasks, tag);
      return job;
    } catch {
      throw invalidResponse(
        'Job creation may have been accepted. Use list_jobs with the supplied unique tag before retrying; repeating can consume credits.'
      );
    }
  }
  async getJob(jobId: string, timeout?: number) {
    const id = exactId(jobId, 'Job ID');
    const response = await this.request(
      { method: 'GET', url: `/jobs/${id}`, timeout },
      'get job'
    );
    const job = this.job(response.data);
    if (job.id !== id) throw invalidResponse('CloudConvert returned a different job ID.');
    return job;
  }
  async waitForJob(jobId: string) {
    const id = exactId(jobId, 'Job ID');
    if (this.environment === 'sandbox') {
      const deadline = Date.now() + 60000;
      for (;;) {
        let job: z.infer<typeof jobSchema>;
        try {
          job = await this.getJob(id, Math.max(1, Math.min(30000, deadline - Date.now())));
        } catch {
          throw invalidResponse(
            `Job ${id} already exists, but waiting could not confirm its state. Use get_job with this ID before repeating creation.`
          );
        }
        if (job.status === 'finished' || job.status === 'error') return job;
        const remaining = deadline - Date.now();
        if (remaining <= 0)
          throw invalidResponse(
            `Job ${id} already exists and is still ${job.status}. Use get_job with this ID; do not repeat creation after the 60-second wait.`
          );
        await new Promise(resolve => setTimeout(resolve, Math.min(1000, remaining)));
      }
    }
    const response = await this.request(
      { method: 'GET', url: `/jobs/${id}` },
      'wait for job',
      true,
      `Job ${id} already exists. Use get_job with this ID before repeating creation; completion was not confirmed.`
    );
    let job: z.infer<typeof jobSchema>;
    try {
      job = this.job(response.data);
    } catch {
      throw invalidResponse(
        `Job ${id} already exists, but its completion response was incomplete. Use get_job before repeating creation.`
      );
    }
    if (job.id !== id)
      throw invalidResponse(
        `Completion of job ${id} was not confirmed because the response identified another job. Use get_job before repeating creation.`
      );
    if (job.status !== 'finished' && job.status !== 'error')
      throw invalidResponse(
        `Job ${id} already exists, but synchronous waiting returned ${job.status}. Use get_job with this ID; completion was not confirmed.`
      );
    return job;
  }
  async listJobs(
    params: { status?: string; tag?: string; perPage?: number; page?: number } = {}
  ) {
    if (params.status === 'waiting')
      throw invalidInput(
        'CloudConvert does not document a waiting filter for job lists. Omit status and inspect returned job statuses.'
      );
    this.validatePage(params);
    const response = await this.request(
      {
        method: 'GET',
        url: '/jobs',
        params: pickDefined({
          'filter[status]': params.status,
          'filter[tag]': params.tag,
          include: 'tasks',
          per_page: params.perPage,
          page: params.page
        })
      },
      'list jobs'
    );
    return this.parse(jobPageSchema, response.data);
  }
  private validatePage(params: { perPage?: number; page?: number }) {
    if (
      params.perPage !== undefined &&
      (!Number.isInteger(params.perPage) || params.perPage < 1 || params.perPage > 1000)
    )
      throw invalidInput('perPage must be an integer between 1 and 1000.');
    if (params.page !== undefined && (!Number.isSafeInteger(params.page) || params.page < 1))
      throw invalidInput('page must be a positive safe integer.');
  }
  async deleteJob(jobId: string) {
    const id = exactId(jobId, 'Job ID');
    const response = await this.request(
      { method: 'DELETE', url: `/jobs/${id}` },
      'delete job',
      false,
      `Deletion of job ${id} was not confirmed. Read that exact job before retrying.`
    );
    if (response.status !== 204)
      throw invalidResponse(
        `CloudConvert did not confirm deletion of job ${id} with HTTP 204. Read that exact job before retrying.`
      );
  }
  async getTask(taskId: string) {
    const id = exactId(taskId, 'Task ID');
    const response = await this.request(
      { method: 'GET', url: `/tasks/${id}`, params: { include: 'retries' } },
      'get task'
    );
    const task = this.data(taskSchema, response.data);
    if (task.id !== id) throw invalidResponse('CloudConvert returned a different task ID.');
    return task;
  }
  async listTasks(
    params: {
      operation?: string;
      status?: string;
      jobId?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    this.validatePage(params);
    if (params.jobId !== undefined) exactId(params.jobId, 'Job ID');
    const response = await this.request(
      {
        method: 'GET',
        url: '/tasks',
        params: pickDefined({
          'filter[operation]': params.operation,
          'filter[status]': params.status,
          'filter[job_id]': params.jobId,
          per_page: params.perPage,
          page: params.page
        })
      },
      'list tasks'
    );
    return this.parse(taskPageSchema, response.data);
  }
  async deleteTask(taskId: string) {
    const id = exactId(taskId, 'Task ID');
    const response = await this.request(
      { method: 'DELETE', url: `/tasks/${id}` },
      'delete task',
      false,
      `Deletion of task ${id} was not confirmed. Read that exact task before retrying.`
    );
    if (response.status !== 204)
      throw invalidResponse(
        `CloudConvert did not confirm deletion of task ${id} with HTTP 204. Read that exact task before retrying.`
      );
  }
  async cancelTask(taskId: string) {
    const id = exactId(taskId, 'Task ID');
    const task = await this.getTask(id);
    if (!['waiting', 'processing'].includes(task.status))
      throw invalidInput(
        `Task ${id} is ${task.status}; only waiting or processing tasks can be cancelled.`
      );
    const response = await this.request(
      { method: 'POST', url: `/tasks/${id}/cancel` },
      'cancel task',
      false,
      `Cancellation of task ${id} was not confirmed. Read that exact task before retrying.`
    );
    const cancelled = this.data(taskSchema, response.data);
    if (cancelled.id !== id)
      throw invalidResponse(
        `Cancellation of task ${id} was not confirmed. Read that exact task.`
      );
    return cancelled;
  }
  async retryTask(taskId: string) {
    const id = exactId(taskId, 'Task ID');
    const original = await this.getTask(id);
    const response = await this.request(
      { method: 'POST', url: `/tasks/${id}/retry` },
      'retry task',
      false,
      `A new retry of task ${id} may already exist. Read the original task and its retries before retrying again; another retry can consume credits.`
    );
    let retry: z.infer<typeof taskSchema>;
    try {
      retry = this.data(taskSchema, response.data);
    } catch {
      throw invalidResponse(
        `A retry of task ${id} may already exist. Use manage_task with action get and this original task ID to inspect retryTaskIds before retrying again; another retry can consume credits.`
      );
    }
    if (
      retry.id === id ||
      retry.retry_of_task_id !== id ||
      retry.operation !== original.operation
    )
      throw invalidResponse(
        `A retry of task ${id} may already exist; read the original task before repeating the retry.`
      );
    let actual: z.infer<typeof taskSchema>;
    try {
      actual = await this.getTask(retry.id);
    } catch {
      throw invalidResponse(
        `Retry task ${retry.id} may already exist, but its readback was not confirmed. Read the original task ${id} and this retry ID before repeating the retry.`
      );
    }
    if (
      actual.retry_of_task_id !== id ||
      actual.operation !== retry.operation ||
      (retry.job_id !== undefined && actual.job_id !== retry.job_id)
    )
      throw invalidResponse(
        `Retry task ${retry.id} may already exist, but its receipt differs from the exact readback. Inspect this retry and original task ${id} before repeating the retry.`
      );
    return actual;
  }
  async getUser() {
    const response = await this.request(
      { method: 'GET', url: '/users/me' },
      'get current user'
    );
    return this.data(userSchema, response.data);
  }
  async listConversionFormats(
    params: {
      inputFormat?: string;
      outputFormat?: string;
      engine?: string;
      engineVersion?: string;
    } = {}
  ) {
    const response = await this.request(
      {
        method: 'GET',
        url: '/operations',
        params: pickDefined({
          'filter[operation]': 'convert',
          'filter[input_format]': params.inputFormat,
          'filter[output_format]': params.outputFormat,
          'filter[engine]': params.engine,
          'filter[engine_version]': params.engineVersion
        })
      },
      'list conversion formats'
    );
    return this.data(z.array(formatSchema), response.data);
  }
}
