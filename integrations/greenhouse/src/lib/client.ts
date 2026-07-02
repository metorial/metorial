import { createAxios } from 'slates';

let HARVEST_BASE_URL = 'https://harvest.greenhouse.io/v1';

export class GreenhouseClient {
  private token: string;
  private onBehalfOf?: string;

  constructor(config: { token: string; onBehalfOf?: string }) {
    this.token = config.token;
    this.onBehalfOf = config.onBehalfOf;
  }

  private getAxios(write: boolean = false) {
    let headers: Record<string, string> = {
      Authorization: `Basic ${btoa(`${this.token}:`)}`,
      'Content-Type': 'application/json'
    };
    if (write && this.onBehalfOf) {
      headers['On-Behalf-Of'] = this.onBehalfOf;
    }
    return createAxios({ baseURL: HARVEST_BASE_URL, headers });
  }

  private async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    let client = this.getAxios(false);
    let response = await client.get(path, { params });
    return response.data;
  }

  private async post<T = any>(path: string, data?: Record<string, any>): Promise<T> {
    let client = this.getAxios(true);
    let response = await client.post(path, data);
    return response.data;
  }

  private async patch<T = any>(path: string, data?: Record<string, any>): Promise<T> {
    let client = this.getAxios(true);
    let response = await client.patch(path, data);
    return response.data;
  }

  // ---- Candidates ----

  async listCandidates(params?: {
    page?: number;
    perPage?: number;
    email?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    jobId?: number;
  }): Promise<any[]> {
    return this.get('/candidates', {
      page: params?.page,
      per_page: params?.perPage || 50,
      email: params?.email,
      created_after: params?.createdAfter,
      created_before: params?.createdBefore,
      updated_after: params?.updatedAfter,
      updated_before: params?.updatedBefore,
      job_id: params?.jobId
    });
  }

  async getCandidate(candidateId: number): Promise<any> {
    return this.get(`/candidates/${candidateId}`);
  }

  async createCandidate(data: {
    firstName: string;
    lastName: string;
    company?: string;
    title?: string;
    phoneNumbers?: Array<{ value: string; type: string }>;
    addresses?: Array<{ value: string; type: string }>;
    emailAddresses?: Array<{ value: string; type: string }>;
    websiteAddresses?: Array<{ value: string; type: string }>;
    socialMediaAddresses?: Array<{ value: string; type: string }>;
    tags?: string[];
    applications?: Array<{ jobId: number }>;
  }): Promise<any> {
    return this.post('/candidates', {
      first_name: data.firstName,
      last_name: data.lastName,
      company: data.company,
      title: data.title,
      phone_numbers: data.phoneNumbers,
      addresses: data.addresses,
      email_addresses: data.emailAddresses,
      website_addresses: data.websiteAddresses,
      social_media_addresses: data.socialMediaAddresses,
      tags: data.tags,
      applications: data.applications?.map(a => ({ job_id: a.jobId }))
    });
  }

  async updateCandidate(
    candidateId: number,
    data: {
      firstName?: string;
      lastName?: string;
      company?: string;
      title?: string;
      phoneNumbers?: Array<{ value: string; type: string }>;
      addresses?: Array<{ value: string; type: string }>;
      emailAddresses?: Array<{ value: string; type: string }>;
      websiteAddresses?: Array<{ value: string; type: string }>;
      socialMediaAddresses?: Array<{ value: string; type: string }>;
      tags?: string[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.company !== undefined) body.company = data.company;
    if (data.title !== undefined) body.title = data.title;
    if (data.phoneNumbers !== undefined) body.phone_numbers = data.phoneNumbers;
    if (data.addresses !== undefined) body.addresses = data.addresses;
    if (data.emailAddresses !== undefined) body.email_addresses = data.emailAddresses;
    if (data.websiteAddresses !== undefined) body.website_addresses = data.websiteAddresses;
    if (data.socialMediaAddresses !== undefined)
      body.social_media_addresses = data.socialMediaAddresses;
    if (data.tags !== undefined) body.tags = data.tags;
    return this.patch(`/candidates/${candidateId}`, body);
  }

  async addCandidateNote(
    candidateId: number,
    data: {
      userId: number;
      body: string;
      visibility: string;
    }
  ): Promise<any> {
    return this.post(`/candidates/${candidateId}/activity_feed/notes`, {
      user_id: data.userId,
      body: data.body,
      visibility: data.visibility
    });
  }

  async addCandidateTag(candidateId: number, tagName: string): Promise<any> {
    return this.put(`/candidates/${candidateId}/tags`, { name: tagName });
  }

  async removeCandidateTag(candidateId: number, tagName: string): Promise<any> {
    let client = this.getAxios(true);
    let response = await client.delete(
      `/candidates/${candidateId}/tags/${encodeURIComponent(tagName)}`
    );
    return response.data;
  }

  private async put<T = any>(path: string, data?: Record<string, any>): Promise<T> {
    let client = this.getAxios(true);
    let response = await client.put(path, data);
    return response.data;
  }

  // ---- Applications ----

  async listApplications(params?: {
    page?: number;
    perPage?: number;
    jobId?: number;
    candidateId?: number;
    status?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  }): Promise<any[]> {
    return this.get('/applications', {
      page: params?.page,
      per_page: params?.perPage || 50,
      job_id: params?.jobId,
      status: params?.status,
      created_after: params?.createdAfter,
      created_before: params?.createdBefore,
      updated_after: params?.updatedAfter,
      updated_before: params?.updatedBefore
    });
  }

  async getApplication(applicationId: number): Promise<any> {
    return this.get(`/applications/${applicationId}`);
  }

  async advanceApplication(applicationId: number, fromStageId?: number): Promise<any> {
    let body: Record<string, any> = {};
    if (fromStageId !== undefined) body.from_stage_id = fromStageId;
    return this.post(`/applications/${applicationId}/advance`, body);
  }

  async moveApplication(
    applicationId: number,
    fromStageId: number,
    toStageId: number
  ): Promise<any> {
    return this.post(`/applications/${applicationId}/move`, {
      from_stage_id: fromStageId,
      to_stage_id: toStageId
    });
  }

  async rejectApplication(
    applicationId: number,
    data?: {
      rejectionReasonId?: number;
      notes?: string;
      rejectionEmail?: {
        sendEmailAt?: string;
        emailTemplateId?: number;
      };
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data?.rejectionReasonId !== undefined)
      body.rejection_reason_id = data.rejectionReasonId;
    if (data?.notes !== undefined) body.notes = data.notes;
    if (data?.rejectionEmail) {
      body.rejection_email = {
        send_email_at: data.rejectionEmail.sendEmailAt,
        email_template_id: data.rejectionEmail.emailTemplateId
      };
    }
    return this.post(`/applications/${applicationId}/reject`, body);
  }

  async unrejectApplication(applicationId: number): Promise<any> {
    return this.post(`/applications/${applicationId}/unreject`);
  }

  // ---- Jobs ----

  async listJobs(params?: {
    page?: number;
    perPage?: number;
    status?: string;
    departmentId?: number;
    officeId?: number;
  }): Promise<any[]> {
    return this.get('/jobs', {
      page: params?.page,
      per_page: params?.perPage || 50,
      status: params?.status,
      department_id: params?.departmentId,
      office_id: params?.officeId
    });
  }

  async getJob(jobId: number): Promise<any> {
    return this.get(`/jobs/${jobId}`);
  }

  async createJob(data: {
    templateJobId: number;
    numberOfOpenings?: number;
    jobPostName?: string;
    jobName?: string;
    departmentId?: number;
    officeIds?: number[];
    openingIds?: string[];
  }): Promise<any> {
    let body: Record<string, any> = {
      template_job_id: data.templateJobId
    };
    if (data.numberOfOpenings !== undefined) body.number_of_openings = data.numberOfOpenings;
    if (data.jobPostName !== undefined) body.job_post_name = data.jobPostName;
    if (data.jobName !== undefined) body.job_name = data.jobName;
    if (data.departmentId !== undefined) body.department_id = data.departmentId;
    if (data.officeIds !== undefined) body.office_ids = data.officeIds;
    if (data.openingIds !== undefined) body.opening_ids = data.openingIds;
    return this.post('/jobs', body);
  }

  async getJobStages(jobId: number): Promise<any[]> {
    return this.get(`/jobs/${jobId}/stages`);
  }

  // ---- Offers ----

  async listOffers(params?: {
    page?: number;
    perPage?: number;
    status?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  }): Promise<any[]> {
    return this.get('/offers', {
      page: params?.page,
      per_page: params?.perPage || 50,
      status: params?.status,
      created_after: params?.createdAfter,
      created_before: params?.createdBefore,
      updated_after: params?.updatedAfter,
      updated_before: params?.updatedBefore
    });
  }

  async listOffersForApplication(applicationId: number): Promise<any[]> {
    return this.get(`/applications/${applicationId}/offers`);
  }

  async getOffer(offerId: number): Promise<any> {
    return this.get(`/offers/${offerId}`);
  }

  async getCurrentOfferForApplication(applicationId: number): Promise<any> {
    return this.get(`/applications/${applicationId}/offers/current_offer`);
  }

  // ---- Users ----

  async listUsers(params?: {
    page?: number;
    perPage?: number;
    email?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  }): Promise<any[]> {
    return this.get('/users', {
      page: params?.page,
      per_page: params?.perPage || 50,
      email: params?.email,
      created_after: params?.createdAfter,
      created_before: params?.createdBefore,
      updated_after: params?.updatedAfter,
      updated_before: params?.updatedBefore
    });
  }

  async getUser(userId: number): Promise<any> {
    return this.get(`/users/${userId}`);
  }

  // ---- Departments ----

  async listDepartments(params?: { page?: number; perPage?: number }): Promise<any[]> {
    return this.get('/departments', {
      page: params?.page,
      per_page: params?.perPage || 50
    });
  }

  // ---- Offices ----

  async listOffices(params?: { page?: number; perPage?: number }): Promise<any[]> {
    return this.get('/offices', {
      page: params?.page,
      per_page: params?.perPage || 50
    });
  }

  // ---- Scheduled Interviews ----

  async listScheduledInterviews(params?: {
    page?: number;
    perPage?: number;
    applicationId?: number;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  }): Promise<any[]> {
    return this.get('/scheduled_interviews', {
      page: params?.page,
      per_page: params?.perPage || 50,
      application_id: params?.applicationId,
      created_after: params?.createdAfter,
      created_before: params?.createdBefore,
      updated_after: params?.updatedAfter,
      updated_before: params?.updatedBefore
    });
  }

  // ---- Rejection Reasons ----

  async listRejectionReasons(params?: { page?: number; perPage?: number }): Promise<any[]> {
    return this.get('/rejection_reasons', {
      page: params?.page,
      per_page: params?.perPage || 100
    });
  }

  // ---- Sources ----

  async listSources(params?: { page?: number; perPage?: number }): Promise<any[]> {
    return this.get('/sources', {
      page: params?.page,
      per_page: params?.perPage || 100
    });
  }

  // ---- Custom Fields ----

  async listCustomFields(fieldType: string): Promise<any[]> {
    return this.get(`/custom_fields/${fieldType}`);
  }

  // ---- Tags ----

  async listCandidateTags(params?: { page?: number; perPage?: number }): Promise<any[]> {
    return this.get('/tags/candidate', {
      page: params?.page,
      per_page: params?.perPage || 100
    });
  }
}
