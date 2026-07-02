import { createAxios } from 'slates';

export class HeyGenClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.heygen.com',
      headers: {
        'X-Api-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Avatars ----

  async listAvatars(): Promise<{
    avatars: Array<{
      avatar_id: string;
      avatar_name: string;
      gender: string;
      preview_image_url: string;
      preview_video_url: string;
    }>;
  }> {
    let response = await this.axios.get('/v2/avatars');
    return response.data.data;
  }

  // ---- Voices ----

  async listVoices(): Promise<{
    voices: Array<{
      voice_id: string;
      language: string;
      gender: string;
      name: string;
      preview_audio: string;
      support_pause: boolean;
      emotion_support: boolean;
    }>;
  }> {
    let response = await this.axios.get('/v2/voices');
    return response.data.data;
  }

  // ---- Video Generation ----

  async createVideo(params: {
    videoInputs: Array<{
      character?: {
        type: string;
        avatarId?: string;
        avatarStyle?: string;
        scale?: number;
        offset?: { x: number; y: number };
      };
      voice?: {
        type: string;
        voiceId?: string;
        inputText?: string;
        inputAudio?: string;
        speed?: number;
        emotion?: string;
      };
      background?: {
        type: string;
        value?: string;
        url?: string;
      };
    }>;
    dimension?: { width: number; height: number };
    aspectRatio?: string;
    test?: boolean;
    callbackId?: string;
    callbackUrl?: string;
    title?: string;
  }): Promise<{ videoId: string }> {
    let body: Record<string, any> = {
      video_inputs: params.videoInputs.map(input => {
        let scene: Record<string, any> = {};

        if (input.character) {
          scene.character = {
            type: input.character.type,
            avatar_id: input.character.avatarId,
            avatar_style: input.character.avatarStyle,
            scale: input.character.scale,
            offset: input.character.offset
          };
        }

        if (input.voice) {
          scene.voice = {
            type: input.voice.type,
            voice_id: input.voice.voiceId,
            input_text: input.voice.inputText,
            input_audio: input.voice.inputAudio,
            speed: input.voice.speed,
            emotion: input.voice.emotion
          };
        }

        if (input.background) {
          scene.background = {
            type: input.background.type,
            value: input.background.value,
            url: input.background.url
          };
        }

        return scene;
      })
    };

    if (params.dimension) body.dimension = params.dimension;
    if (params.aspectRatio) body.aspect_ratio = params.aspectRatio;
    if (params.test !== undefined) body.test = params.test;
    if (params.callbackId) body.callback_id = params.callbackId;
    if (params.callbackUrl) body.callback_url = params.callbackUrl;
    if (params.title) body.title = params.title;

    let response = await this.axios.post('/v2/video/generate', body);
    return { videoId: response.data.data.video_id };
  }

  async getVideoStatus(videoId: string): Promise<{
    videoId: string;
    status: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    gifUrl: string | null;
    duration: number | null;
    caption: string | null;
    error: string | null;
    callbackId: string | null;
    createdAt: number | null;
  }> {
    let response = await this.axios.get(`/v1/video_status.get`, {
      params: { video_id: videoId }
    });
    let data = response.data.data;
    return {
      videoId: data.video_id || videoId,
      status: data.status,
      videoUrl: data.video_url || null,
      thumbnailUrl: data.thumbnail_url || null,
      gifUrl: data.gif_url || null,
      duration: data.duration || null,
      caption: data.caption || null,
      error: data.error || null,
      callbackId: data.callback_id || null,
      createdAt: data.created_at || null
    };
  }

  async listVideos(params?: { token?: string; limit?: number }): Promise<{
    videos: Array<{
      videoId: string;
      title: string | null;
      status: string;
      videoUrl: string | null;
      thumbnailUrl: string | null;
      createdAt: number | null;
    }>;
    token: string | null;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.token) queryParams.token = params.token;
    if (params?.limit) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/v1/video.list', { params: queryParams });
    let data = response.data.data;

    return {
      videos: (data.videos || []).map((v: any) => ({
        videoId: v.video_id,
        title: v.title || null,
        status: v.status,
        videoUrl: v.video_url || null,
        thumbnailUrl: v.thumbnail_url || null,
        createdAt: v.created_at || null
      })),
      token: data.token || null
    };
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.axios.delete(`/v1/video.delete`, {
      params: { video_id: videoId }
    });
  }

  // ---- Video Agent ----

  async createVideoAgent(params: {
    prompt: string;
    avatarId?: string;
    voiceId?: string;
    title?: string;
    callbackId?: string;
    callbackUrl?: string;
  }): Promise<{ videoId: string }> {
    let body: Record<string, any> = {
      prompt: params.prompt
    };

    if (params.avatarId) body.avatar_id = params.avatarId;
    if (params.voiceId) body.voice_id = params.voiceId;
    if (params.title) body.title = params.title;
    if (params.callbackId) body.callback_id = params.callbackId;
    if (params.callbackUrl) body.callback_url = params.callbackUrl;

    let response = await this.axios.post('/v2/video_agent/create', body);
    return { videoId: response.data.data.video_id };
  }

  // ---- Templates ----

  async listTemplates(): Promise<{
    templates: Array<{
      templateId: string;
      name: string;
      thumbnailImageUrl: string | null;
    }>;
  }> {
    let response = await this.axios.get('/v2/templates');
    let data = response.data.data;

    return {
      templates: (data.templates || []).map((t: any) => ({
        templateId: t.template_id,
        name: t.name,
        thumbnailImageUrl: t.thumbnail_image_url || null
      }))
    };
  }

  async getTemplate(templateId: string): Promise<{
    templateId: string;
    name: string;
    variables: Record<string, any>;
  }> {
    let response = await this.axios.get(`/v2/template/${templateId}`);
    let data = response.data.data;

    return {
      templateId: data.template_id || templateId,
      name: data.name,
      variables: data.variables || {}
    };
  }

  async generateFromTemplate(params: {
    templateId: string;
    variables: Record<string, any>;
    title?: string;
    test?: boolean;
    callbackId?: string;
  }): Promise<{ videoId: string }> {
    let body: Record<string, any> = {
      template_id: params.templateId,
      variables: params.variables
    };

    if (params.title) body.title = params.title;
    if (params.test !== undefined) body.test = params.test;
    if (params.callbackId) body.callback_id = params.callbackId;

    let response = await this.axios.post('/v2/template/generate', body);
    return { videoId: response.data.data.video_id };
  }

  // ---- Video Translation ----

  async translateVideo(params: {
    videoUrl?: string;
    videoId?: string;
    targetLanguages: string[];
    title?: string;
    callbackUrl?: string;
  }): Promise<{ videoTranslateId: string }> {
    let body: Record<string, any> = {
      target_languages: params.targetLanguages
    };

    if (params.videoUrl) body.video_url = params.videoUrl;
    if (params.videoId) body.video_id = params.videoId;
    if (params.title) body.title = params.title;
    if (params.callbackUrl) body.callback_url = params.callbackUrl;

    let response = await this.axios.post('/v2/video_translate/create', body);
    return { videoTranslateId: response.data.data.video_translate_id };
  }

  async getTranslationStatus(videoTranslateId: string): Promise<{
    videoTranslateId: string;
    status: string;
    targetLanguages: Array<{
      language: string;
      videoUrl: string | null;
      status: string;
    }>;
    error: string | null;
  }> {
    let response = await this.axios.get(`/v2/video_translate/${videoTranslateId}`);
    let data = response.data.data;

    return {
      videoTranslateId: data.video_translate_id || videoTranslateId,
      status: data.status,
      targetLanguages: (data.target_languages || []).map((l: any) => ({
        language: l.language,
        videoUrl: l.video_url || null,
        status: l.status
      })),
      error: data.error || null
    };
  }

  // ---- Text-to-Speech ----

  async generateSpeech(params: {
    text: string;
    voiceId: string;
    speed?: number;
    title?: string;
  }): Promise<{ audioUrl: string }> {
    let body: Record<string, any> = {
      text: params.text,
      voice_id: params.voiceId
    };

    if (params.speed !== undefined) body.speed = params.speed;
    if (params.title) body.title = params.title;

    let response = await this.axios.post('/v1/audio/text_to_speech', body);
    return { audioUrl: response.data.data.audio_url };
  }

  // ---- Streaming ----

  async createStreamingToken(): Promise<{ sessionToken: string }> {
    let response = await this.axios.post('/v1/streaming.create_token');
    return { sessionToken: response.data.data.token };
  }

  async listStreamingAvatars(): Promise<{
    avatars: Array<{
      avatarId: string;
      avatarName: string;
      previewImageUrl: string | null;
    }>;
  }> {
    let response = await this.axios.get('/v1/streaming/avatar.list');
    let data = response.data.data;

    return {
      avatars: (data.avatars || []).map((a: any) => ({
        avatarId: a.avatar_id,
        avatarName: a.avatar_name,
        previewImageUrl: a.preview_image_url || null
      }))
    };
  }

  // ---- Photo Avatars ----

  async listTalkingPhotos(): Promise<{
    talkingPhotos: Array<{
      talkingPhotoId: string;
      talkingPhotoName: string;
      previewImageUrl: string | null;
    }>;
  }> {
    let response = await this.axios.get('/v1/talking_photo.list');
    let data = response.data.data;

    return {
      talkingPhotos: (data.talking_photos || []).map((p: any) => ({
        talkingPhotoId: p.talking_photo_id,
        talkingPhotoName: p.talking_photo_name,
        previewImageUrl: p.preview_image_url || null
      }))
    };
  }

  // ---- Assets ----

  async uploadAsset(params: { url: string; type?: string }): Promise<{ assetId: string }> {
    let body: Record<string, any> = {
      url: params.url
    };
    if (params.type) body.type = params.type;

    let response = await this.axios.post('/v1/asset', body);
    return { assetId: response.data.data.asset_id };
  }

  async listAssets(params?: { type?: string }): Promise<{
    assets: Array<{
      assetId: string;
      name: string | null;
      type: string;
      url: string | null;
    }>;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.type) queryParams.type = params.type;

    let response = await this.axios.get('/v1/asset', { params: queryParams });
    let data = response.data.data;

    return {
      assets: (data.assets || []).map((a: any) => ({
        assetId: a.asset_id,
        name: a.name || null,
        type: a.type,
        url: a.url || null
      }))
    };
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.axios.delete(`/v1/asset/${assetId}`);
  }

  // ---- Account ----

  async getRemainingQuota(): Promise<{
    remainingQuota: number;
    details: Record<string, any>;
  }> {
    let response = await this.axios.get('/v2/user/remaining_quota');
    let data = response.data.data;

    return {
      remainingQuota: data.remaining_quota,
      details: data
    };
  }

  // ---- Webhooks ----

  async addWebhookEndpoint(params: { url: string; events: string[] }): Promise<{
    endpointId: string;
    secret: string;
    url: string;
    events: string[];
  }> {
    let response = await this.axios.post('/v1/webhook/endpoint.add', {
      url: params.url,
      events: params.events
    });
    let data = response.data.data;

    return {
      endpointId: data.endpoint_id,
      secret: data.secret,
      url: data.url,
      events: data.events
    };
  }

  async listWebhookEndpoints(): Promise<{
    endpoints: Array<{
      endpointId: string;
      url: string;
      events: string[];
    }>;
  }> {
    let response = await this.axios.get('/v1/webhook/endpoint.list');
    let data = response.data.data;

    return {
      endpoints: (data.endpoints || []).map((e: any) => ({
        endpointId: e.endpoint_id,
        url: e.url,
        events: e.events
      }))
    };
  }

  async deleteWebhookEndpoint(endpointId: string): Promise<void> {
    await this.axios.delete('/v1/webhook/endpoint.delete', {
      data: { endpoint_id: endpointId }
    });
  }

  // ---- Personalized Video ----

  async addPersonalizedVideoContact(params: {
    projectId: string;
    variables: Record<string, string>;
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<{ contactId: string }> {
    let body: Record<string, any> = {
      project_id: params.projectId,
      variables: params.variables
    };

    if (params.firstName) body.first_name = params.firstName;
    if (params.lastName) body.last_name = params.lastName;
    if (params.email) body.email = params.email;

    let response = await this.axios.post('/v2/personalized_video/add_contact', body);
    return { contactId: response.data.data.contact_id };
  }
}
