import { createAxios } from 'slates';

export class PlaygroundClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(apiKey: string) {
    this.axios = createAxios({
      baseURL: 'https://os.gan.ai',
      headers: {
        'ganos-api-key': apiKey
      }
    });
  }

  // ---- Voices ----

  async listVoices(): Promise<{
    data: Array<{
      voice_id: string;
      voice_name: string | null;
      voice_description: string | null;
      voice_sample: string | null;
    }>;
    total_voices: number;
  }> {
    let response = await this.axios.get('/v1/voices');
    return response.data;
  }

  // ---- TTS ----

  async generateSpeech(params: {
    voiceId: string;
    text: string;
  }): Promise<{ audioData: string }> {
    let response = await this.axios.post(
      '/v1/tts',
      {
        voice_id: params.voiceId,
        text: params.text
      },
      {
        responseType: 'arraybuffer'
      }
    );

    let base64 = Buffer.from(response.data).toString('base64');
    return { audioData: base64 };
  }

  async getTtsHistory(params: { skip?: number; limit?: number }): Promise<{
    total: number;
    data: Array<{
      inference_id: string;
      tts_input_text: string;
      voice_name: string | null;
      created_at: string | null;
      audio_file: string | null;
    }>;
  }> {
    let response = await this.axios.get('/v1/tts/history', {
      params: {
        skip: params.skip ?? 0,
        limit: params.limit ?? 10
      }
    });
    return response.data;
  }

  // ---- Avatars ----

  async createAvatar(params: {
    baseVideoUrl: string;
    title?: string;
    webhookUrl?: string;
  }): Promise<{
    avatar_id: string;
    title: string | null;
    thumbnail: string | null;
    status: string;
    base_video: string | null;
    avatar_webhook: { webhook_url: string } | null;
    created_at: string | null;
  }> {
    let body: Record<string, unknown> = {
      base_video_url: params.baseVideoUrl
    };
    if (params.title) body.title = params.title;
    if (params.webhookUrl) {
      body.webhook_data = { webhook_url: params.webhookUrl };
    }
    let response = await this.axios.post('/v1/avatars/create_avatar', body);
    return response.data;
  }

  async listAvatars(params: {
    title?: string;
    status?: string[];
    skip?: number;
    limit?: number;
    startDatetime?: string;
    endDatetime?: string;
  }): Promise<{
    total_avatars: number;
    avatars_list: Array<{
      avatar_id: string;
      title: string | null;
      thumbnail: string | null;
      status: string;
      base_video: string | null;
      created_at: string | null;
    }>;
  }> {
    let response = await this.axios.get('/v1/avatars/list', {
      params: {
        title: params.title,
        status: params.status,
        skip: params.skip ?? 0,
        limit: params.limit ?? 10,
        start_datetime: params.startDatetime,
        end_datetime: params.endDatetime
      }
    });
    return response.data;
  }

  async getAvatarDetails(avatarId: string): Promise<{
    avatar_id: string;
    title: string | null;
    thumbnail: string | null;
    status: string;
    base_video: string | null;
    created_at: string | null;
    avatar_processing_results: Array<{ check_name: string; check_status: string }> | null;
    consent_verification_results: Array<{ check_name: string; check_status: string }> | null;
  }> {
    let response = await this.axios.get('/v1/avatars/avatar_details', {
      params: { avatar_id: avatarId }
    });
    return response.data;
  }

  async createAvatarVideo(params: {
    avatarId: string;
    title?: string;
    text?: string;
    audioUrl?: string;
  }): Promise<{
    avatar_id: string;
    avatar_title: string | null;
    inference_id: string;
    title: string | null;
    status: string;
    video: string | null;
    input_text: string | null;
    thumbnail: string | null;
    created_at: string | null;
  }> {
    let body: Record<string, unknown> = {
      avatar_id: params.avatarId
    };
    if (params.title) body.title = params.title;
    if (params.text) body.text = params.text;
    if (params.audioUrl) body.audio_url = params.audioUrl;

    let response = await this.axios.post('/v1/avatars/create_video', body);
    return response.data;
  }

  async getAvatarInferenceDetails(inferenceId: string): Promise<{
    avatar_id: string;
    avatar_title: string | null;
    inference_id: string;
    title: string | null;
    status: string;
    video: string | null;
    input_text: string | null;
    thumbnail: string | null;
    created_at: string | null;
  }> {
    let response = await this.axios.get('/v1/avatars/inference_details', {
      params: { inference_id: inferenceId }
    });
    return response.data;
  }

  async listAvatarInferences(params: {
    avatarId?: string;
    avatarTitle?: string;
    inferenceTitle?: string;
    status?: string[];
    skip?: number;
    limit?: number;
    startDatetime?: string;
    endDatetime?: string;
  }): Promise<{
    total: number;
    data: Array<{
      avatar_id: string;
      avatar_title: string | null;
      inference_id: string;
      title: string | null;
      status: string;
      video: string | null;
      input_text: string | null;
      thumbnail: string | null;
      created_at: string | null;
    }>;
  }> {
    let response = await this.axios.get('/v1/avatars/list_inferences', {
      params: {
        avatar_id: params.avatarId,
        avatar_title: params.avatarTitle,
        inference_title: params.inferenceTitle,
        status: params.status,
        skip: params.skip ?? 0,
        limit: params.limit ?? 10,
        start_datetime: params.startDatetime,
        end_datetime: params.endDatetime
      }
    });
    return response.data;
  }

  async deleteAvatars(avatarIds: string[]): Promise<{
    deleted_avatars_count: number;
    deletion_failed_avatars_count: number;
    associated_inferences_deleted_count: number;
    deleted_avatar_ids: string[];
    deletion_failed_avatar_ids: string[];
  }> {
    let response = await this.axios.delete('/v1/avatars/bulk_delete_avatars', {
      data: avatarIds
    });
    return response.data;
  }

  async deleteAvatarInferences(inferenceIds: string[]): Promise<{
    deleted_inferences_count: number;
    deletion_failed_inferences_count: number;
    deleted_inference_ids: string[];
    deletion_failed_inference_ids: string[];
  }> {
    let response = await this.axios.delete('/v1/avatars/bulk_delete_avatar_inferences', {
      data: inferenceIds
    });
    return response.data;
  }

  // ---- Consent ----

  async getConsentPasscode(avatarId: string): Promise<{
    passcode: string;
    expire_at: number;
  }> {
    let response = await this.axios.get('/v1/consents/consent_passcode', {
      params: { avatar_id: avatarId }
    });
    return response.data;
  }

  async submitConsent(params: {
    avatarId: string;
    consentVideoUrl: string;
  }): Promise<boolean> {
    let response = await this.axios.post('/v1/consents/submit_consent', null, {
      params: {
        avatar_id: params.avatarId,
        consent_video: params.consentVideoUrl
      }
    });
    return response.data;
  }

  // ---- Photo Avatars ----

  async createPhotoAvatar(params: {
    baseImageUrl: string;
    title?: string;
    webhookUrl?: string;
  }): Promise<{
    photo_avatar_id: string;
    title: string | null;
    base_image: string | null;
    status: string;
    created_at: string | null;
  }> {
    let body: Record<string, unknown> = {
      base_image_url: params.baseImageUrl
    };
    if (params.title) body.title = params.title;
    if (params.webhookUrl) {
      body.webhook_data = { webhook_url: params.webhookUrl };
    }
    let response = await this.axios.post('/v1/photo_avatars/create', body);
    return response.data;
  }

  async listPhotoAvatars(params: {
    title?: string;
    status?: string[];
    skip?: number;
    limit?: number;
    startDatetime?: string;
    endDatetime?: string;
  }): Promise<{
    total: number;
    avatars_list: Array<{
      photo_avatar_id: string;
      title: string | null;
      base_image: string | null;
      status: string;
      created_at: string | null;
    }>;
  }> {
    let response = await this.axios.get('/v1/photo_avatars/list', {
      params: {
        title: params.title,
        status: params.status,
        skip: params.skip ?? 0,
        limit: params.limit ?? 20,
        start_datetime: params.startDatetime,
        end_datetime: params.endDatetime
      }
    });
    return response.data;
  }

  async getPhotoAvatarDetails(photoAvatarId: string): Promise<{
    photo_avatar_id: string;
    title: string | null;
    base_image: string | null;
    status: string;
    created_at: string | null;
  }> {
    let response = await this.axios.get('/v1/photo_avatars/details', {
      params: { photo_avatar_id: photoAvatarId }
    });
    return response.data;
  }

  async createPhotoAvatarInference(params: {
    photoAvatarId: string;
    title?: string;
    text?: string;
    audioUrl?: string;
    voiceSampleUrl?: string;
  }): Promise<{
    photo_avatar_id: string;
    photo_avatar_inference_id: string;
    title: string | null;
    status: string;
    video: string | null;
    downloadable_video_link: string | null;
    input_text: string | null;
    created_at: string | null;
    credit_details: { tts_cost: number; gan_cost: number } | null;
  }> {
    let body: Record<string, unknown> = {
      photo_avatar_id: params.photoAvatarId
    };
    if (params.title) body.title = params.title;
    if (params.text) body.text = params.text;
    if (params.audioUrl) body.audio_url = params.audioUrl;
    if (params.voiceSampleUrl) body.voice_sample_url = params.voiceSampleUrl;

    let response = await this.axios.post('/v1/photo_avatars/create_inference', body);
    return response.data;
  }

  async listPhotoAvatarInferences(params: {
    photoAvatarId?: string;
    title?: string;
    status?: string[];
    skip?: number;
    limit?: number;
    startDatetime?: string;
    endDatetime?: string;
  }): Promise<{
    total: number;
    inference_list: Array<{
      photo_avatar_id: string;
      photo_avatar_inference_id: string;
      title: string | null;
      status: string;
      video: string | null;
      downloadable_video_link: string | null;
      input_text: string | null;
      created_at: string | null;
    }>;
  }> {
    let response = await this.axios.get('/v1/photo_avatars/list_inference', {
      params: {
        photo_avatar_id: params.photoAvatarId,
        title: params.title,
        status: params.status,
        skip: params.skip ?? 0,
        limit: params.limit ?? 10,
        start_datetime: params.startDatetime,
        end_datetime: params.endDatetime
      }
    });
    return response.data;
  }

  async getPhotoAvatarInferenceDetails(params: {
    photoAvatarInferenceId: string;
    downloadableLink?: boolean;
  }): Promise<{
    photo_avatar_id: string;
    photo_avatar_inference_id: string;
    title: string | null;
    status: string;
    video: string | null;
    downloadable_video_link: string | null;
    input_text: string | null;
    created_at: string | null;
  }> {
    let response = await this.axios.get('/v1/photo_avatars/inference_details', {
      params: {
        photo_avatar_inference_id: params.photoAvatarInferenceId,
        downloadable_link: params.downloadableLink ?? false
      }
    });
    return response.data;
  }

  // ---- Lip-Sync ----

  async createLipsync(params: {
    title?: string;
    description?: string;
    inputVideoUrl: string;
    inputAudioUrl?: string;
    useAudioFromVideo?: boolean;
    webhookUrl?: string;
  }): Promise<{
    inference_id: string;
    video_url: string | null;
    thumbnail_url: string | null;
    status: string;
    input_video: string;
    input_audio: string;
    use_audio_from_video: boolean;
    created_at: string;
    title: string | null;
    description: string | null;
  }> {
    let body: Record<string, unknown> = {
      inputs: {
        input_video_url: params.inputVideoUrl,
        input_audio_url: params.inputAudioUrl || '',
        use_audio_from_video: params.useAudioFromVideo ?? false
      }
    };
    if (params.title) body.title = params.title;
    if (params.description) body.description = params.description;
    if (params.webhookUrl) {
      body.webhook_data = {
        enabled: true,
        webhook_url: params.webhookUrl
      };
    }

    let response = await this.axios.post('/v1/lipsync/create_lipsync', body);
    return response.data;
  }

  async getLipsyncDetails(inferenceId: string): Promise<{
    inference_id: string;
    video_url: string | null;
    thumbnail_url: string | null;
    status: string;
    input_video: string;
    input_audio: string;
    use_audio_from_video: boolean;
    created_at: string;
    title: string | null;
    description: string | null;
  }> {
    let response = await this.axios.get('/v1/lipsync/inference_details', {
      params: { inference_id: inferenceId }
    });
    return response.data;
  }

  async listLipsyncs(params: {
    title?: string;
    status?: string[];
    skip?: number;
    limit?: number;
    startDatetime?: string;
    endDatetime?: string;
  }): Promise<{
    total_count: number;
    lipsyncs: Array<{
      inference_id: string;
      video_url: string | null;
      thumbnail_url: string | null;
      status: string;
      input_video: string;
      input_audio: string;
      use_audio_from_video: boolean;
      created_at: string;
      title: string | null;
      description: string | null;
    }>;
  }> {
    let response = await this.axios.get('/v1/lipsync/get_user_lipsyncs', {
      params: {
        title: params.title,
        status: params.status,
        skip: params.skip ?? 0,
        limit: params.limit ?? 10,
        start_datetime: params.startDatetime,
        end_datetime: params.endDatetime
      }
    });
    return response.data;
  }

  async deleteLipsyncs(inferenceIds: string[]): Promise<{
    deleted_count: number;
    failed_count: number;
    deleted_ids: string[];
    failed_ids: string[];
  }> {
    let response = await this.axios.delete('/v1/lipsync/bulk_delete_lipsyncs', {
      data: inferenceIds
    });
    return response.data;
  }

  // ---- Sound Effects ----

  async generateSoundEffect(params: {
    prompt: string;
    numVariations?: number;
    durationSeconds?: number;
    creativity?: number;
  }): Promise<
    Array<{
      sfx_inference_history_object: {
        inference_id: string;
        sfx_prompt: string;
        generation_params: {
          duration_seconds: number;
          creativity: number;
          seed: number;
        };
        created_at: string;
      };
      wav_base64: string;
    }>
  > {
    let response = await this.axios.post('/v1/sfx/generate', {
      prompt: params.prompt,
      num_variations: params.numVariations ?? 3,
      duration_seconds: params.durationSeconds ?? 1,
      creativity: params.creativity ?? 0
    });
    return response.data;
  }

  async getSfxAudio(inferenceId: string): Promise<{
    sfx_inference_history_object: {
      inference_id: string;
      sfx_prompt: string;
      generation_params: {
        duration_seconds: number;
        creativity: number;
        seed: number;
      };
      created_at: string;
    };
    wav_base64: string;
  }> {
    let response = await this.axios.post('/v1/sfx/audio', {
      inference_id: inferenceId
    });
    return response.data;
  }

  async getSfxHistory(params: { skip?: number; limit?: number }): Promise<{
    total: number;
    data: Array<{
      inference_id: string;
      sfx_prompt: string;
      generation_params: {
        duration_seconds: number;
        creativity: number;
        seed: number;
      };
      created_at: string;
    }>;
  }> {
    let response = await this.axios.get('/v1/sfx/history', {
      params: {
        skip: params.skip ?? 0,
        limit: params.limit ?? 10
      }
    });
    return response.data;
  }
}
