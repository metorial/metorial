import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

export const BASE_URL = 'https://castingwords.com/store/API4';
export const transcriptFormats = [
  'txt',
  'doc',
  'rtf',
  'html',
  'srt',
  'docx',
  'tstxt',
  'vtt'
] as const;
export type TranscriptFormat = (typeof transcriptFormats)[number];
export const transcriptMimeTypes: Record<TranscriptFormat, string> = {
  txt: 'text/plain',
  doc: 'application/msword',
  rtf: 'application/rtf',
  html: 'text/html',
  srt: 'application/x-subrip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  tstxt: 'text/plain',
  vtt: 'text/vtt'
};

const orderSchema = z
  .object({
    audiofiles: z.array(z.number()),
    order: z.string(),
    message: z.string().optional(),
    hold: z.string().optional()
  })
  .passthrough();

const audiofileSchema = z
  .object({
    id: z.number(),
    statename: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    duration: z.number().optional(),
    names: z.string().optional(),
    notes: z.string().optional(),
    originallink: z.string().optional(),
    quality_stars: z.number().optional(),
    orders: z.array(z.string()).optional(),
    invoices: z.array(z.string()).optional(),
    total: z.string().optional()
  })
  .passthrough();

const invoiceSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    purchase_order: z.string().optional(),
    createtime: z.string().optional(),
    paidtime: z.string().optional(),
    total: z.string().optional(),
    state: z.string().optional(),
    items: z
      .array(
        z
          .object({
            id: z.number().optional(),
            sku: z.string().optional(),
            quantity: z.number().optional(),
            price: z.string().optional(),
            audiofile: z.number().optional(),
            total: z.string().optional()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough();

const messageSchema = z.object({ message: z.string().min(1) }).passthrough();
const balanceSchema = z
  .object({ balance: z.string().regex(/^-?\d+(?:\.\d+)?$/) })
  .passthrough();
const credentialKey =
  /^(?:key|sig|auth|authorization|AWSAccessKeyId)$|(?:^|[-_])(?:api[-_]?key|token|secret|password|signature|credential)(?:$|[-_])/i;

export const validateAudiofileId = (audiofileId: number) => {
  if (!Number.isSafeInteger(audiofileId) || audiofileId <= 0) {
    throw createApiServiceError('The audiofile ID must be a positive safe integer.');
  }
};

export class Client {
  private axios = createAxios({
    baseURL: BASE_URL,
    timeout: 60_000,
    headers: { 'Content-Type': 'application/json' }
  });

  constructor(private token: string) {
    if (typeof token !== 'string' || !token.trim()) {
      throw createApiServiceError(
        'A CastingWords API key is required. Reconnect the account.'
      );
    }
  }

  // API4 echoes media URLs and messages into public data. Download query auth
  // travels separately through the file result and never through this mapper.
  sanitize<T>(value: T): T {
    const redact = (item: unknown): unknown => {
      if (typeof item === 'string') {
        let text = item;
        for (const secret of new Set([this.token, encodeURIComponent(this.token)])) {
          text = text.split(secret).join('[redacted]');
        }
        text = text.replace(
          /([?&](?:api[-_]?key|access[-_]?token|refresh[-_]?token|token|key|secret|password|authorization)=)[^&#\s"'<>]*/gi,
          '$1[redacted]'
        );
        return text.replace(/https?:\/\/[^\s"'<>]+/gi, urlText => {
          try {
            const url = new URL(urlText);
            let changed = false;
            if (url.username || url.password) {
              url.username = '[redacted]';
              url.password = '';
              changed = true;
            }
            for (const key of [...url.searchParams.keys()]) {
              if (credentialKey.test(key)) {
                url.searchParams.set(key, '[redacted]');
                changed = true;
              }
            }
            return changed ? url.toString() : urlText;
          } catch {
            return urlText;
          }
        });
      }
      if (Array.isArray(item)) return item.map(redact);
      if (isApiErrorRecord(item)) {
        return Object.fromEntries(
          Object.entries(item).map(([key, nested]) => [
            key,
            credentialKey.test(key) && nested !== null ? '[redacted]' : redact(nested)
          ])
        );
      }
      return item;
    };
    return redact(value) as T;
  }

  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw createApiServiceError(
        'CastingWords returned an invalid response. Try again or contact CastingWords support.'
      );
    }
    return result.data;
  }

  private async request(operation: string, request: Parameters<typeof requestAxiosData>[1]) {
    const data = await requestAxiosData(operation, request, (error, currentOperation) =>
      buildApiServiceError(error, {
        providerLabel: 'CastingWords',
        reason: 'castingwords_api_error',
        operation: currentOperation,
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
        formatMessage: ({ statusLabel, message }) =>
          this.sanitize(`CastingWords ${currentOperation} failed: ${statusLabel}${message}`),
        parent: {}
      })
    );
    return this.sanitize(data);
  }

  async orderTranscription(params: {
    urls: string[];
    skus?: string[];
    notes?: string;
    speakerNames?: string[];
    test?: boolean;
  }) {
    for (const mediaUrl of params.urls) {
      let url: URL;
      try {
        url = new URL(mediaUrl);
      } catch {
        throw createApiServiceError('Each media URL must be an absolute HTTP or HTTPS URL.');
      }
      if (!['https:', 'http:'].includes(url.protocol)) {
        throw createApiServiceError('Each media URL must use HTTP or HTTPS.');
      }
    }
    const body = {
      api_key: this.token,
      url: params.urls,
      ...(params.skus?.length ? { sku: params.skus } : {}),
      ...(params.notes !== undefined ? { notes: params.notes } : {}),
      ...(params.speakerNames?.length ? { names: params.speakerNames } : {}),
      ...(params.test ? { test: '1' } : {})
    };
    const raw = await this.request('order transcription', () =>
      this.axios.post('/order_url', body)
    );
    const result = this.parse(orderSchema, raw);
    for (const id of result.audiofiles) validateAudiofileId(id);
    if (result.audiofiles.length === 0 || !result.order.trim()) {
      throw createApiServiceError(
        'CastingWords did not return the created order and audiofile IDs. Check the account before retrying to avoid a duplicate order.'
      );
    }
    return { result, raw };
  }

  async getAudiofileDetails(audiofileId: number) {
    validateAudiofileId(audiofileId);
    const raw = await this.request('get audiofile details', () =>
      this.axios.get(`/audiofile/${audiofileId}`, {
        params: { api_key: this.token }
      })
    );
    const value = isApiErrorRecord(raw) && 'audiofile' in raw ? raw.audiofile : raw;
    const result = this.parse(audiofileSchema, value);
    validateAudiofileId(result.id);
    if (!result.statename.trim())
      throw createApiServiceError(
        'CastingWords returned an audiofile without a processing state.'
      );
    return { result, raw };
  }

  getTranscriptDownload(audiofileId: number, format: TranscriptFormat, test?: boolean) {
    validateAudiofileId(audiofileId);
    return {
      type: 'url' as const,
      url: `${BASE_URL}/audiofile/${audiofileId}/transcript.${format}`,
      query: { api_key: this.token, ...(test ? { test: '1' } : {}) },
      mimeType: transcriptMimeTypes[format]
    };
  }

  async getTranscript(audiofileId: number, format: 'txt' | 'doc' | 'rtf' | 'html') {
    const download = this.getTranscriptDownload(audiofileId, format);
    const result = await this.request('retrieve transcript', () =>
      this.axios.get(download.url, {
        params: download.query,
        responseType: 'text',
        transformResponse: [(data: unknown) => data]
      })
    );
    return this.parse(z.string(), result);
  }

  async upgradeAudiofile(audiofileId: number, skus: string[], test?: boolean) {
    validateAudiofileId(audiofileId);
    const raw = await this.request('upgrade audiofile', () =>
      this.axios.post(`/audiofile/${audiofileId}/upgrade`, {
        api_key: this.token,
        sku: skus,
        ...(test ? { test: '1' } : {})
      })
    );
    return { result: this.parse(messageSchema, raw), raw };
  }

  async refundAudiofile(audiofileId: number, test?: boolean) {
    validateAudiofileId(audiofileId);
    const raw = await this.request('refund audiofile', () =>
      this.axios.post(`/audiofile/${audiofileId}/refund`, {
        api_key: this.token,
        ...(test ? { test: '1' } : {})
      })
    );
    return { result: this.parse(messageSchema, raw), raw };
  }

  async getInvoice(invoiceId: string) {
    if (!invoiceId.trim() || invoiceId === '.' || invoiceId === '..') {
      throw createApiServiceError('A valid invoice ID is required.');
    }
    const raw = await this.request('get invoice', () =>
      this.axios.get(`/invoice/${encodeURIComponent(invoiceId)}`, {
        params: { api_key: this.token }
      })
    );
    return { result: this.parse(invoiceSchema, raw), raw };
  }

  async getPrepayBalance() {
    const raw = await this.request('get prepay balance', () =>
      this.axios.get('/prepay_balance', {
        params: { api_key: this.token }
      })
    );
    return { result: this.parse(balanceSchema, raw), raw };
  }

  async getWebhook() {
    const raw = await this.request('get webhook', () =>
      this.axios.get('/webhook', {
        params: { api_key: this.token }
      })
    );
    const value = isApiErrorRecord(raw) && 'webhook' in raw ? raw.webhook : raw;
    return { webhookUrl: this.parse(z.string().nullable(), value), raw };
  }
}
