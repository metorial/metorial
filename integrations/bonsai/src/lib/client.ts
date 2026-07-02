import { createAxios } from 'slates';
import type {
  BonsaiClient,
  BonsaiDeal,
  BonsaiProject,
  BonsaiTask,
  BonsaiTaskTemplate
} from './types';

let BASE_URL = 'https://app.hellobonsai.com/api';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ─── Clients ──────────────────────────────────────────────────

  async createClient(params: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    companyName?: string;
    website?: string;
    phone?: string;
    jobTitle?: string;
    notes?: string;
  }): Promise<BonsaiClient> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.firstName !== undefined) body.first_name = params.firstName;
    if (params.lastName !== undefined) body.last_name = params.lastName;
    if (params.email !== undefined) body.email = params.email;
    if (params.companyName !== undefined) body.company_name = params.companyName;
    if (params.website !== undefined) body.website = params.website;
    if (params.phone !== undefined) body.phone = params.phone;
    if (params.jobTitle !== undefined) body.job_title = params.jobTitle;
    if (params.notes !== undefined) body.notes = params.notes;

    let response = await this.axios.post('/v1/clients', { client: body });
    return this.mapClient(response.data);
  }

  async listClients(): Promise<BonsaiClient[]> {
    let response = await this.axios.get('/v1/clients');
    let data = response.data as any;
    let clients = Array.isArray(data) ? data : (data.clients ?? data.data ?? []);
    return clients.map((c: any) => this.mapClient(c));
  }

  async getClient(clientId: string): Promise<BonsaiClient> {
    let response = await this.axios.get(`/v1/clients/${clientId}`);
    return this.mapClient(response.data);
  }

  private mapClient(data: any): BonsaiClient {
    let c = data.client ?? data;
    return {
      id: c.id ?? c._id ?? '',
      name: c.name ?? undefined,
      firstName: c.first_name ?? c.firstName ?? undefined,
      lastName: c.last_name ?? c.lastName ?? undefined,
      email: c.email ?? undefined,
      companyName: c.company_name ?? c.companyName ?? undefined,
      website: c.website ?? undefined,
      phone: c.phone ?? undefined,
      jobTitle: c.job_title ?? c.jobTitle ?? undefined,
      notes: c.notes ?? undefined,
      createdAt: c.created_at ?? c.createdAt ?? undefined,
      updatedAt: c.updated_at ?? c.updatedAt ?? undefined
    };
  }

  // ─── Projects ──────────────────────────────────────────────────

  async createProject(params: {
    name: string;
    clientEmail?: string;
    description?: string;
    notes?: string;
    currency?: string;
  }): Promise<BonsaiProject> {
    let body: Record<string, any> = { name: params.name };
    if (params.clientEmail !== undefined) body.client_email = params.clientEmail;
    if (params.description !== undefined) body.description = params.description;
    if (params.notes !== undefined) body.notes = params.notes;
    if (params.currency !== undefined) body.currency = params.currency;

    let response = await this.axios.post('/v1/projects', { project: body });
    return this.mapProject(response.data);
  }

  async listProjects(): Promise<BonsaiProject[]> {
    let response = await this.axios.get('/v1/projects');
    let data = response.data as any;
    let projects = Array.isArray(data) ? data : (data.projects ?? data.data ?? []);
    return projects.map((p: any) => this.mapProject(p));
  }

  async getProject(projectId: string): Promise<BonsaiProject> {
    let response = await this.axios.get(`/v1/projects/${projectId}`);
    return this.mapProject(response.data);
  }

  private mapProject(data: any): BonsaiProject {
    let p = data.project ?? data;
    return {
      id: p.id ?? p._id ?? '',
      name: p.name ?? '',
      clientId: p.client_id ?? p.clientId ?? undefined,
      clientEmail: p.client_email ?? p.clientEmail ?? undefined,
      description: p.description ?? undefined,
      notes: p.notes ?? undefined,
      currency: p.currency ?? undefined,
      status: p.status ?? undefined,
      createdAt: p.created_at ?? p.createdAt ?? undefined,
      updatedAt: p.updated_at ?? p.updatedAt ?? undefined
    };
  }

  // ─── Tasks ──────────────────────────────────────────────────

  async createTask(params: {
    title: string;
    projectId?: string;
    description?: string;
    assigneeEmail?: string;
    priority?: string;
    status?: string;
    startDate?: string;
    dueDate?: string;
    timeEstimate?: number;
    billingType?: string;
    tags?: string[];
  }): Promise<BonsaiTask> {
    let body: Record<string, any> = { title: params.title };
    if (params.projectId !== undefined) body.project_id = params.projectId;
    if (params.description !== undefined) body.description = params.description;
    if (params.assigneeEmail !== undefined) body.assignee_email = params.assigneeEmail;
    if (params.priority !== undefined) body.priority = params.priority;
    if (params.status !== undefined) body.status = params.status;
    if (params.startDate !== undefined) body.start_date = params.startDate;
    if (params.dueDate !== undefined) body.due_date = params.dueDate;
    if (params.timeEstimate !== undefined) body.time_estimate = params.timeEstimate;
    if (params.billingType !== undefined) body.billing_type = params.billingType;
    if (params.tags !== undefined) body.tags = params.tags;

    let response = await this.axios.post('/v1/tasks', { task: body });
    return this.mapTask(response.data);
  }

  async createTasksFromTemplate(params: {
    projectId: string;
    templateId: string;
  }): Promise<BonsaiTask[]> {
    let response = await this.axios.post('/v1/tasks/from_template', {
      project_id: params.projectId,
      template_id: params.templateId
    });
    let data = response.data as any;
    let tasks = Array.isArray(data) ? data : (data.tasks ?? data.data ?? []);
    return tasks.map((t: any) => this.mapTask(t));
  }

  async listTasks(projectId?: string): Promise<BonsaiTask[]> {
    let params: Record<string, any> = {};
    if (projectId) params.project_id = projectId;

    let response = await this.axios.get('/v1/tasks', { params });
    let data = response.data as any;
    let tasks = Array.isArray(data) ? data : (data.tasks ?? data.data ?? []);
    return tasks.map((t: any) => this.mapTask(t));
  }

  async getTask(taskId: string): Promise<BonsaiTask> {
    let response = await this.axios.get(`/v1/tasks/${taskId}`);
    return this.mapTask(response.data);
  }

  async listTaskTemplates(): Promise<BonsaiTaskTemplate[]> {
    let response = await this.axios.get('/v1/task_templates');
    let data = response.data as any;
    let templates = Array.isArray(data)
      ? data
      : (data.task_templates ?? data.templates ?? data.data ?? []);
    return templates.map((t: any) => ({
      id: t.id ?? t._id ?? '',
      name: t.name ?? ''
    }));
  }

  private mapTask(data: any): BonsaiTask {
    let t = data.task ?? data;
    return {
      id: t.id ?? t._id ?? '',
      title: t.title ?? '',
      description: t.description ?? undefined,
      projectId: t.project_id ?? t.projectId ?? undefined,
      assigneeEmail: t.assignee_email ?? t.assigneeEmail ?? undefined,
      priority: t.priority ?? undefined,
      status: t.status ?? undefined,
      startDate: t.start_date ?? t.startDate ?? undefined,
      dueDate: t.due_date ?? t.dueDate ?? undefined,
      timeEstimate: t.time_estimate ?? t.timeEstimate ?? undefined,
      billingType: t.billing_type ?? t.billingType ?? undefined,
      tags: t.tags ?? undefined,
      recurring: t.recurring ?? undefined,
      createdAt: t.created_at ?? t.createdAt ?? undefined,
      updatedAt: t.updated_at ?? t.updatedAt ?? undefined
    };
  }

  // ─── Deals ──────────────────────────────────────────────────

  async createDeal(params: {
    title: string;
    clientEmail?: string;
    pipelineStage?: string;
    value?: number;
    ownerEmail?: string;
  }): Promise<BonsaiDeal> {
    let body: Record<string, any> = { title: params.title };
    if (params.clientEmail !== undefined) body.client_email = params.clientEmail;
    if (params.pipelineStage !== undefined) body.pipeline_stage = params.pipelineStage;
    if (params.value !== undefined) body.value = params.value;
    if (params.ownerEmail !== undefined) body.owner_email = params.ownerEmail;

    let response = await this.axios.post('/v1/deals', { deal: body });
    return this.mapDeal(response.data);
  }

  async listDeals(): Promise<BonsaiDeal[]> {
    let response = await this.axios.get('/v1/deals');
    let data = response.data as any;
    let deals = Array.isArray(data) ? data : (data.deals ?? data.data ?? []);
    return deals.map((d: any) => this.mapDeal(d));
  }

  async getDeal(dealId: string): Promise<BonsaiDeal> {
    let response = await this.axios.get(`/v1/deals/${dealId}`);
    return this.mapDeal(response.data);
  }

  private mapDeal(data: any): BonsaiDeal {
    let d = data.deal ?? data;
    return {
      id: d.id ?? d._id ?? '',
      title: d.title ?? '',
      clientEmail: d.client_email ?? d.clientEmail ?? undefined,
      clientId: d.client_id ?? d.clientId ?? undefined,
      pipelineStage: d.pipeline_stage ?? d.pipelineStage ?? undefined,
      value: d.value ?? undefined,
      ownerEmail: d.owner_email ?? d.ownerEmail ?? undefined,
      createdAt: d.created_at ?? d.createdAt ?? undefined,
      updatedAt: d.updated_at ?? d.updatedAt ?? undefined
    };
  }
}
