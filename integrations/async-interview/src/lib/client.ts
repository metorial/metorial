import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://app.asyncinterview.ai/api';

export interface Job {
  jobId: number;
  title: string;
  [key: string]: unknown;
}

export interface InterviewResponse {
  responseId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobId: number;
  jobTitle: string;
  interviewTitle: string;
  stageId: number;
  date: string;
  time: string;
  datetime: string;
  shareUrl: string;
  internalUrl: string;
  textQuestionsAnswers: Record<string, unknown>;
  videoUrl: string;
  audioUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  attempts: InterviewAttempt[];
}

export interface InterviewAttempt {
  attemptId: number;
  durationSeconds: number;
  videoUrl: string;
  thumbnailUrl: string;
  streamingVideoUrl: string;
  recordedAt: string;
}

export interface RawInterviewResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  job_id: number;
  job: string;
  title: string;
  stage_id: number;
  date: string;
  time: string;
  datetime: string;
  url: string;
  full_share_url: string;
  internal_url: string;
  text_questions_answers: Record<string, unknown>;
  video: string;
  audio: string;
  thumb: string;
  duration: number;
  attempts: RawAttempt[];
  [key: string]: unknown;
}

export interface RawAttempt {
  attempt_id: number;
  duration: number;
  video: string;
  thumb: string;
  streaming_video: string;
  recorded_at: string;
  answers?: unknown[];
}

export class Client {
  private http;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('An Async Interview API token is required.', {
        reason: 'missing_api_token'
      });
    }

    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Async Interview',
          reason: 'api_request_failed'
        })
    });
  }

  async listJobs(): Promise<Record<string, unknown>[]> {
    let response = await this.http.get('/jobs');
    if (!Array.isArray(response.data) || !response.data.every(isApiErrorRecord)) {
      throw createApiServiceError('Async Interview returned an unexpected jobs response.', {
        reason: 'invalid_api_response'
      });
    }
    return response.data;
  }

  async listInterviewResponses(): Promise<RawInterviewResponse[]> {
    let response = await this.http.get('/interview_responses');
    if (
      !Array.isArray(response.data) ||
      !response.data.every(
        item =>
          isApiErrorRecord(item) &&
          (item.attempts == null ||
            (Array.isArray(item.attempts) && item.attempts.every(isApiErrorRecord)))
      )
    ) {
      throw createApiServiceError(
        'Async Interview returned an unexpected interview responses response.',
        { reason: 'invalid_api_response' }
      );
    }
    return response.data;
  }

  mapInterviewResponse(raw: RawInterviewResponse): InterviewResponse {
    return {
      responseId: raw.id,
      candidateName: raw.name,
      candidateEmail: raw.email,
      candidatePhone: raw.phone,
      jobId: raw.job_id,
      jobTitle: raw.job,
      interviewTitle: raw.title,
      stageId: raw.stage_id,
      date: raw.date,
      time: raw.time,
      datetime: raw.datetime,
      shareUrl: raw.full_share_url,
      internalUrl: raw.internal_url,
      textQuestionsAnswers: raw.text_questions_answers ?? {},
      videoUrl: raw.video ?? '',
      audioUrl: raw.audio ?? '',
      thumbnailUrl: raw.thumb ?? '',
      durationSeconds: raw.duration ?? 0,
      attempts: (raw.attempts ?? []).map(a => ({
        attemptId: a.attempt_id,
        durationSeconds: a.duration,
        videoUrl: a.video ?? '',
        thumbnailUrl: a.thumb ?? '',
        streamingVideoUrl: a.streaming_video ?? '',
        recordedAt: a.recorded_at ?? ''
      }))
    };
  }
}
