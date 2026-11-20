import type { SlateAttachment } from './attachment';

let PART_CONCURRENCY = 3;
let PART_ATTEMPTS = 3;
let PART_RETRY_DELAY_MS = 500;
let MAX_PARTS_PER_SIGNING = 8;
// A stream of unknown size is read into memory before it can be registered.
let MAX_BUFFERED_SIZE_BYTES = 100 * 1024 * 1024;

export interface SlateLiveInvocationInfo {
  token: string;
  baseUrl: string;
  maxAttachmentSizeBytes: number;
}

export interface SlateDirectUploadInput {
  live: SlateLiveInvocationInfo;
  mimeType?: string;
  filename?: string;
  body: ReadableStream<Uint8Array> | Uint8Array;
  // Lets a stream upload part by part instead of being buffered first; it must be exact.
  sizeBytes?: number;
}

interface SignedPart {
  number: number;
  url: string;
  method?: string;
  headers?: Record<string, string>;
}

type UploadRegistration =
  | {
      referenceId: string;
      uploadMethod?: 'PUT';
      uploadUrl: string;
      uploadHeaders?: Record<string, string>;
    }
  | {
      referenceId: string;
      uploadMethod: 'MULTIPART';
      partSizeBytes: number;
      partCount: number;
      parts: SignedPart[];
    };

let sizeError = (maxSizeBytes: number) =>
  new Error(`Attachment exceeds the maximum size of ${maxSizeBytes} bytes`);

let delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let concat = (chunks: Uint8Array[], sizeBytes: number) => {
  let out = new Uint8Array(new ArrayBuffer(sizeBytes));
  let offset = 0;
  for (let chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
};

let bufferAttachmentBody = async (
  body: ReadableStream<Uint8Array>,
  maxSizeBytes: number
): Promise<Uint8Array<ArrayBuffer>> => {
  let reader = body.getReader();
  let chunks: Uint8Array[] = [];
  let sizeBytes = 0;

  while (true) {
    let { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    sizeBytes += value.byteLength;
    if (sizeBytes > maxSizeBytes) {
      await reader.cancel();
      throw sizeError(maxSizeBytes);
    }
    chunks.push(value);
  }

  return concat(chunks, sizeBytes);
};

// Hands out the body in exact slices, so a stream is held in memory only one part at a time.
class ExactByteReader {
  #reader: ReadableStreamDefaultReader<Uint8Array> | null;
  #buffered: Uint8Array | null;
  #offset = 0;

  constructor(body: ReadableStream<Uint8Array> | Uint8Array) {
    this.#reader = body instanceof Uint8Array ? null : body.getReader();
    this.#buffered = body instanceof Uint8Array ? body : null;
  }

  async read(sizeBytes: number) {
    let chunks: Uint8Array[] = [];
    let collected = 0;

    while (collected < sizeBytes) {
      if (!this.#buffered || this.#offset >= this.#buffered.byteLength) {
        let next = this.#reader ? await this.#reader.read() : { done: true as const };
        if (next.done) throw new Error('Attachment ended before its declared size');

        this.#buffered = next.value;
        this.#offset = 0;
        continue;
      }

      let take = Math.min(sizeBytes - collected, this.#buffered.byteLength - this.#offset);
      chunks.push(this.#buffered.subarray(this.#offset, this.#offset + take));
      this.#offset += take;
      collected += take;
    }

    return concat(chunks, sizeBytes);
  }

  async expectEnd() {
    if (this.#buffered && this.#offset < this.#buffered.byteLength) {
      throw new Error('Attachment is larger than its declared size');
    }

    while (this.#reader) {
      let next = await this.#reader.read();
      if (next.done) return;
      if (next.value?.byteLength)
        throw new Error('Attachment is larger than its declared size');
    }
  }

  async cancel() {
    await this.#reader?.cancel().catch(() => {});
  }
}

let createLiveClient = (live: SlateLiveInvocationInfo) => {
  let baseUrl = `${live.baseUrl.replace(/\/$/, '')}/slates-hub/live-invocation/attachments`;

  let call = async <T>(path: string, method: string, body?: unknown): Promise<T> => {
    let res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${live.token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(
        `Live invocation API ${method} ${path || '/'} failed (status ${res.status})`
      );
    }

    return (res.status === 204 ? undefined : await res.json()) as T;
  };

  return {
    register: async (attachment: {
      mimeType?: string;
      filename?: string;
      sizeBytes: number;
    }) => {
      let { attachments } = await call<{ attachments: UploadRegistration[] }>('', 'POST', {
        attachments: [attachment]
      });
      if (!attachments[0]) {
        throw new Error('Live invocation API returned no attachment registrations');
      }
      return attachments[0];
    },

    signParts: async (referenceId: string, numbers: number[]) =>
      (await call<{ parts: SignedPart[] }>(`/${referenceId}/parts`, 'POST', { numbers }))
        .parts,

    complete: (referenceId: string, receipts: string[]) =>
      call(`/${referenceId}/complete`, 'POST', { receipts }),

    discard: (referenceId: string) => call(`/${referenceId}`, 'DELETE')
  };
};

type LiveClient = ReturnType<typeof createLiveClient>;

let uploadSingle = async (
  registration: Extract<UploadRegistration, { uploadUrl: string }>,
  data: Uint8Array<ArrayBuffer>,
  mimeType: string | undefined
) => {
  let res = await fetch(registration.uploadUrl, {
    method: 'PUT',
    headers: {
      ...registration.uploadHeaders,
      ...(mimeType ? { 'content-type': mimeType } : {}),
      'content-length': String(data.byteLength)
    },
    body: data
  });
  if (!res.ok) {
    throw new Error(`Failed to upload attachment content (status ${res.status})`);
  }
};

let uploadParts = async (
  client: LiveClient,
  registration: Extract<UploadRegistration, { uploadMethod: 'MULTIPART' }>,
  reader: ExactByteReader,
  sizeBytes: number
) => {
  let { referenceId, partSizeBytes, partCount } = registration;
  let signed = new Map(registration.parts.map(part => [part.number, part]));
  let receipts: string[] = new Array(partCount);

  let signedPart = async (number: number, fresh: boolean) => {
    if (fresh || !signed.has(number)) {
      let last = fresh ? number : Math.min(number + MAX_PARTS_PER_SIGNING - 1, partCount);
      let numbers = Array.from({ length: last - number + 1 }, (_, i) => number + i);
      for (let part of await client.signParts(referenceId, numbers)) {
        signed.set(part.number, part);
      }
    }

    let part = signed.get(number);
    if (!part) throw new Error(`Live invocation API did not sign part ${number}`);
    return part;
  };

  let uploadPart = async (number: number, data: Uint8Array<ArrayBuffer>) => {
    let lastError: unknown;

    for (let attempt = 0; attempt < PART_ATTEMPTS; attempt++) {
      if (attempt > 0) await delay(PART_RETRY_DELAY_MS * attempt);

      try {
        let part = await signedPart(number, attempt > 0);
        let res = await fetch(part.url, {
          method: part.method ?? 'PUT',
          headers: { ...part.headers, 'content-length': String(data.byteLength) },
          body: data
        });
        if (!res.ok) throw new Error(`Failed to upload part ${number} (status ${res.status})`);

        let { receipt } = (await res.json()) as { receipt?: string };
        if (!receipt) throw new Error(`Object storage returned no receipt for part ${number}`);

        receipts[number - 1] = receipt;
        return;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError;
  };

  let inFlight = new Set<Promise<void>>();
  for (let number = 1; number <= partCount; number++) {
    let data = await reader.read(
      Math.min(partSizeBytes, sizeBytes - (number - 1) * partSizeBytes)
    );

    let task: Promise<void> = uploadPart(number, data).finally(() => inFlight.delete(task));
    inFlight.add(task);
    if (inFlight.size >= PART_CONCURRENCY) await Promise.race(inFlight);
  }
  await Promise.all(inFlight);

  await reader.expectEnd();
  await client.complete(referenceId, receipts);
};

export let uploadAttachmentDirect = async (
  d: SlateDirectUploadInput
): Promise<SlateAttachment> => {
  let maxSizeBytes = d.live.maxAttachmentSizeBytes;

  let body =
    d.body instanceof Uint8Array || d.sizeBytes !== undefined
      ? d.body
      : await bufferAttachmentBody(d.body, Math.min(maxSizeBytes, MAX_BUFFERED_SIZE_BYTES));
  let sizeBytes = body instanceof Uint8Array ? body.byteLength : d.sizeBytes!;

  let reader = new ExactByteReader(body);
  if (sizeBytes > maxSizeBytes) {
    await reader.cancel();
    throw sizeError(maxSizeBytes);
  }

  if (sizeBytes === 0) {
    await reader.expectEnd();
    return {
      mimeType: d.mimeType,
      content: { type: 'content', encoding: 'base64', content: '' }
    };
  }

  let client = createLiveClient(d.live);
  let registration = await client.register({
    mimeType: d.mimeType,
    filename: d.filename,
    sizeBytes
  });

  try {
    if (registration.uploadMethod === 'MULTIPART') {
      await uploadParts(client, registration, reader, sizeBytes);
    } else {
      let data = await reader.read(sizeBytes);
      await reader.expectEnd();
      await uploadSingle(registration, data, d.mimeType);
    }
  } catch (err) {
    await reader.cancel();
    await client.discard(registration.referenceId).catch(() => {});
    throw err;
  }

  return {
    mimeType: d.mimeType,
    content: { type: 'upload_reference', referenceId: registration.referenceId }
  };
};
