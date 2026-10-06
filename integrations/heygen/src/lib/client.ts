import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  getResponseHeaderValue,
  pickDefined,
  requestAxios
} from 'slates';
import { z } from 'zod';

export type HeyGenAuth = {
  token: string;
  authType?: 'api_key' | 'oauth';
  refreshToken?: string;
};

const videoSchema = z.object({
  id: z.string(),
  status: z.string(),
  title: z.string().nullish(),
  video_url: z.url({ protocol: /^https?$/ }).nullish(),
  thumbnail_url: z.string().nullish(),
  gif_url: z.string().nullish(),
  subtitle_url: z.url({ protocol: /^https?$/ }).nullish(),
  duration: z.number().nullish(),
  created_at: z.number().nullish(),
  failure_message: z.string().nullish(),
  video_page_url: z.string().nullish()
});
const avatarSchema = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.string().nullish(),
  avatar_type: z.string(),
  preview_image_url: z.string().nullish(),
  preview_video_url: z.string().nullish(),
  default_voice_id: z.string().nullish(),
  supported_api_engines: z.array(z.string()).optional()
});
const voiceSchema = z.object({
  voice_id: z.string(),
  name: z.string(),
  language: z.string(),
  gender: z.string(),
  preview_audio_url: z.string().nullish(),
  support_pause: z.boolean(),
  support_locale: z.boolean(),
  available_engines: z.array(z.string()).optional()
});
const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail_url: z.string().nullish()
});
const assetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string().nullish(),
  owner: z.string(),
  uploaded_at: z.number()
});
const userSchema = z
  .object({
    username: z.string(),
    email: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    billing_type: z.string().nullish(),
    wallet: z
      .object({ currency: z.string(), remaining_balance: z.number().nullish() })
      .nullish(),
    usage_based: z.object({ remaining_credits: z.number().nullish() }).passthrough().nullish(),
    subscription: z
      .object({
        plan: z.string(),
        credits: z.object({
          premium_credits: z.object({ remaining: z.number().nullish() }).nullish(),
          add_on_credits: z.object({ remaining: z.number().nullish() }).nullish()
        })
      })
      .nullish()
  })
  .passthrough();
const translationSchema = z.object({
  id: z.string(),
  status: z.string(),
  output_language: z.string().nullish(),
  video_url: z.url({ protocol: /^https?$/ }).nullish(),
  audio_url: z.url({ protocol: /^https?$/ }).nullish(),
  srt_caption_url: z.url({ protocol: /^https?$/ }).nullish(),
  vtt_caption_url: z.url({ protocol: /^https?$/ }).nullish(),
  failure_message: z.string().nullish()
});

export class HeyGenClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(auth: HeyGenAuth) {
    const oauth = auth.authType === 'oauth' || (!auth.authType && !!auth.refreshToken);
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.heygen.com',
      timeout: 120_000,
      authHeader: {
        name: oauth ? 'Authorization' : 'X-Api-Key',
        value: oauth ? `Bearer ${auth.token}` : auth.token
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'HeyGen',
          reason: 'heygen_api_error'
        })
    });
  }

  private async request<S extends z.ZodType>(
    method: 'get' | 'post' | 'delete',
    path: string,
    schema: S,
    options: {
      params?: Record<string, unknown>;
      data?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<z.infer<S>> {
    const response = await this.axios.request({ method, url: path, ...options });
    const parsed = schema.safeParse(response.data);
    if (!parsed.success)
      throw createApiServiceError(
        'HeyGen returned an unexpected response. Retry the request or check API availability.'
      );
    return parsed.data;
  }

  private async page<S extends z.ZodType>(
    path: string,
    item: S,
    params: Record<string, unknown>
  ) {
    return this.request(
      'get',
      path,
      z.object({
        data: z.array(item),
        next_token: z.string().nullish(),
        has_more: z.boolean()
      }),
      { params: pickDefined(params) }
    );
  }

  async listAvatars(
    params: { token?: string; limit?: number; ownership?: string; avatarType?: string } = {}
  ) {
    const page = await this.page('/v3/avatars/looks', avatarSchema, {
      token: params.token,
      limit: params.limit,
      ownership: params.ownership,
      avatar_type: params.avatarType
    });
    return { avatars: page.data, token: page.next_token ?? null, hasMore: page.has_more };
  }

  async listVoices(
    params: {
      token?: string;
      limit?: number;
      type?: string;
      engine?: string;
      language?: string;
      gender?: string;
    } = {}
  ) {
    const page = await this.page('/v3/voices', voiceSchema, params);
    return { voices: page.data, token: page.next_token ?? null, hasMore: page.has_more };
  }

  async createVideo(params: {
    videoInputs: Array<{
      character: {
        type: string;
        avatarId: string;
        avatarStyle?: string;
        engine?: 'avatar_iii' | 'avatar_iv' | 'avatar_v';
        scale?: number;
        offset?: { x: number; y: number };
      };
      voice: {
        type: string;
        voiceId?: string;
        inputText?: string;
        inputAudio?: string;
        speed?: number;
        emotion?: string;
      };
      background?: { type: string; value?: string; url?: string };
    }>;
    dimension?: { width: number; height: number };
    aspectRatio?: string;
    resolution?: string;
    test?: boolean;
    callbackId?: string;
    title?: string;
  }) {
    // Retain legacy layout/test options while the provider still supports their documented API.
    const legacy =
      params.test === true ||
      !!params.dimension ||
      params.videoInputs.some(
        scene =>
          (scene.character.avatarStyle && scene.character.avatarStyle !== 'normal') ||
          scene.character.scale !== undefined ||
          !!scene.character.offset ||
          !!scene.voice.emotion ||
          scene.background?.type === 'video' ||
          (params.videoInputs.length > 1 &&
            !!scene.background &&
            scene.background.type !== 'color')
      );
    if (legacy) {
      if (params.videoInputs.some(scene => scene.character.engine))
        throw createApiServiceError(
          'Avatar engine selection cannot be combined with legacy layout or test options. Remove those options to use v3.'
        );
      if (params.resolution)
        throw createApiServiceError(
          'resolution cannot be combined with legacy layout or test options. Use dimension instead.'
        );
      const result = await this.request(
        'post',
        '/v2/video/generate',
        z.object({ data: z.object({ video_id: z.string() }) }),
        {
          data: pickDefined({
            video_inputs: params.videoInputs.map(scene => ({
              character: pickDefined({
                type: scene.character.type,
                avatar_id:
                  scene.character.type === 'avatar' ? scene.character.avatarId : undefined,
                talking_photo_id:
                  scene.character.type === 'talking_photo'
                    ? scene.character.avatarId
                    : undefined,
                avatar_style: scene.character.avatarStyle,
                scale: scene.character.scale,
                offset: scene.character.offset
              }),
              voice: pickDefined({
                type: scene.voice.type,
                voice_id: scene.voice.voiceId,
                input_text: scene.voice.inputText,
                audio_url: scene.voice.inputAudio,
                speed: scene.voice.speed,
                emotion: scene.voice.emotion
              }),
              background: scene.background
            })),
            dimension: params.dimension,
            aspect_ratio: params.aspectRatio,
            test: params.test,
            title: params.title,
            callback_id: params.callbackId
          })
        }
      );
      return { videoId: result.data.video_id };
    }
    const scenes = params.videoInputs.map(scene =>
      pickDefined({
        type: 'avatar',
        avatar_id: scene.character.avatarId,
        script: scene.voice.type === 'text' ? scene.voice.inputText : undefined,
        voice_id: scene.voice.type === 'text' ? scene.voice.voiceId : undefined,
        audio_url: scene.voice.type === 'audio' ? scene.voice.inputAudio : undefined,
        engine: scene.character.engine ? { type: scene.character.engine } : undefined,
        voice_settings:
          scene.voice.type !== 'text' || scene.voice.speed === undefined
            ? undefined
            : { speed: scene.voice.speed }
      })
    );
    const first = params.videoInputs[0];
    if (!first) throw createApiServiceError('At least one scene is required.');
    const result = await this.request(
      'post',
      '/v3/videos',
      z.object({ data: z.object({ video_id: z.string() }) }),
      {
        data: pickDefined({
          ...(scenes.length === 1
            ? {
                ...scenes[0],
                background:
                  first.background?.type === 'transparent' ? undefined : first.background,
                output_format: first.background?.type === 'transparent' ? 'webm' : 'mp4'
              }
            : {
                type: 'studio',
                scenes: scenes.map((scene, index) => ({
                  type: 'avatar_video',
                  input: {
                    ...scene,
                    ...(params.videoInputs[index]?.background
                      ? {
                          background: {
                            type: 'color',
                            color: params.videoInputs[index]?.background?.value
                          }
                        }
                      : {})
                  }
                }))
              }),
          aspect_ratio: params.aspectRatio ?? 'auto',
          resolution: params.resolution ?? '1080p',
          title: params.title,
          callback_id: params.callbackId
        })
      }
    );
    return { videoId: result.data.video_id };
  }

  async getVideoStatus(videoId: string) {
    const result = await this.request(
      'get',
      `/v3/videos/${encodeURIComponent(videoId)}`,
      z.object({ data: videoSchema })
    );
    const data = result.data;
    return {
      videoId: data.id,
      status: data.status,
      videoUrl: data.video_url ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
      gifUrl: data.gif_url ?? null,
      duration: data.duration ?? null,
      caption: data.subtitle_url ?? null,
      error: data.failure_message ?? null,
      callbackId: null,
      createdAt: data.created_at ?? null,
      videoPageUrl: data.video_page_url ?? null
    };
  }

  async listVideos(params: { token?: string; limit?: number; title?: string } = {}) {
    const page = await this.page('/v3/videos', videoSchema, params);
    return {
      videos: page.data.map(data => ({
        videoId: data.id,
        title: data.title ?? null,
        status: data.status,
        videoUrl: data.video_url ?? null,
        thumbnailUrl: data.thumbnail_url ?? null,
        createdAt: data.created_at ?? null
      })),
      token: page.next_token ?? null,
      hasMore: page.has_more
    };
  }

  async deleteVideo(videoId: string) {
    await this.request(
      'delete',
      `/v3/videos/${encodeURIComponent(videoId)}`,
      z.object({
        data: z.object({ id: z.literal(videoId), deleted: z.literal(true).optional() })
      })
    );
  }

  async createVideoAgent(params: {
    prompt: string;
    avatarId?: string;
    voiceId?: string;
    title?: string;
    callbackId?: string;
    callbackUrl?: string;
  }) {
    const prompt = params.title ? `Title: ${params.title}\n${params.prompt}` : params.prompt;
    if (!prompt.trim() || prompt.length > 10_000)
      throw createApiServiceError(
        'The Video Agent prompt, including its optional title, must contain 1 to 10000 characters.'
      );
    const result = await this.request(
      'post',
      '/v3/video-agents',
      z.object({
        data: z.object({
          session_id: z.string(),
          status: z.string(),
          video_id: z.string().nullish()
        })
      }),
      {
        data: pickDefined({
          prompt,
          mode: 'generate',
          avatar_id: params.avatarId,
          voice_id: params.voiceId,
          callback_id: params.callbackId,
          callback_url: params.callbackUrl
        })
      }
    );
    return {
      sessionId: result.data.session_id,
      status: result.data.status,
      videoId: result.data.video_id ?? null
    };
  }

  async getVideoAgentStatus(sessionId: string) {
    const result = await this.request(
      'get',
      `/v3/video-agents/${encodeURIComponent(sessionId)}`,
      z.object({
        data: z
          .object({
            session_id: z.string(),
            status: z.string(),
            video_id: z.string().nullish()
          })
          .passthrough()
      })
    );
    return {
      sessionId: result.data.session_id,
      status: result.data.status,
      videoId: result.data.video_id ?? null
    };
  }

  async listTemplates(params: { token?: string; limit?: number } = {}) {
    const page = await this.page('/v3/templates', templateSchema, params);
    return {
      templates: page.data.map(data => ({
        templateId: data.id,
        name: data.name,
        thumbnailImageUrl: data.thumbnail_url ?? null
      })),
      token: page.next_token ?? null,
      hasMore: page.has_more
    };
  }

  async getTemplate(templateId: string) {
    const result = await this.request(
      'get',
      `/v3/templates/${encodeURIComponent(templateId)}`,
      z.object({
        data: templateSchema.extend({
          variables: z.record(z.string(), z.unknown()).default({})
        })
      })
    );
    return {
      templateId: result.data.id,
      name: result.data.name,
      variables: result.data.variables
    };
  }

  async generateFromTemplate(params: {
    templateId: string;
    variables: Record<string, unknown>;
    title?: string;
    test?: boolean;
    callbackId?: string;
  }) {
    const path = params.test
      ? `/v2/template/${encodeURIComponent(params.templateId)}/generate`
      : `/v3/templates/${encodeURIComponent(params.templateId)}`;
    const result = await this.request(
      'post',
      path,
      z.object({
        data: z.object({ id: z.string().optional(), video_id: z.string().optional() })
      }),
      {
        data: pickDefined({
          variables: params.variables,
          title: params.title,
          test: params.test === true ? true : undefined,
          callback_id: params.callbackId
        })
      }
    );
    const videoId = result.data.id ?? result.data.video_id;
    if (!videoId) throw createApiServiceError('HeyGen did not return a generated video ID.');
    return { videoId };
  }

  async listTranslationLanguages() {
    const result = await this.request(
      'get',
      '/v3/video-translations/languages',
      z.object({ data: z.object({ languages: z.array(z.string()) }) })
    );
    return result.data;
  }

  async translateVideo(params: {
    videoUrl?: string;
    videoId?: string;
    targetLanguages: string[];
    title?: string;
    callbackUrl?: string;
  }) {
    const videoUrl =
      params.videoUrl ??
      (params.videoId ? (await this.getVideoStatus(params.videoId)).videoUrl : null);
    if (!videoUrl)
      throw createApiServiceError(
        'The source video has no downloadable URL. Wait for the video to complete or provide a public videoUrl.'
      );
    const result = await this.request(
      'post',
      '/v3/video-translations',
      z.object({ data: z.object({ video_translation_ids: z.array(z.string()).min(1) }) }),
      {
        data: pickDefined({
          video: { type: 'url', url: videoUrl },
          output_languages: params.targetLanguages,
          title: params.title,
          callback_url: params.callbackUrl
        })
      }
    );
    const firstId = result.data.video_translation_ids[0];
    if (!firstId) throw createApiServiceError('HeyGen did not return a translation ID.');
    return { videoTranslateId: firstId, videoTranslateIds: result.data.video_translation_ids };
  }

  async getTranslationStatus(videoTranslateId: string) {
    const result = await this.request(
      'get',
      `/v3/video-translations/${encodeURIComponent(videoTranslateId)}`,
      z.object({ data: translationSchema })
    );
    const data = result.data;
    return {
      videoTranslateId: data.id,
      status: data.status,
      targetLanguages: [
        {
          language: data.output_language ?? '',
          videoUrl: data.video_url ?? null,
          status: data.status
        }
      ],
      error: data.failure_message ?? null,
      audioUrl: data.audio_url ?? null,
      srtCaptionUrl: data.srt_caption_url ?? null,
      vttCaptionUrl: data.vtt_caption_url ?? null
    };
  }

  async listTranslations(params: { token?: string; limit?: number } = {}) {
    const page = await this.page('/v3/video-translations', translationSchema, params);
    return {
      translations: page.data.map(data => ({
        videoTranslateId: data.id,
        status: data.status,
        language: data.output_language ?? null
      })),
      paginationToken: page.next_token ?? null,
      hasMore: page.has_more
    };
  }

  async deleteTranslation(videoTranslateId: string) {
    await this.request(
      'delete',
      `/v3/video-translations/${encodeURIComponent(videoTranslateId)}`,
      z.object({ data: z.object({ id: z.literal(videoTranslateId) }) })
    );
  }

  async generateSpeech(params: {
    text: string;
    voiceId: string;
    speed?: number;
    title?: string;
  }) {
    const result = await this.request(
      'post',
      '/v3/voices/speech',
      z.object({
        data: z.object({
          audio_url: z.url({ protocol: /^https?$/ }),
          duration: z.number(),
          request_id: z.string().nullish()
        })
      }),
      {
        data: pickDefined({ text: params.text, voice_id: params.voiceId, speed: params.speed })
      }
    );
    return {
      audioUrl: result.data.audio_url,
      duration: result.data.duration,
      requestId: result.data.request_id ?? null
    };
  }

  async createStreamingToken() {
    const result = await this.request(
      'post',
      '/v1/streaming.create_token',
      z.object({ data: z.object({ token: z.string() }) })
    );
    return { sessionToken: result.data.token };
  }

  async listTalkingPhotos(params: { token?: string; limit?: number } = {}) {
    const page = await this.listAvatars({
      ...params,
      avatarType: 'photo_avatar',
      ownership: 'private'
    });
    return {
      talkingPhotos: page.avatars.map(data => ({
        talkingPhotoId: data.id,
        talkingPhotoName: data.name,
        previewImageUrl: data.preview_image_url ?? null
      })),
      token: page.token,
      hasMore: page.hasMore
    };
  }

  async uploadAsset(params: { url: string; type?: string }) {
    const source = new URL(params.url);
    if (!['https:', 'http:'].includes(source.protocol)) {
      throw createApiServiceError('Asset URLs must use HTTP or HTTPS.');
    }
    const download = await requestAxios(
      'asset download',
      () =>
        createAxios({ timeout: 120_000, maxContentLength: 32 * 1024 * 1024 }).get<ArrayBuffer>(
          params.url,
          { responseType: 'arraybuffer' }
        ),
      (error, operation) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'HeyGen',
          reason: 'heygen_api_error',
          operation
        })
    );
    const mimeType =
      getResponseHeaderValue(download.headers, 'content-type')?.split(';')[0] ||
      'application/octet-stream';
    if (
      params.type &&
      mimeType !== 'application/octet-stream' &&
      !mimeType.startsWith(`${params.type}/`)
    ) {
      throw createApiServiceError(
        `The source file is ${mimeType}, which does not match the requested ${params.type} asset type.`
      );
    }
    const extensions: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'application/pdf': 'pdf'
    };
    const form = new FormData();
    let fileName = source.pathname.split('/').pop() || 'asset';
    if (!fileName.includes('.') && extensions[mimeType])
      fileName += `.${extensions[mimeType]}`;
    form.append(
      'file',
      new Blob([new Uint8Array(download.data)], { type: mimeType }),
      fileName
    );
    const result = await this.request(
      'post',
      '/v3/assets',
      z.object({
        data: z.object({
          asset_id: z.string(),
          url: z.string(),
          mime_type: z.string(),
          size_bytes: z.number()
        })
      }),
      { data: form, headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return {
      assetId: result.data.asset_id,
      url: result.data.url,
      mimeType: result.data.mime_type,
      sizeBytes: result.data.size_bytes
    };
  }

  async listAssets(params: { type?: string; token?: string; limit?: number } = {}) {
    const user = await this.getCurrentUser();
    const page = await this.page('/v3/assets', assetSchema, {
      username: user.username,
      token: params.token,
      limit: params.limit
    });
    return {
      assets: page.data
        .filter(data => !params.type || data.type === params.type)
        .map(data => ({
          assetId: data.id,
          name: data.name,
          type: data.type,
          url: data.url ?? null
        })),
      token: page.next_token ?? null,
      hasMore: page.has_more
    };
  }

  async deleteAsset(assetId: string) {
    await this.request(
      'delete',
      `/v3/assets/${encodeURIComponent(assetId)}`,
      z.object({ data: z.object({ id: z.literal(assetId) }) })
    );
  }

  async getCurrentUser() {
    const result = await this.request('get', '/v3/users/me', z.object({ data: userSchema }));
    return result.data;
  }

  async getRemainingQuota() {
    const user = await this.getCurrentUser();
    const credits = user.subscription?.credits;
    const available = [
      credits?.premium_credits?.remaining,
      credits?.add_on_credits?.remaining
    ].filter((value): value is number => typeof value === 'number');
    return {
      remainingQuota:
        user.usage_based?.remaining_credits ??
        (available.length ? available.reduce((sum, value) => sum + value, 0) : null),
      details: user
    };
  }
}
