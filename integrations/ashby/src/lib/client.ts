import { createAxios } from 'slates';

export class AshbyClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://api.ashbyhq.com',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${this.token}:`)}`
      }
    });
  }

  private async post(endpoint: string, data: Record<string, any> = {}) {
    let axios = this.getAxios();
    let response = await axios.post(endpoint, data);
    return response.data;
  }

  // ---- Candidates ----

  async createCandidate(params: {
    firstName: string;
    lastName: string;
    primaryEmailAddress?: { value: string; type: string; isPrimary: boolean };
    primaryPhoneNumber?: { value: string; type: string; isPrimary: boolean };
    socialLinks?: Array<{ type: string; url: string }>;
    sourceId?: string;
    creditedToUserId?: string;
  }) {
    return this.post('/candidate.create', params);
  }

  async getCandidate(candidateId: string) {
    return this.post('/candidate.info', { candidateId });
  }

  async listCandidates(
    params: { cursor?: string; perPage?: number; syncToken?: string } = {}
  ) {
    return this.post('/candidate.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {}),
      ...(params.syncToken ? { syncToken: params.syncToken } : {})
    });
  }

  async searchCandidates(params: { email?: string; name?: string }) {
    return this.post('/candidate.search', params);
  }

  async updateCandidate(
    candidateId: string,
    params: {
      name?: string;
      primaryEmailAddress?: { value: string; type: string; isPrimary: boolean };
      primaryPhoneNumber?: { value: string; type: string; isPrimary: boolean };
      socialLinks?: Array<{ type: string; url: string }>;
    }
  ) {
    return this.post('/candidate.update', { candidateId, ...params });
  }

  async addCandidateTag(candidateId: string, tagId: string) {
    return this.post('/candidate.addTag', { candidateId, tagId });
  }

  async createCandidateNote(candidateId: string, note: string) {
    return this.post('/candidate.createNote', { candidateId, note });
  }

  async listCandidateNotes(candidateId: string) {
    return this.post('/candidate.listNotes', { candidateId });
  }

  async anonymizeCandidate(candidateId: string) {
    return this.post('/candidate.anonymize', { candidateId });
  }

  async addCandidateProject(candidateId: string, projectId: string) {
    return this.post('/candidate.addProject', { candidateId, projectId });
  }

  // ---- Applications ----

  async createApplication(params: {
    candidateId: string;
    jobId: string;
    interviewPlanId?: string;
    interviewStageId?: string;
    sourceId?: string;
    creditedToUserId?: string;
    createdAt?: string;
  }) {
    return this.post('/application.create', params);
  }

  async getApplication(applicationId: string, expand?: string[]) {
    return this.post('/application.info', {
      applicationId,
      ...(expand && expand.length > 0 ? { expand } : {})
    });
  }

  async listApplications(
    params: { cursor?: string; perPage?: number; syncToken?: string } = {}
  ) {
    return this.post('/application.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {}),
      ...(params.syncToken ? { syncToken: params.syncToken } : {})
    });
  }

  async changeApplicationStage(params: {
    applicationId: string;
    interviewStageId: string;
    archiveReasonId?: string;
  }) {
    return this.post('/application.changeStage', params);
  }

  async changeApplicationSource(params: { applicationId: string; sourceId: string }) {
    return this.post('/application.changeSource', params);
  }

  async transferApplication(params: {
    applicationId: string;
    jobId: string;
    interviewStageId?: string;
    interviewPlanId?: string;
  }) {
    return this.post('/application.transfer', params);
  }

  async updateApplication(applicationId: string, params: Record<string, any>) {
    return this.post('/application.update', { applicationId, ...params });
  }

  async addHiringTeamMember(params: { applicationId: string; userId: string; role: string }) {
    return this.post('/application.addHiringTeamMember', params);
  }

  async removeHiringTeamMember(params: {
    applicationId: string;
    userId: string;
    role: string;
  }) {
    return this.post('/application.removeHiringTeamMember', params);
  }

  async listApplicationHistory(applicationId: string) {
    return this.post('/application.listHistory', { applicationId });
  }

  // ---- Application Feedback ----

  async listApplicationFeedback(applicationId: string) {
    return this.post('/applicationFeedback.list', { applicationId });
  }

  async submitApplicationFeedback(params: {
    applicationId: string;
    feedbackFormDefinitionId: string;
    submittedValues: Record<string, any>;
  }) {
    return this.post('/applicationFeedback.submit', params);
  }

  // ---- Jobs ----

  async createJob(params: {
    title: string;
    teamId?: string;
    locationId?: string;
    departmentId?: string;
    defaultInterviewPlanId?: string;
  }) {
    return this.post('/job.create', params);
  }

  async getJob(jobId: string) {
    return this.post('/job.info', { jobId });
  }

  async listJobs(params: { cursor?: string; perPage?: number; syncToken?: string } = {}) {
    return this.post('/job.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {}),
      ...(params.syncToken ? { syncToken: params.syncToken } : {})
    });
  }

  async searchJobs(params: { term?: string; status?: string }) {
    return this.post('/job.search', params);
  }

  async updateJob(jobId: string, params: Record<string, any>) {
    return this.post('/job.update', { jobId, ...params });
  }

  async setJobStatus(jobId: string, status: string) {
    return this.post('/job.setStatus', { jobId, status });
  }

  async updateJobCompensation(jobId: string, compensation: Record<string, any>) {
    return this.post('/job.updateCompensation', { jobId, ...compensation });
  }

  // ---- Offers ----

  async createOffer(params: Record<string, any>) {
    return this.post('/offer.create', params);
  }

  async getOffer(offerId: string) {
    return this.post('/offer.info', { offerId });
  }

  async listOffers(params: { cursor?: string; perPage?: number } = {}) {
    return this.post('/offer.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {})
    });
  }

  async updateOffer(offerId: string, params: Record<string, any>) {
    return this.post('/offer.update', { offerId, ...params });
  }

  async approveOffer(offerId: string) {
    return this.post('/offer.approve', { offerId });
  }

  async startOffer(offerId: string) {
    return this.post('/offer.start', { offerId });
  }

  // ---- Interviews ----

  async listInterviews(params: { cursor?: string; perPage?: number } = {}) {
    return this.post('/interview.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {})
    });
  }

  async getInterview(interviewId: string) {
    return this.post('/interview.info', { interviewId });
  }

  async createInterviewSchedule(params: {
    applicationId: string;
    interviewEvents: Array<{
      interviewId: string;
      startTime: string;
      endTime: string;
      interviewerUserIds: string[];
    }>;
  }) {
    return this.post('/interviewSchedule.create', params);
  }

  async updateInterviewSchedule(interviewScheduleId: string, params: Record<string, any>) {
    return this.post('/interviewSchedule.update', { interviewScheduleId, ...params });
  }

  async cancelInterviewSchedule(interviewScheduleId: string) {
    return this.post('/interviewSchedule.cancel', { interviewScheduleId });
  }

  async listInterviewSchedules(params: { cursor?: string; perPage?: number } = {}) {
    return this.post('/interviewSchedule.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {})
    });
  }

  // ---- Organization: Departments ----

  async createDepartment(params: { name: string; parentId?: string }) {
    return this.post('/department.create', params);
  }

  async listDepartments() {
    return this.post('/department.list', {});
  }

  async archiveDepartment(departmentId: string) {
    return this.post('/department.archive', { departmentId });
  }

  // ---- Organization: Locations ----

  async createLocation(params: {
    name: string;
    isRemote?: boolean;
    address?: Record<string, any>;
  }) {
    return this.post('/location.create', params);
  }

  async listLocations() {
    return this.post('/location.list', {});
  }

  // ---- Organization: Users ----

  async listUsers(params: { cursor?: string; perPage?: number } = {}) {
    return this.post('/user.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {})
    });
  }

  async searchUsers(params: { term?: string }) {
    return this.post('/user.search', params);
  }

  // ---- Openings ----

  async createOpening(params: {
    jobId: string;
    targetHireDate?: string;
    targetStartDate?: string;
    openingState?: string;
  }) {
    return this.post('/opening.create', params);
  }

  async listOpenings(params: { cursor?: string; perPage?: number } = {}) {
    return this.post('/opening.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {})
    });
  }

  // ---- Sources ----

  async listSources() {
    return this.post('/source.list', {});
  }

  // ---- Tags ----

  async listCandidateTags() {
    return this.post('/candidateTag.list', {});
  }

  async createCandidateTag(params: { title: string }) {
    return this.post('/candidateTag.create', params);
  }

  // ---- Archive Reasons ----

  async listArchiveReasons() {
    return this.post('/archiveReason.list', {});
  }

  // ---- Interview Stages ----

  async listInterviewStages(params: { cursor?: string; perPage?: number } = {}) {
    return this.post('/interviewStage.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {})
    });
  }

  // ---- Custom Fields ----

  async setCustomFieldValue(params: {
    objectType: string;
    objectId: string;
    fieldId: string;
    value: any;
  }) {
    return this.post('/customField.setValue', {
      objectType: params.objectType,
      objectId: params.objectId,
      fieldId: params.fieldId,
      fieldValue: params.value
    });
  }

  // ---- Webhooks ----

  async createWebhook(params: {
    webhookType: string;
    requestUrl: string;
    secretToken: string;
  }) {
    return this.post('/webhook.create', params);
  }

  async deleteWebhook(webhookId: string) {
    return this.post('/webhook.delete', { webhookId });
  }

  async updateWebhook(params: {
    webhookId: string;
    enabled?: boolean;
    requestUrl?: string;
    secretToken?: string;
  }) {
    return this.post('/webhook.update', params);
  }

  // ---- Job Postings ----

  async listJobPostings(params: { cursor?: string; perPage?: number } = {}) {
    return this.post('/jobPosting.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {})
    });
  }

  async getJobPosting(jobPostingId: string) {
    return this.post('/jobPosting.info', { jobPostingId });
  }

  async updateJobPosting(jobPostingId: string, params: Record<string, any>) {
    return this.post('/jobPosting.update', { jobPostingId, ...params });
  }

  // ---- Surveys ----

  async createSurveyRequest(params: {
    surveyFormDefinitionId: string;
    applicationId: string;
  }) {
    return this.post('/surveyRequest.create', params);
  }

  async listSurveySubmissions(params: { cursor?: string; perPage?: number } = {}) {
    return this.post('/surveySubmission.list', {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.perPage ? { perPage: params.perPage } : {})
    });
  }

  // ---- Referrals ----

  async createReferral(params: Record<string, any>) {
    return this.post('/referral.create', params);
  }

  // ---- Reports ----

  async generateReport(params: Record<string, any>) {
    return this.post('/report.generate', params);
  }
}
