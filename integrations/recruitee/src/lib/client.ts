import { createApiServiceError, createAxios, pickDefined } from 'slates';
import {
  apiError,
  companyId,
  entity,
  fail,
  integer,
  isRow,
  json,
  list,
  missing,
  nullableString,
  publicData,
  type Row,
  row,
  stringList,
  subdomain,
  text,
  url
} from './validation';
export type Candidate = Row & {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  emails: string[];
  phones: string[];
  sources: string[];
  tags: string[];
  placements: Placement[];
  photo_url: string | null;
  cv_url: string | null;
  source: string | null;
  rating: number | null;
  cover_letter: string | null;
  adminapp_url?: string;
};
export type Placement = Row & {
  id: number;
  candidate_id: number;
  offer_id: number | null;
  talent_pool_id: number | null;
  stage_id: number | null;
  disqualify_kind?: string | null;
  disqualified_at: string | null;
  hired_at: string | null;
};
export type Offer = Row & {
  id: number;
  title: string;
  status: string;
  kind?: string;
  created_at?: string;
  updated_at?: string;
  department: string | null;
  description: string | null;
  requirements: string | null;
  remote: boolean | null;
  locations: Array<{ id: number; full_address: string }>;
  tags: string[];
  slug: string | null;
  careers_url: string | null;
  published_at: string | null;
};
export type Connection = {
  token: string;
  companyId?: string;
  companySubdomain?: string;
  expectedCompanyId?: string;
  expectedAdminId?: string;
};
export class RecruiteeClient {
  private axios: ReturnType<typeof createAxios>;
  private token: string;
  private bindings: string[];
  private expectedAdminId?: string;
  readonly companyScope: string;
  constructor(params: Connection) {
    this.token = text(params.token, 'Personal API token');
    if (
      /\s/.test(this.token) ||
      [...this.token].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    )
      fail('Personal API token must not contain spaces or control characters.');
    this.bindings = [params.companyId, params.expectedCompanyId]
      .filter((v): v is string => v !== undefined)
      .map(companyId);
    if (new Set(this.bindings).size > 1)
      fail('Stored and configured company IDs differ. Reconnect for the intended company.');
    this.expectedAdminId = params.expectedAdminId;
    this.companyScope =
      params.companySubdomain !== undefined
        ? subdomain(params.companySubdomain)
        : (this.bindings[0] ??
          fail(
            'Set your company subdomain from your Recruitee sign-in or careers address. Existing connections may retain their legacy Company ID.'
          ));
    this.axios = createAxios({
      baseURL: `https://api.recruitee.com/c/${this.companyScope}`,
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      paramsSerializer: { indexes: false }
    });
  }
  static async forContext(ctx: {
    auth: { token: string; companyId?: string; adminId?: string };
    config: { companyId?: string; companySubdomain?: string };
  }) {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId ?? ctx.auth.companyId,
      companySubdomain: ctx.config.companySubdomain,
      expectedCompanyId: ctx.auth.companyId,
      expectedAdminId: ctx.auth.adminId
    });
    await client.identity();
    return client;
  }
  async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: Row,
    params?: Row
  ): Promise<Row> {
    if (!/^\/[a-z][a-z0-9_/-]*$/.test(path)) fail('Invalid Recruitee API route.');
    let result: unknown;
    try {
      result = (
        await this.axios.request({
          method,
          url: path,
          data: data ? pickDefined(data) : undefined,
          params: params ? pickDefined(params) : undefined
        })
      ).data;
    } catch (error) {
      apiError(error, `${method.toUpperCase()} ${path}`, [this.token]);
    }
    return publicData(
      isRow(result)
        ? result
        : fail(
            'Recruitee did not return a JSON object. Read the requested resource before retrying; a write may have completed.',
            'recruitee_invalid_response'
          ),
      [this.token]
    ) as Row;
  }
  clean<T>(value: T): T {
    return publicData(value, [this.token]) as T;
  }
  async identity() {
    let admin = entity(await this.request('get', '/admin'), 'admin');
    let id = integer(admin.id, 'Authenticated admin ID'),
      company = String(integer(admin.company_id, 'Authenticated company ID'));
    if (this.bindings.some(binding => binding !== company))
      fail(
        'Authenticated company differs from the stored connection. Reconnect before accessing recruiting records.'
      );
    if (this.expectedAdminId !== undefined && this.expectedAdminId !== String(id))
      fail(
        'Authenticated token owner changed. Reconnect before accessing recruiting records.'
      );
    return {
      adminId: id,
      companyId: Number(company),
      firstName: nullableString(admin.first_name, 'first name'),
      lastName: nullableString(admin.last_name, 'last name'),
      email: nullableString(admin.email, 'admin email'),
      role: nullableString(admin.role_name, 'role'),
      ...(isRow(admin.membership)
        ? { membershipId: integer(admin.membership.id, 'Membership ID') }
        : {})
    };
  }
  private candidate(value: unknown, expected?: number): Candidate {
    let c = entity(value, 'candidate', expected);
    const names = (value: unknown, label: string) =>
      value === undefined || value === null
        ? []
        : Array.isArray(value)
          ? value.map(item =>
              typeof item === 'string'
                ? item
                : text(isRow(item) ? item.name : undefined, label)
            )
          : fail(`Recruitee returned invalid ${label}.`);
    let placements =
      c.placements === undefined
        ? []
        : list({ placements: c.placements }, 'placements').map(p => {
            const offer = p.offer_id ?? (isRow(p.offer) ? p.offer.id : undefined),
              stage = p.stage_id ?? (isRow(p.stage) ? p.stage.id : undefined),
              pool = p.talent_pool_id ?? (isRow(p.talent_pool) ? p.talent_pool.id : undefined);
            const candidate =
              p.candidate_id === undefined
                ? Number(c.id)
                : integer(p.candidate_id, 'Placement candidate ID');
            if (candidate !== c.id)
              fail('Recruitee returned a placement belonging to a different candidate.');
            return {
              ...p,
              id: integer(p.id, 'Placement ID'),
              candidate_id: candidate,
              offer_id:
                offer === undefined || offer === null
                  ? null
                  : integer(offer, 'Placement offer ID'),
              talent_pool_id:
                pool === undefined || pool === null
                  ? null
                  : integer(pool, 'Placement talent pool ID'),
              stage_id:
                stage === undefined || stage === null ? null : integer(stage, 'Stage ID'),
              ...(p.disqualify_kind === undefined
                ? {}
                : {
                    disqualify_kind: nullableString(
                      p.disqualify_kind,
                      'disqualification state'
                    )
                  }),
              disqualified_at: nullableString(p.disqualified_at, 'disqualified date'),
              hired_at: nullableString(p.hired_at, 'hire date')
            };
          });
    if (
      c.rating !== undefined &&
      c.rating !== null &&
      (typeof c.rating !== 'number' || !Number.isFinite(c.rating))
    )
      fail('Recruitee returned an invalid candidate rating.');
    return {
      ...c,
      id: integer(c.id, 'Candidate ID'),
      name: text(c.name, 'Candidate name'),
      created_at: text(c.created_at, 'Candidate creation timestamp'),
      updated_at: text(c.updated_at, 'Candidate update timestamp'),
      emails: stringList(c.emails, 'emails'),
      phones: stringList(c.phones, 'phones'),
      sources: names(c.sources, 'sources'),
      tags: names(c.tags, 'tags'),
      placements,
      photo_url: nullableString(c.photo_url, 'photo URL'),
      cv_url: nullableString(c.cv_url, 'CV URL'),
      source: nullableString(c.source, 'source'),
      rating: typeof c.rating === 'number' ? c.rating : null,
      cover_letter: nullableString(c.cover_letter, 'cover letter'),
      ...(typeof c.adminapp_url === 'string' ? { adminapp_url: c.adminapp_url } : {})
    };
  }
  private offer(value: unknown, expected?: number): Offer {
    let o = entity(value, 'offer', expected);
    let locations =
      o.locations === undefined || o.locations === null
        ? []
        : list({ locations: o.locations }, 'locations').map(l => ({
            id: integer(l.id, 'Location ID'),
            full_address:
              typeof l.full_address === 'string'
                ? l.full_address
                : [l.city, l.country].filter(v => typeof v === 'string').join(', ')
          }));
    let tags =
      o.tags === undefined || o.tags === null
        ? []
        : Array.isArray(o.tags)
          ? o.tags.map(t =>
              typeof t === 'string' ? t : text(isRow(t) ? t.name : undefined, 'Tag name')
            )
          : fail('Recruitee returned invalid offer tags.');
    if (o.remote !== undefined && o.remote !== null && typeof o.remote !== 'boolean')
      fail('Recruitee returned invalid remote status.');
    return {
      ...o,
      id: integer(o.id, 'Offer ID'),
      title: text(o.title, 'Offer title'),
      status: text(o.status, 'Offer status'),
      ...(typeof o.kind === 'string' ? { kind: o.kind } : {}),
      ...(typeof o.created_at === 'string' ? { created_at: o.created_at } : {}),
      ...(typeof o.updated_at === 'string' ? { updated_at: o.updated_at } : {}),
      department: nullableString(o.department, 'department name'),
      description: nullableString(o.description, 'description'),
      requirements: nullableString(o.requirements, 'requirements'),
      remote: typeof o.remote === 'boolean' ? o.remote : null,
      locations,
      tags,
      slug: nullableString(o.slug, 'slug'),
      careers_url: nullableString(o.careers_url, 'careers URL'),
      published_at: nullableString(o.published_at, 'publication timestamp')
    };
  }
  async getCandidate(id: number) {
    const value = await this.request('get', `/candidates/${integer(id, 'Candidate ID')}`);
    list(entity(value, 'candidate', id), 'placements');
    return { candidate: this.candidate(value, id) };
  }
  async listCandidates(
    opts: {
      limit?: number;
      offset?: number;
      createdAfter?: string;
      query?: string;
      offerId?: number;
      sort?: string;
    } = {}
  ) {
    if (opts.sort !== undefined && !['by_date', 'by_last_message'].includes(opts.sort))
      fail(
        'Basic candidate sorting accepts by_date or by_last_message. Use filters with advanced search for created_at_asc/desc sorting.'
      );
    let result = await this.request('get', '/candidates', undefined, {
      limit: integer(opts.limit ?? 60, 'Basic candidate limit', 1, 1000),
      offset: integer(opts.offset ?? 0, 'Offset', 0),
      created_after: opts.createdAfter,
      query: opts.query,
      offer_id: opts.offerId === undefined ? undefined : integer(opts.offerId, 'Offer ID'),
      sort: opts.sort
    });
    return {
      ...result,
      candidates: list(result, 'candidates').map(c => this.candidate({ candidate: c }))
    };
  }
  async searchCandidates(
    opts: { limit?: number; page?: number; sortBy?: string; filtersJson?: string } = {}
  ) {
    let filters: unknown;
    try {
      filters = JSON.parse(opts.filtersJson ?? '[]');
    } catch {
      fail('filters must be a JSON array of documented candidate search filters.');
    }
    if (!Array.isArray(filters) || !filters.every(isRow))
      fail('filters must be a JSON array of filter objects.');
    json(filters, 'Search filters');
    if (
      opts.sortBy !== undefined &&
      !/^(?:relevance|created_at|candidate_name|candidate_rating|candidate_positive_ratings|candidate_job_title|candidate_stage_name|disqualified_at|screening_score|updated_at|last_activity_at|gdpr_expires_at|gdpr_uncompleted_change_request_created_at|gdpr_uncompleted_removal_request_created_at)(?:_asc|_desc)$/.test(
        opts.sortBy
      )
    )
      fail('Unsupported advanced sort. Use a documented field with _asc or _desc.');
    let result = await this.request('get', '/search/new/candidates', undefined, {
      limit: integer(opts.limit ?? 60, 'Limit', 1, 10000),
      page: integer(opts.page ?? 1, 'Page'),
      sort_by: opts.sortBy,
      filters_json: JSON.stringify(filters)
    });
    return {
      ...result,
      hits: list(result, 'hits').map(c => this.candidate({ candidate: c })),
      ...(result.total === undefined
        ? {}
        : { total: integer(result.total, 'Search total', 0) })
    };
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
    let payload = pickDefined({
      name: text(candidate.name, 'Candidate name'),
      emails: candidate.emails,
      phones: candidate.phones,
      social_links: candidate.socialLinks,
      links: candidate.links,
      cover_letter: candidate.coverLetter,
      remote_cv_url:
        candidate.remoteCvUrl === undefined
          ? undefined
          : url(candidate.remoteCvUrl, 'Remote CV URL'),
      sources: candidate.sources
    });
    let offers = offerIds?.map(id => integer(id, 'Offer ID'));
    return {
      candidate: this.candidate(
        await this.request('post', '/candidates', { candidate: payload, offers })
      )
    };
  }
  async updateCandidate(
    id: number,
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
    integer(id, 'Candidate ID');
    let payload = pickDefined({
      name: candidate.name === undefined ? undefined : text(candidate.name, 'Candidate name'),
      emails: candidate.emails,
      phones: candidate.phones,
      social_links: candidate.socialLinks,
      links: candidate.links,
      cover_letter: candidate.coverLetter
    });
    if (!Object.keys(payload).length)
      fail(
        'Supply at least one candidate profile field, or use remoteCvUrl alone for a CV update.'
      );
    return {
      candidate: this.candidate(
        await this.request('patch', `/candidates/${id}`, { candidate: payload }),
        id
      )
    };
  }
  async updateCandidateWithCv(
    id: number,
    candidate: {
      name?: string;
      emails?: string[];
      phones?: string[];
      socialLinks?: string[];
      links?: string[];
      coverLetter?: string;
    },
    remoteCvUrl?: string
  ) {
    integer(id, 'Candidate ID');
    if (candidate.name !== undefined) text(candidate.name, 'Candidate name');
    if (remoteCvUrl !== undefined) url(remoteCvUrl, 'Remote CV URL');
    let hasProfile = Object.values(candidate).some(value => value !== undefined);
    if (!hasProfile && remoteCvUrl === undefined)
      fail('Supply at least one candidate field or remoteCvUrl.');
    let result = hasProfile ? await this.updateCandidate(id, candidate) : undefined;
    if (remoteCvUrl !== undefined) {
      try {
        result = await this.updateCandidateCv(id, remoteCvUrl);
      } catch (error) {
        if (!result) throw error;
        throw createApiServiceError(
          `Candidate ${id} profile changes were accepted, but CV update failed. Read the candidate before retrying; accepted changes remain.`,
          { reason: 'recruitee_partial_candidate_update' }
        );
      }
    }
    return result ?? fail('Candidate update produced no record.');
  }
  async updateCandidateCv(id: number, value: string) {
    return {
      candidate: this.candidate(
        await this.request('patch', `/candidates/${integer(id, 'Candidate ID')}/update_cv`, {
          candidate: { remote_cv_url: url(value, 'Remote CV URL') }
        }),
        id
      )
    };
  }
  async deleteCandidate(id: number) {
    let candidate = this.candidate(
      await this.request('delete', `/candidates/${integer(id, 'Candidate ID')}`),
      id
    );
    if (
      typeof candidate.deleted_at !== 'string' ||
      !Number.isFinite(Date.parse(candidate.deleted_at))
    )
      fail(
        'Recruitee accepted the delete request without a confirmed deletion timestamp. Read the candidate before retrying.'
      );
    return { candidate };
  }
  async listNotes(id: number) {
    let result = await this.request('get', `/candidates/${integer(id, 'Candidate ID')}/notes`);
    return {
      ...result,
      notes: list(result, 'notes').map(n => {
        if (n.candidate_id !== id)
          fail('Recruitee returned a note belonging to a different candidate.');
        return {
          ...n,
          id: integer(n.id, 'Note ID'),
          candidate_id: integer(n.candidate_id, 'Note candidate ID'),
          body:
            typeof n.body === 'string'
              ? n.body
              : typeof n.body_html === 'string'
                ? n.body_html
                : fail('Recruitee did not return note content.'),
          created_at: text(n.created_at, 'Note creation timestamp'),
          updated_at: text(n.updated_at, 'Note update timestamp'),
          pinned_at: nullableString(n.pinned_at, 'pinned timestamp')
        };
      })
    };
  }
  async createNote(id: number, body: string, visibility = 'public') {
    text(body, 'Note body');
    if (visibility !== 'public')
      fail(
        'Private note creation is not documented by the current API. Create the private note in Recruitee, or explicitly choose public for a team-visible note.'
      );
    let result = await this.request(
      'post',
      `/candidates/${integer(id, 'Candidate ID')}/notes`,
      {
        note: {
          body_json: {
            doc: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }]
            }
          },
          visibility: { level: visibility }
        }
      }
    );
    let note = entity(result, 'note');
    if (note.candidate_id !== id)
      fail(
        'Recruitee created a note on a different candidate. Read the records before retrying.'
      );
    if (!isRow(note.visibility) || note.visibility.level !== 'public')
      fail('Created note visibility could not be confirmed. Read the note before retrying.');
    return { ...result, note: { ...note, id: integer(note.id, 'Created note ID') } };
  }
  async deleteNote(id: number) {
    return this.request('delete', `/notes/${integer(id, 'Note ID')}`);
  }
  async addTagsToCandidate(id: number, tags: string[]) {
    if (!tags.length) fail('Supply at least one tag.');
    tags.forEach(tag => text(tag, 'Tag name'));
    return this.request('post', `/candidates/${integer(id, 'Candidate ID')}/tags`, { tags });
  }
  async removeTagsFromCandidate(id: number, tags: string[]) {
    if (!tags.length)
      fail(
        'Supply explicit tag names to remove; removing all tags implicitly is not supported.'
      );
    tags.forEach(tag => text(tag, 'Tag name'));
    return this.request('delete', `/candidates/${integer(id, 'Candidate ID')}/tags`, { tags });
  }
  async listTags(opts: { query?: string; sortBy?: string; sortOrder?: string } = {}) {
    let result = await this.request('get', '/tags', undefined, {
      query: opts.query,
      sort_by: opts.sortBy,
      sort_order: opts.sortOrder
    });
    return {
      ...result,
      tags: list(result, 'tags').map(t => ({
        ...t,
        id: integer(t.id, 'Tag ID'),
        name: text(t.name, 'Tag name'),
        ...(t.taggings_count === undefined
          ? {}
          : { taggings_count: integer(t.taggings_count, 'Tag count', 0) })
      }))
    };
  }
  async setCandidateCustomFields(
    id: number,
    fields: Array<{ kind: string; name?: string; values: unknown[] }>
  ) {
    integer(id, 'Candidate ID');
    if (!fields.length) fail('Supply at least one profile field.');
    for (let field of fields) {
      text(field.kind, 'Profile field kind');
      if (!field.values.length || !field.values.every(isRow))
        fail('Each profile field needs nonempty value objects.');
      json(field.values, 'Profile field values');
      if (['single_line', 'multi_line', 'boolean', 'number', 'date'].includes(field.kind))
        text(field.name, 'Custom profile field name');
      for (const value of field.values) {
        if (
          isRow(value) &&
          ((field.kind === 'salary' && typeof value.amount !== 'string') ||
            (field.kind === 'number' && typeof value.number !== 'string'))
        )
          fail(
            'Salary amount and number profile-field values must use the documented exact decimal strings. No numeric rounding is performed.'
          );
      }
    }
    let created: number[] = [];
    for (let field of fields) {
      let responded = false;
      try {
        let result = await this.request('post', `/custom_fields/candidates/${id}/fields`, {
          field: pickDefined(field)
        });
        responded = true;
        let actual = entity(result, 'field');
        created.push(integer(actual.id, 'Created profile field ID'));
      } catch (error) {
        if (!created.length) {
          if (
            !responded &&
            !(
              isRow(error) &&
              isRow(error.data) &&
              error.data.reason === 'recruitee_invalid_response'
            )
          )
            throw error;
          throw createApiServiceError(
            'The profile field request may have been accepted, but its created ID could not be confirmed. Read candidate profile fields before retrying.',
            { reason: 'recruitee_uncertain_profile_field', parent: {} }
          );
        }
        throw createApiServiceError(
          `Created profile fields ${created.join(', ')} before another field failed. Read the candidate before retrying; successful fields remain.`,
          { reason: 'recruitee_partial_profile_fields' }
        );
      }
    }
    return { createdFieldIds: created };
  }
  async getOffer(id: number) {
    return {
      offer: this.offer(await this.request('get', `/offers/${integer(id, 'Offer ID')}`), id)
    };
  }
  async listOffers(
    opts: {
      kind?: string;
      scope?: string;
      viewMode?: string;
      page?: number;
      limit?: number;
      statuses?: string[];
      offerIds?: number[];
      departmentIds?: number[];
      locationIds?: number[];
    } = {}
  ) {
    if (
      opts.scope !== undefined &&
      !['active', 'archived', 'not_archived'].includes(opts.scope)
    )
      fail(
        'Deprecated scope accepts active, archived, or not_archived. Use statuses for current filtering.'
      );
    if (opts.scope !== undefined && opts.statuses !== undefined)
      fail('Use either deprecated scope or statuses, not both.');
    for (let values of [opts.offerIds, opts.departmentIds, opts.locationIds])
      values?.forEach(id => integer(id, 'Filter ID'));
    let result = await this.request('get', '/offers', undefined, {
      kind: opts.kind,
      scope: opts.scope,
      view_mode: opts.viewMode,
      page: integer(opts.page ?? 1, 'Page'),
      limit: integer(opts.limit ?? 1000, 'Limit', 1, 1000),
      statuses: opts.statuses,
      offer_ids: opts.offerIds,
      department_ids: opts.departmentIds,
      location_ids: opts.locationIds
    });
    let meta =
      result.meta === undefined
        ? undefined
        : isRow(result.meta)
          ? {
              page: integer(result.meta.page, 'Offer page'),
              limit: integer(result.meta.limit, 'Offer page size'),
              totalCount: integer(result.meta.total_count, 'Offer total count', 0)
            }
          : fail('Recruitee returned invalid offer pagination.');
    return {
      ...result,
      offers: list(result, 'offers').map(o => this.offer({ offer: o })),
      meta
    };
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
    let payload = pickDefined({
      title: text(offer.title, 'Offer title'),
      kind: offer.kind ?? 'job',
      description: offer.description,
      requirements: offer.requirements,
      department_id:
        offer.departmentId === undefined
          ? undefined
          : integer(offer.departmentId, 'Department ID'),
      location_ids: offer.locationIds?.map(id => integer(id, 'Location ID')),
      remote: offer.remote
    });
    let created = this.offer(await this.request('post', '/offers', { offer: payload }));
    if (offer.status !== undefined && created.status !== offer.status) {
      try {
        created = (await this.transitionOffer(created.id, offer.status)).offer;
      } catch {
        throw createApiServiceError(
          `Offer ${created.id} was created, but its requested status transition failed. Read it before retrying creation.`,
          { reason: 'recruitee_partial_offer_creation' }
        );
      }
    }
    return { offer: created };
  }
  async updateOffer(
    id: number,
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
    integer(id, 'Offer ID');
    let payload = pickDefined({
      title: offer.title === undefined ? undefined : text(offer.title, 'Offer title'),
      description: offer.description,
      requirements: offer.requirements,
      department_id:
        offer.departmentId === undefined
          ? undefined
          : integer(offer.departmentId, 'Department ID'),
      location_ids: offer.locationIds?.map(id => integer(id, 'Location ID')),
      remote: offer.remote
    });
    if (!Object.keys(payload).length && offer.status === undefined)
      fail('Supply at least one offer field or status.');
    let updated = Object.keys(payload).length
      ? this.offer(await this.request('patch', `/offers/${id}`, { offer: payload }), id)
      : (await this.getOffer(id)).offer;
    if (offer.status !== undefined && updated.status !== offer.status) {
      try {
        updated = (await this.transitionOffer(id, offer.status)).offer;
      } catch {
        throw createApiServiceError(
          `Offer ${id} was updated, but its requested status transition failed. Read it before retrying; accepted changes remain.`,
          { reason: 'recruitee_partial_offer_update' }
        );
      }
    }
    return { offer: updated };
  }
  async transitionOffer(id: number, status: string) {
    let routes: Record<string, string> = {
      draft: 'draft',
      published: 'publish',
      internal: 'unpublish',
      closed: 'close',
      archived: 'archive'
    };
    let route = routes[status];
    if (!route) fail('Unsupported offer status.');
    await this.request('patch', `/offers/${integer(id, 'Offer ID')}/${route}`, {});
    let result = await this.getOffer(id);
    if (result.offer.status !== status)
      fail(
        'Offer status did not match the requested transition. Read the offer before continuing.'
      );
    return result;
  }
  async deleteOffer(id: number) {
    await this.getOffer(id);
    let result = await this.request('delete', `/offers/${integer(id, 'Offer ID')}`);
    entity(result, 'offer', id);
    try {
      await this.getOffer(id);
    } catch (error) {
      if (missing(error)) return { offerId: id, deleted: true };
      throw error;
    }
    fail('Offer remains readable after deletion. Read its actual state before retrying.');
  }
  async changeStage(
    id: number,
    stageId: number,
    opts: {
      proceed?: boolean;
      hiredAt?: string;
      jobStartsAt?: string;
      workLocationId?: number;
      openingId?: number;
    } = {}
  ) {
    let result = await this.request(
      'patch',
      `/placements/${integer(id, 'Placement ID')}/change_stage`,
      {
        stage_id: integer(stageId, 'Stage ID'),
        proceed: opts.proceed,
        hired_at: opts.hiredAt,
        job_starts_at: opts.jobStartsAt,
        work_location_id:
          opts.workLocationId === undefined
            ? undefined
            : integer(opts.workLocationId, 'Work location ID'),
        opening_id:
          opts.openingId === undefined ? undefined : integer(opts.openingId, 'Opening ID')
      }
    );
    let placement = entity(result, 'placement', id);
    if (placement.stage_id !== stageId)
      fail(
        'Placement stage did not match the requested transition. Read candidate placements before retrying.'
      );
    return result;
  }
  async disqualifyCandidate(id: number, reason?: number) {
    let result = await this.request(
      'patch',
      `/placements/${integer(id, 'Placement ID')}/disqualify`,
      { disqualify_reason_id: integer(reason, 'Disqualification reason ID') }
    );
    let placement = entity(result, 'placement', id);
    if (placement.disqualify_kind !== 'admin')
      fail(
        'Placement disqualification state was not confirmed. Read candidate placements before retrying.'
      );
    return result;
  }
  async requalifyCandidate(id: number) {
    let result = await this.request(
      'patch',
      `/placements/${integer(id, 'Placement ID')}/requalify`,
      {}
    );
    let placement = entity(result, 'placement', id);
    if (placement.disqualify_kind !== null)
      fail(
        'Placement requalification state was not confirmed. Read candidate placements before retrying.'
      );
    return result;
  }
  async createPlacement(candidateId: number, offerId?: number, talentPoolId?: number) {
    if ((offerId === undefined) === (talentPoolId === undefined))
      fail('Assign to exactly one offerId or talentPoolId.');
    let result = await this.request('post', '/placements', {
      candidate_id: integer(candidateId, 'Candidate ID'),
      offer_id: offerId === undefined ? undefined : integer(offerId, 'Offer ID'),
      talent_pool_id:
        talentPoolId === undefined ? undefined : integer(talentPoolId, 'Talent pool ID')
    });
    let placement = entity(result, 'placement');
    if (
      placement.candidate_id !== candidateId ||
      (offerId !== undefined && placement.offer_id !== offerId) ||
      (talentPoolId !== undefined && placement.talent_pool_id !== talentPoolId)
    )
      fail(
        'Created placement identity did not match the requested candidate and offer. Read the records before retrying.'
      );
    return result;
  }
  async deletePlacement(id: number) {
    const result = await this.request('delete', `/placements/${integer(id, 'Placement ID')}`);
    const placement = entity(result, 'placement', id),
      candidateId = integer(placement.candidate_id, 'Deleted placement candidate ID');
    if ((await this.getCandidate(candidateId)).candidate.placements.some(p => p.id === id))
      fail(
        'Placement remains on the candidate after removal. Read the profile before retrying.'
      );
    return result;
  }
  async listDepartments() {
    let result = await this.request('get', '/departments');
    return {
      ...result,
      departments: list(result, 'departments').map(d => ({
        ...d,
        id: integer(d.id, 'Department ID'),
        name: text(d.name, 'Department name')
      }))
    };
  }
  async listLocations() {
    let result = await this.request('get', '/locations');
    return {
      ...result,
      locations: list(result, 'locations').map(l => ({
        ...l,
        id: integer(l.id, 'Location ID'),
        full_address:
          typeof l.full_address === 'string'
            ? l.full_address
            : [l.city, l.country].filter(v => typeof v === 'string').join(', '),
        country_code: nullableString(l.country_code, 'country code'),
        state_code: nullableString(l.state_code, 'state code')
      }))
    };
  }
  async listDisqualifyReasons() {
    let result = await this.request('get', '/disqualify_reasons');
    return {
      ...result,
      disqualify_reasons: list(result, 'disqualify_reasons').map(r => ({
        ...r,
        id: integer(r.id, 'Reason ID'),
        name: text(r.name, 'Reason name')
      }))
    };
  }
  async pipelineStages(offer: Offer) {
    let template = isRow(offer.pipeline_template) ? offer.pipeline_template : undefined;
    if (
      !template &&
      offer.pipeline_template_id !== undefined &&
      offer.pipeline_template_id !== null
    )
      template = row(
        (
          await this.request(
            'get',
            `/pipeline_templates/${integer(offer.pipeline_template_id, 'Pipeline template ID')}`
          )
        ).pipeline_template,
        'pipeline template'
      );
    if (!template) return undefined;
    return list({ stages: template.stages }, 'stages').map(stage => ({
      stageId: integer(stage.id, 'Pipeline stage ID'),
      name: text(stage.name, 'Pipeline stage name'),
      ...(typeof stage.group === 'string' ? { group: stage.group } : {}),
      ...(typeof stage.category === 'string' ? { category: stage.category } : {})
    }));
  }
  async candidateAttachments(id: number) {
    let result = await this.request(
      'get',
      `/candidates/${integer(id, 'Candidate ID')}/attachments`
    );
    return list(result, 'attachments');
  }
}
