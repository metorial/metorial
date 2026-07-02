import { createAxios } from 'slates';

export class RecruiteeClient {
  private axios;

  constructor(params: { token: string; companyId: string }) {
    this.axios = createAxios({
      baseURL: `https://api.recruitee.com/c/${params.companyId}`,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Candidates ──────────────────────────────────────────────

  async listCandidates(opts?: {
    limit?: number;
    offset?: number;
    createdAfter?: string;
    query?: string;
    offerId?: number;
    sort?: string;
    qualified?: boolean;
    disqualified?: boolean;
    ids?: string;
  }) {
    let params: Record<string, any> = {};
    if (opts?.limit != null) params.limit = opts.limit;
    if (opts?.offset != null) params.offset = opts.offset;
    if (opts?.createdAfter) params.created_after = opts.createdAfter;
    if (opts?.query) params.query = opts.query;
    if (opts?.offerId != null) params.offer_id = opts.offerId;
    if (opts?.sort) params.sort = opts.sort;
    if (opts?.qualified != null) params.qualified = opts.qualified;
    if (opts?.disqualified != null) params.disqualified = opts.disqualified;
    if (opts?.ids) params.ids = opts.ids;

    let res = await this.axios.get('/candidates', { params });
    return res.data;
  }

  async searchCandidates(opts?: {
    limit?: number;
    page?: number;
    sortBy?: string;
    filtersJson?: string;
  }) {
    let params: Record<string, any> = {};
    if (opts?.limit != null) params.limit = opts.limit;
    if (opts?.page != null) params.page = opts.page;
    if (opts?.sortBy) params.sort_by = opts.sortBy;
    if (opts?.filtersJson) params.filters_json = opts.filtersJson;

    let res = await this.axios.get('/search/new/candidates', { params });
    return res.data;
  }

  async getCandidate(candidateId: number) {
    let res = await this.axios.get(`/candidates/${candidateId}`);
    return res.data;
  }

  async createCandidate(
    candidate: {
      name: string;
      emails?: string[];
      phones?: string[];
      socialLinks?: string[];
      links?: string[];
      coverLetter?: string;
      remoteCvUrl?: string;
      sources?: string[];
    },
    offerIds?: number[]
  ) {
    let body: Record<string, any> = {
      candidate: {
        name: candidate.name,
        ...(candidate.emails && { emails: candidate.emails }),
        ...(candidate.phones && { phones: candidate.phones }),
        ...(candidate.socialLinks && { social_links: candidate.socialLinks }),
        ...(candidate.links && { links: candidate.links }),
        ...(candidate.coverLetter && { cover_letter: candidate.coverLetter }),
        ...(candidate.remoteCvUrl && { remote_cv_url: candidate.remoteCvUrl }),
        ...(candidate.sources && { sources: candidate.sources })
      }
    };
    if (offerIds && offerIds.length > 0) {
      body.offers = offerIds;
    }

    let res = await this.axios.post('/candidates', body);
    return res.data;
  }

  async updateCandidate(
    candidateId: number,
    candidate: {
      name?: string;
      emails?: string[];
      phones?: string[];
      socialLinks?: string[];
      links?: string[];
      coverLetter?: string;
      remoteCvUrl?: string;
    }
  ) {
    let body: Record<string, any> = {
      candidate: {
        ...(candidate.name && { name: candidate.name }),
        ...(candidate.emails && { emails: candidate.emails }),
        ...(candidate.phones && { phones: candidate.phones }),
        ...(candidate.socialLinks && { social_links: candidate.socialLinks }),
        ...(candidate.links && { links: candidate.links }),
        ...(candidate.coverLetter !== undefined && { cover_letter: candidate.coverLetter }),
        ...(candidate.remoteCvUrl && { remote_cv_url: candidate.remoteCvUrl })
      }
    };

    let res = await this.axios.patch(`/candidates/${candidateId}`, body);
    return res.data;
  }

  async deleteCandidate(candidateId: number) {
    let res = await this.axios.delete(`/candidates/${candidateId}`);
    return res.data;
  }

  async updateCandidateCv(candidateId: number, remoteCvUrl: string) {
    let res = await this.axios.patch(`/candidates/${candidateId}/update_cv`, {
      candidate: { remote_cv_url: remoteCvUrl }
    });
    return res.data;
  }

  async deleteCandidateCv(candidateId: number) {
    let res = await this.axios.delete(`/candidates/${candidateId}/delete_cv`);
    return res.data;
  }

  // ── Candidate Notes ─────────────────────────────────────────

  async listNotes(candidateId: number) {
    let res = await this.axios.get(`/candidates/${candidateId}/notes`);
    return res.data;
  }

  async createNote(candidateId: number, body: string, visibility?: string) {
    let res = await this.axios.post(`/candidates/${candidateId}/notes`, {
      note: {
        body,
        visibility: {
          level: visibility || 'public'
        }
      }
    });
    return res.data;
  }

  async deleteNote(noteId: number) {
    let res = await this.axios.delete(`/notes/${noteId}`);
    return res.data;
  }

  // ── Candidate Tags ──────────────────────────────────────────

  async addTagsToCandidate(candidateId: number, tags: string[]) {
    let res = await this.axios.post(`/candidates/${candidateId}/tags`, { tags });
    return res.data;
  }

  // ── Candidate Custom Fields ─────────────────────────────────

  async setCandidateCustomFields(
    candidateId: number,
    fields: Array<{
      kind: string;
      values: any[];
    }>
  ) {
    let res = await this.axios.post(`/custom_fields/candidates/${candidateId}/fields`, {
      fields
    });
    return res.data;
  }

  // ── Offers/Jobs ─────────────────────────────────────────────

  async listOffers(opts?: { kind?: string; scope?: string; viewMode?: string }) {
    let params: Record<string, any> = {};
    if (opts?.kind) params.kind = opts.kind;
    if (opts?.scope) params.scope = opts.scope;
    if (opts?.viewMode) params.view_mode = opts.viewMode;

    let res = await this.axios.get('/offers', { params });
    return res.data;
  }

  async getOffer(offerId: number) {
    let res = await this.axios.get(`/offers/${offerId}`);
    return res.data;
  }

  async createOffer(offer: {
    title: string;
    kind?: string;
    description?: string;
    requirements?: string;
    departmentId?: number;
    locationIds?: number[];
    remote?: boolean;
    status?: string;
  }) {
    let body: Record<string, any> = {
      offer: {
        title: offer.title,
        kind: offer.kind || 'job',
        ...(offer.description && { description: offer.description }),
        ...(offer.requirements && { requirements: offer.requirements }),
        ...(offer.departmentId != null && { department_id: offer.departmentId }),
        ...(offer.locationIds && { location_ids: offer.locationIds }),
        ...(offer.remote != null && { remote: offer.remote }),
        ...(offer.status && { status: offer.status })
      }
    };

    let res = await this.axios.post('/offers', body);
    return res.data;
  }

  async updateOffer(
    offerId: number,
    offer: {
      title?: string;
      description?: string;
      requirements?: string;
      departmentId?: number;
      locationIds?: number[];
      remote?: boolean;
      status?: string;
    }
  ) {
    let body: Record<string, any> = {
      offer: {
        ...(offer.title && { title: offer.title }),
        ...(offer.description !== undefined && { description: offer.description }),
        ...(offer.requirements !== undefined && { requirements: offer.requirements }),
        ...(offer.departmentId != null && { department_id: offer.departmentId }),
        ...(offer.locationIds && { location_ids: offer.locationIds }),
        ...(offer.remote != null && { remote: offer.remote }),
        ...(offer.status && { status: offer.status })
      }
    };

    let res = await this.axios.patch(`/offers/${offerId}`, body);
    return res.data;
  }

  async deleteOffer(offerId: number) {
    let res = await this.axios.delete(`/offers/${offerId}`);
    return res.data;
  }

  // ── Placements (Pipeline) ──────────────────────────────────

  async changeStage(
    placementId: number,
    stageId: number,
    opts?: {
      proceed?: boolean;
      hiredAt?: string;
      jobStartsAt?: string;
    }
  ) {
    let params: Record<string, any> = {
      stage_id: stageId
    };
    if (opts?.proceed != null) params.proceed = opts.proceed;
    if (opts?.hiredAt) params.hired_at = opts.hiredAt;
    if (opts?.jobStartsAt) params.job_starts_at = opts.jobStartsAt;

    let res = await this.axios.patch(`/placements/${placementId}/change_stage`, params);
    return res.data;
  }

  async disqualifyCandidate(placementId: number, disqualifyReasonId?: number) {
    let body: Record<string, any> = {};
    if (disqualifyReasonId != null) body.disqualify_reason_id = disqualifyReasonId;

    let res = await this.axios.patch(`/placements/${placementId}/disqualify`, body);
    return res.data;
  }

  async deletePlacement(placementId: number) {
    let res = await this.axios.delete(`/placements/${placementId}`);
    return res.data;
  }

  // ── Departments ─────────────────────────────────────────────

  async listDepartments() {
    let res = await this.axios.get('/departments');
    return res.data;
  }

  // ── Locations ───────────────────────────────────────────────

  async listLocations() {
    let res = await this.axios.get('/locations');
    return res.data;
  }

  // ── Tags ────────────────────────────────────────────────────

  async listTags(opts?: { query?: string; sortBy?: string; sortOrder?: string }) {
    let params: Record<string, any> = {};
    if (opts?.query) params.query = opts.query;
    if (opts?.sortBy) params.sort_by = opts.sortBy;
    if (opts?.sortOrder) params.sort_order = opts.sortOrder;

    let res = await this.axios.get('/tags', { params });
    return res.data;
  }

  // ── Disqualify Reasons ──────────────────────────────────────

  async listDisqualifyReasons() {
    let res = await this.axios.get('/disqualify_reasons');
    return res.data;
  }

  // ── Webhooks ────────────────────────────────────────────────

  async createWebhook(url: string, eventTypes: string[]) {
    let res = await this.axios.post('/webhooks', {
      webhook: {
        url,
        event_types: eventTypes
      }
    });
    return res.data;
  }

  async deleteWebhook(webhookId: number) {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }
}
