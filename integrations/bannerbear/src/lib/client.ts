import { createAxios } from 'slates';

export class BannerbearClient {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.bannerbear.com/v2'
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ─── Account ───────────────────────────────────────────────

  async getAccount() {
    let response = await this.axios.get('/account', { headers: this.headers });
    return response.data;
  }

  // ─── Templates ─────────────────────────────────────────────

  async listTemplates(params?: {
    page?: number;
    limit?: number;
    tag?: string;
    name?: string;
  }) {
    let response = await this.axios.get('/templates', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTemplate(templateUid: string) {
    let response = await this.axios.get(`/templates/${templateUid}`, {
      headers: this.headers,
      params: { extended: true }
    });
    return response.data;
  }

  async createTemplate(data: {
    name: string;
    width: number;
    height: number;
    tags?: string[];
    metadata?: any;
  }) {
    let response = await this.axios.post('/templates', data, { headers: this.headers });
    return response.data;
  }

  async updateTemplate(
    templateUid: string,
    data: { name?: string; tags?: string[]; metadata?: any }
  ) {
    let response = await this.axios.patch(`/templates/${templateUid}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteTemplate(templateUid: string) {
    let response = await this.axios.delete(`/templates/${templateUid}`, {
      headers: this.headers
    });
    return response.data;
  }

  async duplicateTemplate(sourceUid: string) {
    let response = await this.axios.post(
      `/templates?source=${sourceUid}`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async importTemplates(publications: string[]) {
    let response = await this.axios.post(
      '/templates/import',
      { publications },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Template Sets ─────────────────────────────────────────

  async listTemplateSets(params?: { page?: number }) {
    let response = await this.axios.get('/template_sets', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTemplateSet(templateSetUid: string) {
    let response = await this.axios.get(`/template_sets/${templateSetUid}`, {
      headers: this.headers,
      params: { extended: true }
    });
    return response.data;
  }

  async createTemplateSet(data: { name: string; templates: string[] }) {
    let response = await this.axios.post('/template_sets', data, { headers: this.headers });
    return response.data;
  }

  async updateTemplateSet(
    templateSetUid: string,
    data: { name?: string; templates?: string[] }
  ) {
    let response = await this.axios.patch(`/template_sets/${templateSetUid}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Images ────────────────────────────────────────────────

  async createImage(data: {
    template: string;
    modifications: any[];
    webhook_url?: string;
    transparent?: boolean;
    render_pdf?: boolean;
    metadata?: any;
    template_version?: number;
    project_id?: string;
  }) {
    let response = await this.axios.post('/images', data, { headers: this.headers });
    return response.data;
  }

  async getImage(imageUid: string) {
    let response = await this.axios.get(`/images/${imageUid}`, { headers: this.headers });
    return response.data;
  }

  async listImages(params?: { page?: number; limit?: number }) {
    let response = await this.axios.get('/images', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Videos ────────────────────────────────────────────────

  async createVideo(data: {
    video_template: string;
    input_media_url?: string;
    modifications?: any[];
    frames?: any[];
    frame_durations?: number[];
    webhook_url?: string;
    metadata?: any;
    trim_to_length_in_seconds?: number;
    trim_from?: number;
    zoom?: boolean;
    zoom_factor?: number;
    blur?: boolean;
    create_gif_preview?: boolean;
    transcription?: any[];
    approved?: boolean;
    project_id?: string;
  }) {
    let response = await this.axios.post('/videos', data, { headers: this.headers });
    return response.data;
  }

  async getVideo(videoUid: string) {
    let response = await this.axios.get(`/videos/${videoUid}`, { headers: this.headers });
    return response.data;
  }

  async updateVideo(videoUid: string, data: { transcription?: any[]; approved?: boolean }) {
    let response = await this.axios.patch(
      '/videos',
      { uid: videoUid, ...data },
      { headers: this.headers }
    );
    return response.data;
  }

  async listVideos(params?: { page?: number }) {
    let response = await this.axios.get('/videos', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Video Templates ──────────────────────────────────────

  async listVideoTemplates(params?: { page?: number }) {
    let response = await this.axios.get('/video_templates', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getVideoTemplate(videoTemplateUid: string) {
    let response = await this.axios.get(`/video_templates/${videoTemplateUid}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createVideoTemplate(data: {
    template: string;
    render_type: string;
    approval_required?: boolean;
    transcription_layer_name?: string;
  }) {
    let response = await this.axios.post('/video_templates', data, { headers: this.headers });
    return response.data;
  }

  // ─── Collections ───────────────────────────────────────────

  async createCollection(data: {
    template_set: string;
    modifications: any[];
    webhook_url?: string;
    transparent?: boolean;
    metadata?: any;
    project_id?: string;
  }) {
    let response = await this.axios.post('/collections', data, { headers: this.headers });
    return response.data;
  }

  async getCollection(collectionUid: string) {
    let response = await this.axios.get(`/collections/${collectionUid}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listCollections(params?: { page?: number }) {
    let response = await this.axios.get('/collections', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Animated GIFs ────────────────────────────────────────

  async createAnimatedGif(data: {
    template: string;
    frames: any[][];
    input_media_url?: string;
    fps?: number;
    frame_durations?: number[];
    loop?: boolean;
    webhook_url?: string;
    metadata?: any;
    project_id?: string;
  }) {
    let response = await this.axios.post('/animated_gifs', data, { headers: this.headers });
    return response.data;
  }

  async getAnimatedGif(gifUid: string) {
    let response = await this.axios.get(`/animated_gifs/${gifUid}`, { headers: this.headers });
    return response.data;
  }

  async listAnimatedGifs(params?: { page?: number }) {
    let response = await this.axios.get('/animated_gifs', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Movies ────────────────────────────────────────────────

  async createMovie(data: {
    width: number;
    height: number;
    inputs: Array<{
      asset_url: string;
      trim_to_length_in_seconds?: number;
      mute?: boolean;
    }>;
    transition?: string;
    soundtrack_url?: string;
    webhook_url?: string;
    metadata?: any;
    project_id?: string;
  }) {
    let response = await this.axios.post('/movies', data, { headers: this.headers });
    return response.data;
  }

  async getMovie(movieUid: string) {
    let response = await this.axios.get(`/movies/${movieUid}`, { headers: this.headers });
    return response.data;
  }

  async listMovies(params?: { page?: number }) {
    let response = await this.axios.get('/movies', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Screenshots ───────────────────────────────────────────

  async createScreenshot(data: {
    url: string;
    width?: number;
    height?: number;
    mobile?: boolean;
    language?: string;
    webhook_url?: string;
    metadata?: any;
    project_id?: string;
  }) {
    let response = await this.axios.post('/screenshots', data, { headers: this.headers });
    return response.data;
  }

  async getScreenshot(screenshotUid: string) {
    let response = await this.axios.get(`/screenshots/${screenshotUid}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listScreenshots(params?: { page?: number }) {
    let response = await this.axios.get('/screenshots', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Sessions ──────────────────────────────────────────────

  async createSession(data: {
    template: string;
    mode?: string;
    metadata?: any;
    custom_fonts?: string[];
  }) {
    let response = await this.axios.post('/sessions', data, { headers: this.headers });
    return response.data;
  }

  async getSession(sessionUid: string) {
    let response = await this.axios.get(`/sessions/${sessionUid}`, { headers: this.headers });
    return response.data;
  }

  async listSessions(params?: { page?: number }) {
    let response = await this.axios.get('/sessions', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Signed URLs ───────────────────────────────────────────

  async createSignedBase(templateUid: string) {
    let response = await this.axios.post(
      `/templates/${templateUid}/signed_bases`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async listSignedBases(templateUid: string, params?: { page?: number }) {
    let response = await this.axios.get(`/templates/${templateUid}/signed_bases`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Diagnoses ─────────────────────────────────────────────

  async createDiagnosis(imageUid: string) {
    let response = await this.axios.post(
      '/diagnoses',
      { image_uid: imageUid },
      { headers: this.headers }
    );
    return response.data;
  }

  async getDiagnosis(diagnosisUid: string) {
    let response = await this.axios.get(`/diagnoses/${diagnosisUid}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── PDF Utilities ─────────────────────────────────────────

  async joinPdfs(data: { pdf_inputs: string[]; webhook_url?: string; metadata?: any }) {
    let response = await this.axios.post('/utilities/pdf/join', data, {
      headers: this.headers
    });
    return response.data;
  }

  async getJoinedPdf(uid: string) {
    let response = await this.axios.get(`/utilities/pdf/join/${uid}`, {
      headers: this.headers
    });
    return response.data;
  }

  async rasterizePdf(data: { url: string; dpi?: number; webhook_url?: string }) {
    let response = await this.axios.post('/utilities/pdf/rasterize', data, {
      headers: this.headers
    });
    return response.data;
  }

  async getRasterizedPdf(uid: string) {
    let response = await this.axios.get(`/utilities/pdf/rasterize/${uid}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Webhooks ──────────────────────────────────────────────

  async createWebhook(data: { url: string; event: string }) {
    let response = await this.axios.post('/webhooks', data, { headers: this.headers });
    return response.data;
  }

  async getWebhook(webhookUid: string) {
    let response = await this.axios.get(`/webhooks/${webhookUid}`, { headers: this.headers });
    return response.data;
  }

  async deleteWebhook(webhookUid: string) {
    let response = await this.axios.delete(`/webhooks/${webhookUid}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Fonts & Effects ──────────────────────────────────────

  async listFonts() {
    let response = await this.axios.get('/fonts', { headers: this.headers });
    return response.data;
  }

  async listEffects() {
    let response = await this.axios.get('/effects', { headers: this.headers });
    return response.data;
  }
}
