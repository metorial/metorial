import { createAuthenticatedAxios, pickDefined, requestAxios } from 'slates';
import {
  address,
  type Connection,
  incomplete,
  integer,
  modifications,
  nonempty,
  protect,
  type Row,
  reject,
  row,
  rows,
  uid,
  upstream
} from './contracts';

export const resourcePaths = {
  image: '/images',
  video: '/videos',
  collection: '/collections',
  animated_gif: '/animated_gifs',
  movie: '/movies',
  screenshot: '/screenshots',
  template: '/templates',
  template_set: '/template_sets',
  video_template: '/video_templates',
  session: '/sessions',
  diagnosis: '/diagnoses',
  joined_pdf: '/utilities/pdf/join',
  rasterized_pdf: '/utilities/pdf/rasterize',
  project: '/projects'
} as const;
export type ResourceType = keyof typeof resourcePaths;
export type ListType =
  | Exclude<ResourceType, 'diagnosis' | 'joined_pdf' | 'rasterized_pdf'>
  | 'signed_base';
export class BannerbearClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(private config: Connection) {
    if (
      !config.token ||
      Array.from(config.token).some(
        char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127
      )
    )
      reject('Provide a valid V2 API key. V5 API keys cannot be used with these V2 tools.');
    try {
      encodeURIComponent(config.token);
    } catch {
      reject('Provide an API key containing valid Unicode text.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.bannerbear.com/v2',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0
    });
  }
  private scope(accountLevel: boolean): Row {
    if (accountLevel) {
      if (this.config.projectId !== undefined)
        reject('projectId does not apply to account or project discovery.');
      return {};
    }
    if (this.config.keyType === 'limited_master')
      reject(
        'A Limited Access Master API key can only discover projects; use a Project or Full Access Master V2 API key for this operation.'
      );
    if (this.config.keyType === 'full_master' && this.config.projectId === undefined)
      reject(
        'A Full Access Master API key requires projectId. Discover projects with list_resources.'
      );
    if (this.config.keyType === 'project' && this.config.projectId !== undefined)
      reject('A Project API key already selects its project; omit projectId.');
    return this.config.projectId === undefined
      ? {}
      : { project_id: uid(this.config.projectId) };
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: Row,
    params?: Row,
    accountLevel = false
  ): Promise<unknown> {
    const scope = this.scope(accountLevel);
    const body =
      data === undefined
        ? undefined
        : pickDefined({ ...data, ...(method === 'get' ? {} : scope) });
    const query = pickDefined({
      ...params,
      ...(method === 'get' || method === 'delete' ? scope : {})
    });
    protect({ path, body, query }, this.config.token);
    const response = await requestAxios(
      'Bannerbear API request',
      () => this.http.request<unknown>({ method, url: path, data: body, params: query }),
      upstream
    );
    if (
      !(
        method === 'get' ? [200] : method === 'delete' ? [200, 204] : [200, 201, 202]
      ).includes(response.status)
    )
      incomplete();
    protect(response.data, this.config.token);
    return response.data;
  }
  private result(
    value: unknown,
    expectedUid?: string,
    parent?: { key: string; uid: string }
  ): Row {
    const result = row(value);
    uid(result.uid);
    if (expectedUid !== undefined && result.uid !== uid(expectedUid)) incomplete();
    if (parent && result[parent.key] !== parent.uid) incomplete();
    return result;
  }
  async getAccount(): Promise<Row> {
    return this.result(await this.request('get', '/account', undefined, undefined, true));
  }
  async getResource(type: ResourceType, resourceUid: string): Promise<Row> {
    if (!(type in resourcePaths)) reject('Choose a supported resource type.');
    if (type === 'project' && this.config.keyType === 'project')
      reject('Project discovery requires a Master V2 API key.');
    return this.result(
      await this.request(
        'get',
        `${resourcePaths[type]}/${encodeURIComponent(uid(resourceUid))}`,
        undefined,
        type === 'template' || type === 'template_set' ? { extended: true } : undefined,
        type === 'project'
      ),
      resourceUid
    );
  }
  async listResources(
    type: ListType,
    params: {
      page?: number;
      limit?: number;
      templateUid?: string;
      tag?: string;
      name?: string;
    } = {}
  ): Promise<Row[]> {
    const page = params.page === undefined ? 1 : integer(params.page);
    if (params.limit !== undefined && type !== 'image' && type !== 'template')
      reject('limit is documented only for image and template listings.');
    if ((params.tag !== undefined || params.name !== undefined) && type !== 'template')
      reject('Name and tag filters apply only to templates.');
    if (params.templateUid !== undefined && type !== 'signed_base')
      reject('templateUid applies only to signed-base discovery.');
    if (type === 'project' && this.config.keyType === 'project')
      reject('Project discovery requires a Master V2 API key.');
    const path =
      type === 'signed_base'
        ? `/templates/${encodeURIComponent(uid(params.templateUid))}/signed_bases`
        : resourcePaths[type];
    if (!path) reject('Choose a supported resource listing.');
    const result = rows(
      await this.request(
        'get',
        path,
        undefined,
        {
          page,
          limit: params.limit === undefined ? undefined : integer(params.limit, 1, 100),
          tag: params.tag,
          name: params.name
        },
        type === 'project'
      )
    );
    const seen = new Set<string>();
    for (const item of result) {
      const id = uid(item.uid);
      if (seen.has(id)) incomplete();
      seen.add(id);
    }
    return result;
  }
  getTemplate(resourceUid: string) {
    return this.getResource('template', resourceUid);
  }
  listTemplates(params?: { page?: number; limit?: number; tag?: string; name?: string }) {
    return this.listResources('template', params);
  }
  async createTemplate(data: Row): Promise<Row> {
    if (typeof data.name !== 'string' || !data.name.trim())
      reject('name, width and height are required for a blank template.');
    integer(data.width);
    integer(data.height);
    return this.result(await this.request('post', '/templates', data));
  }
  async updateTemplate(resourceUid: string, data: Row): Promise<Row> {
    const body = pickDefined(data);
    if (!Object.keys(body).length) reject('Provide at least one template field to update.');
    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim()))
      reject('Provide a nonempty template name.');
    if (body.width !== undefined) integer(body.width);
    if (body.height !== undefined) integer(body.height);
    return this.result(
      await this.request('patch', `/templates/${encodeURIComponent(uid(resourceUid))}`, body),
      resourceUid
    );
  }
  async deleteTemplate(resourceUid: string): Promise<void> {
    await this.getTemplate(resourceUid);
    await this.request('delete', `/templates/${encodeURIComponent(uid(resourceUid))}`);
  }
  async duplicateTemplate(sourceUid: string): Promise<Row> {
    const source = uid(sourceUid);
    await this.getTemplate(source);
    const result = this.result(await this.request('post', '/templates', {}, { source }));
    if (result.uid === source) incomplete();
    return result;
  }
  async importTemplates(publications: string[]): Promise<Row[]> {
    if (!publications.length) reject('Provide at least one publication ID.');
    publications.forEach(uid);
    const result = rows(await this.request('post', '/templates/import', { publications }));
    if (!result.length) incomplete();
    const seen = new Set<string>();
    for (const item of result) {
      const id = uid(item.uid);
      if (seen.has(id)) incomplete();
      seen.add(id);
    }
    return result;
  }
  private async create(
    path: string,
    data: Row,
    parent?: { key: string; uid: string }
  ): Promise<Row> {
    for (const key of ['webhook_url', 'input_media_url', 'soundtrack_url', 'url'])
      if (data[key] !== undefined) address(data[key]);
    return this.result(await this.request('post', path, data), undefined, parent);
  }
  createImage(data: Row) {
    const template = uid(data.template);
    if (data.template_version !== undefined) integer(data.template_version);
    return this.create(
      '/images',
      { ...data, template, modifications: modifications(data.modifications) },
      { key: 'template', uid: template }
    );
  }
  async createVideo(data: Row): Promise<Row> {
    protect(data, this.config.token);
    const template = uid(data.video_template);
    const videoTemplate = await this.getResource('video_template', template);
    if (
      !['overlay', 'transcribe', 'multi_overlay'].includes(nonempty(videoTemplate.render_type))
    )
      incomplete();
    if (
      videoTemplate.render_type !== 'multi_overlay' &&
      (data.frames !== undefined || data.frame_durations !== undefined)
    )
      reject(
        'frames and frameDurations apply only to Multi Overlay video templates. Omit them or select a Multi Overlay template with list_resources.'
      );
    if (videoTemplate.render_type !== 'multi_overlay' && data.input_media_url === undefined)
      reject('This video build pack requires inputMediaUrl.');
    const body: Row = { ...data, video_template: template };
    if (data.modifications !== undefined)
      body.modifications = modifications(data.modifications);
    if (data.frames !== undefined) {
      const frames = data.frames;
      if (!Array.isArray(frames) || !frames.length)
        return reject('Provide at least one overlay frame.');
      body.frames = frames.map(modifications);
    }
    this.durations(data.frame_durations, data.frames);
    if (data.trim_to_length_in_seconds !== undefined) integer(data.trim_to_length_in_seconds);
    if (
      data.zoom_factor !== undefined &&
      (typeof data.zoom_factor !== 'number' ||
        !Number.isFinite(data.zoom_factor) ||
        data.zoom_factor < 1 ||
        data.zoom_factor > 100)
    )
      reject('zoomFactor must be between 1 and 100.');
    if (data.blur !== undefined) integer(data.blur, 1, 10);
    const result = await this.create('/videos', body);
    if (
      result.render_type !== videoTemplate.render_type ||
      (body.input_media_url !== undefined &&
        result.input_media_url !== body.input_media_url) ||
      (result.video_template !== undefined && result.video_template !== template)
    )
      incomplete();
    return result;
  }
  createCollection(data: Row) {
    const parent = uid(data.template_set);
    return this.create(
      '/collections',
      { ...data, template_set: parent, modifications: modifications(data.modifications) },
      { key: 'template_set', uid: parent }
    );
  }
  private durations(value: unknown, frames: unknown) {
    if (value === undefined) return;
    if (
      !Array.isArray(value) ||
      !Array.isArray(frames) ||
      value.length !== frames.length ||
      value.some(item => typeof item !== 'number' || !Number.isFinite(item) || item <= 0)
    )
      reject('Provide one positive frame duration for each frame.');
  }
  createAnimatedGif(data: Row) {
    const template = uid(data.template);
    const frames = data.frames;
    if (!Array.isArray(frames) || !frames.length || frames.length > 30)
      return reject('Provide between 1 and 30 GIF frames.');
    this.durations(data.frame_durations, data.frames);
    if (data.fps !== undefined) integer(data.fps);
    return this.create(
      '/animated_gifs',
      { ...data, template, frames: frames.map(modifications) },
      { key: 'template', uid: template }
    );
  }
  createMovie(data: Row) {
    integer(data.width);
    integer(data.height);
    const inputs = data.inputs;
    if (!Array.isArray(inputs) || !inputs.length || inputs.length > 10)
      return reject('Provide between 1 and 10 movie inputs.');
    for (const item of inputs.map(row)) {
      address(item.asset_url);
      if (item.trim_to_length_in_seconds !== undefined)
        integer(item.trim_to_length_in_seconds);
    }
    return this.create('/movies', data);
  }
  createScreenshot(data: Row) {
    address(data.url);
    if (data.width !== undefined) integer(data.width);
    if (data.height !== undefined) integer(data.height);
    return this.create('/screenshots', data);
  }
  createSession(data: Row) {
    const template = uid(data.template);
    return this.create('/sessions', { ...data, template }, { key: 'template', uid: template });
  }
  async createSignedBase(templateUid: string) {
    const template = uid(templateUid);
    await this.getTemplate(template);
    return this.result(
      await this.request('post', `/templates/${encodeURIComponent(template)}/signed_bases`, {})
    );
  }
  createDiagnosis(imageUid: string) {
    const parent = uid(imageUid);
    return this.create(
      '/diagnoses',
      { image_uid: parent },
      { key: 'parent_uid', uid: parent }
    );
  }
  joinPdfs(data: Row) {
    const inputs = data.pdf_inputs;
    if (!Array.isArray(inputs) || !inputs.length)
      return reject('Provide at least one PDF URL.');
    inputs.forEach(value => address(value));
    if (data.metadata !== undefined)
      reject('metadata is not documented for V2 PDF joining. Omit it.');
    return this.create('/utilities/pdf/join', data);
  }
  rasterizePdf(data: Row) {
    address(data.url);
    if (data.dpi !== undefined) integer(data.dpi, 1, 300);
    return this.create('/utilities/pdf/rasterize', data);
  }
}
