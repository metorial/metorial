import { Readable } from 'node:stream';
import PQueue from 'p-queue';
import {
  createBase64Attachment,
  createUrlAttachment,
  type SlateAttachment
} from '../action/attachment';
import { uploadAttachmentDirect, type SlateLiveInvocationInfo } from '../action/directUpload';
import type { SlateHttpTrace } from '../axios/trace';
import type { SlateLogger, SlateLogMessageInput } from '../logger';
import type { SlateSpecification } from '../specification/specification';

export type { SlateLiveInvocationInfo };

export type SlateAddAttachmentContent =
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | ReadableStream<Uint8Array>
  | NodeJS.ReadableStream
  | Response;

export type SlateAddAttachmentInput =
  | { type: 'url'; url: string | URL }
  | { type: 'content'; content: SlateAddAttachmentContent };

export interface SlateAddAttachmentOptions {
  mimeType?: string;
  filename?: string;
}

let isBufferLike = (value: unknown): value is Buffer | Uint8Array | ArrayBuffer =>
  value instanceof Uint8Array || value instanceof ArrayBuffer;

let toUint8Array = (value: Buffer | Uint8Array | ArrayBuffer) =>
  value instanceof ArrayBuffer ? new Uint8Array(value) : value;

let isReadableStream = (value: unknown): value is ReadableStream<Uint8Array> =>
  typeof ReadableStream !== 'undefined' && value instanceof ReadableStream;

let isNodeReadable = (value: unknown): value is NodeJS.ReadableStream =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as any).pipe === 'function' &&
  typeof (value as any).on === 'function';

let isResponseLike = (value: unknown): value is Response =>
  typeof Response !== 'undefined' && value instanceof Response;

interface NormalizedStreamInput {
  stream: ReadableStream<Uint8Array>;
  mimeType?: string;
  filename?: string;
}

export class SlatePublicContext<InputType extends {}> {
  #input: InputType;
  #httpTraces: SlateHttpTrace[] = [];

  #liveInvocation: SlateLiveInvocationInfo | null;
  #attachmentsDisabled = false;
  #attachments: SlateAttachment[] = [];
  #pendingUploads: Promise<void>[] = [];
  #uploadQueue = new PQueue({ concurrency: 10 });

  constructor(
    input: InputType,
    private readonly spec: SlateSpecification<any, any>,
    private readonly logger: SlateLogger,
    liveInvocation: SlateLiveInvocationInfo | null = null
  ) {
    this.#input = input;
    this.#liveInvocation = liveInvocation;
  }

  get specification() {
    return this.spec;
  }

  get input() {
    return Object.freeze(this.#input);
  }

  get event() {
    return Object.freeze(this.#input);
  }

  get state() {
    return Object.freeze((this.#input as any).state) as 'state' extends keyof InputType
      ? InputType['state']
      : never;
  }

  get request() {
    return Object.freeze((this.#input as any).request) as 'request' extends keyof InputType
      ? InputType['request']
      : never;
  }

  get registrationDetails() {
    return Object.freeze(
      (this.#input as any).registrationDetails
    ) as 'registrationDetails' extends keyof InputType
      ? InputType['registrationDetails']
      : never;
  }

  recordHttpTrace(trace: SlateHttpTrace) {
    this.#httpTraces.push(trace);
  }

  getHttpTraces() {
    return this.#httpTraces.map(trace => ({
      ...trace,
      request: {
        ...trace.request,
        ...(trace.request.headers ? { headers: { ...trace.request.headers } } : {}),
        ...(trace.request.body ? { body: { ...trace.request.body } } : {})
      },
      ...(trace.response
        ? {
            response: {
              ...trace.response,
              ...(trace.response.headers ? { headers: { ...trace.response.headers } } : {}),
              ...(trace.response.body ? { body: { ...trace.response.body } } : {})
            }
          }
        : {}),
      ...(trace.error ? { error: { ...trace.error } } : {})
    }));
  }

  info(message: SlateLogMessageInput) {
    this.logger.info(message);
  }

  warn(message: SlateLogMessageInput) {
    this.logger.warn(message);
  }

  error(message: SlateLogMessageInput) {
    this.logger.error(message);
  }

  progress(message: SlateLogMessageInput) {
    this.logger.progress(message);
  }

  async addAttachment(
    input: SlateAddAttachmentInput,
    opts: SlateAddAttachmentOptions = {}
  ): Promise<void> {
    if (input.type === 'url') {
      this.#attachments.push(createUrlAttachment(input.url.toString(), opts.mimeType));
      return;
    }

    let content = input.content;

    if (isBufferLike(content)) {
      let bytes = toUint8Array(content);
      this.#attachments.push(
        createBase64Attachment(Buffer.from(bytes).toString('base64'), opts.mimeType)
      );
      return;
    }

    let normalized = await this.#normalizeStreamInput(content, opts);
    if (!normalized) return;

    if (!this.#liveInvocation || this.#attachmentsDisabled) {
      this.warn({
        message: 'Attachment dropped: direct upload is not available for this invocation.'
      });
      return;
    }

    let live = this.#liveInvocation;
    let task = this.#uploadQueue
      .add(() =>
        uploadAttachmentDirect({
          live,
          mimeType: normalized.mimeType,
          filename: normalized.filename,
          body: normalized.stream
        })
      )
      .then(attachment => {
        this.#attachments.push(attachment);
      })
      .catch(err => {
        // Direct upload failed or was interrupted (network error, the hub already revoked
        // the live invocation token, ...) -- we simply don't have this attachment, and stop
        // trying for the rest of this call rather than repeatedly failing the same way.
        this.#attachmentsDisabled = true;
        this.warn({
          message: `Attachment dropped: direct upload failed (${
            err instanceof Error ? err.message : String(err)
          }).`
        });
      });

    this.#pendingUploads.push(task);
  }

  async #normalizeStreamInput(
    input: ReadableStream<Uint8Array> | NodeJS.ReadableStream | Response,
    opts: SlateAddAttachmentOptions
  ): Promise<NormalizedStreamInput | null> {
    if (isResponseLike(input)) {
      if (!input.body) {
        this.warn({ message: 'Attachment dropped: response has no body.' });
        return null;
      }
      return {
        stream: input.body,
        mimeType: opts.mimeType ?? input.headers.get('content-type') ?? undefined,
        filename: opts.filename
      };
    }

    if (isReadableStream(input)) {
      return { stream: input, mimeType: opts.mimeType, filename: opts.filename };
    }

    if (isNodeReadable(input)) {
      return {
        stream: Readable.toWeb(input as any) as unknown as ReadableStream<Uint8Array>,
        mimeType: opts.mimeType,
        filename: opts.filename
      };
    }

    this.warn({ message: 'Attachment dropped: unsupported attachment input type.' });
    return null;
  }

  async _finalizeAttachments(): Promise<SlateAttachment[]> {
    await Promise.allSettled(this.#pendingUploads);
    return this.#attachments;
  }
}

export class SlateContext<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {}
> extends SlatePublicContext<InputType> {
  #config: ConfigType;
  #auth: AuthType;

  constructor(
    config: ConfigType,
    input: InputType,
    auth: AuthType,
    spec: SlateSpecification<ConfigType, AuthType>,
    logger: SlateLogger,
    liveInvocation: SlateLiveInvocationInfo | null = null
  ) {
    super(input, spec, logger, liveInvocation);
    this.#config = config;
    this.#auth = auth;
  }

  get config() {
    return Object.freeze(this.#config);
  }

  get auth() {
    return Object.freeze(this.#auth);
  }
}
