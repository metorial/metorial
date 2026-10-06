import { TextDecoder } from 'node:util';
import { createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';
import { gmailError } from './errors';
import {
  buildMimeMessage,
  decodeBase64Url,
  encodeBase64Url,
  type MimeFile,
  type MimeInput,
  validateComposeInput
} from './mime';

const gmailAxios = createAxios({
  baseURL: 'https://gmail.googleapis.com/gmail/v1',
  timeout: 30000,
  maxRedirects: 0,
  maxContentLength: 50 * 1024 * 1024
});
const id = z.string().min(1);
const bodySchema = z.object({
  attachmentId: id.optional(),
  size: z.number().int().nonnegative().optional(),
  data: z.string().optional()
});
export interface MessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: z.infer<typeof bodySchema>;
  parts?: MessagePart[];
}
const partSchema: z.ZodType<MessagePart> = z.lazy(() =>
  z.object({
    partId: z.string().optional(),
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    body: bodySchema.optional(),
    parts: z.array(partSchema).optional()
  })
);
const messageSchema = z.object({
  id,
  threadId: id,
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  historyId: z.string().optional(),
  internalDate: z.string().optional(),
  payload: partSchema.optional(),
  sizeEstimate: z.number().int().nonnegative().optional(),
  raw: z.string().optional()
});
const threadSchema = z.object({
  id,
  historyId: z.string().optional(),
  snippet: z.string().optional(),
  messages: z.array(messageSchema).optional()
});
const draftSchema = z.object({ id, message: messageSchema });
const profileSchema = z.object({
  emailAddress: z.string().email(),
  messagesTotal: z.number().int().nonnegative(),
  threadsTotal: z.number().int().nonnegative(),
  historyId: id
});
const threadsSchema = z.object({
  threads: z
    .array(z.object({ id, snippet: z.string().optional(), historyId: z.string().optional() }))
    .optional(),
  nextPageToken: id.optional(),
  resultSizeEstimate: z.number().int().nonnegative().optional()
});
const draftsSchema = z.object({
  drafts: z.array(draftSchema).optional(),
  nextPageToken: id.optional(),
  resultSizeEstimate: z.number().int().nonnegative().optional()
});
export type GmailMessage = z.infer<typeof messageSchema>;
export type GmailThread = z.infer<typeof threadSchema>;
export type GmailDraft = z.infer<typeof draftSchema>;
export const requireIdentifier = (value: string | undefined, name: string): string => {
  if (
    !value ||
    value.trim() !== value ||
    !value.isWellFormed() ||
    [...value].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127) ||
    /[/?#]/.test(value)
  )
    throw createApiServiceError(`${name} is required and must be a valid Gmail identifier.`);
  return value;
};
const pageQuery = (params: { maxResults?: number; pageToken?: string; query?: string }) => {
  const maxResults = params.maxResults ?? 20;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 500)
    throw createApiServiceError('maxResults must be an integer between 1 and 500.');
  if (params.pageToken !== undefined && !params.pageToken.trim())
    throw createApiServiceError('pageToken must not be empty.');
  const query = new URLSearchParams({ maxResults: String(maxResults) });
  if (params.pageToken) query.set('pageToken', params.pageToken);
  if (params.query !== undefined) query.set('q', params.query);
  return query;
};
export class Client {
  private readonly token: string;
  private readonly path: string;
  constructor(config: { token: string; userId: string }) {
    if (
      !config.token ||
      [...config.token].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)
    )
      throw createApiServiceError('Reconnect Google with a valid access token.');
    this.token = config.token;
    this.path = `/users/${encodeURIComponent(requireIdentifier(config.userId, 'userId'))}`;
  }
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    schema: z.ZodType<T>,
    query?: URLSearchParams,
    data?: unknown
  ): Promise<T> {
    try {
      const response = await gmailAxios.request({
        method,
        url: `${this.path}${path}${query ? `?${query.toString()}` : ''}`,
        headers: { Authorization: `Bearer ${this.token}` },
        data
      });
      const parsed = schema.safeParse(response.data);
      if (!parsed.success)
        throw createApiServiceError(
          'Gmail returned an unexpected response. Message and transport details are omitted.',
          { reason: 'gmail_invalid_response' }
        );
      return parsed.data;
    } catch (error) {
      throw gmailError(error, method === 'GET' ? 'read' : 'mailbox operation');
    }
  }
  getProfile() {
    return this.request('GET', '/profile', profileSchema);
  }
  getMessage(messageId: string, format: 'full' | 'metadata' | 'minimal' | 'raw' = 'full') {
    return this.request(
      'GET',
      `/messages/${encodeURIComponent(requireIdentifier(messageId, 'messageId'))}`,
      messageSchema,
      new URLSearchParams({ format })
    );
  }
  async listThreads(params: {
    query?: string;
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
    includeSpamTrash?: boolean;
  }) {
    const query = pageQuery(params);
    for (const label of params.labelIds ?? [])
      query.append('labelIds', requireIdentifier(label, 'labelIds'));
    if (params.includeSpamTrash !== undefined)
      query.set('includeSpamTrash', String(params.includeSpamTrash));
    const result = await this.request('GET', '/threads', threadsSchema, query);
    return { ...result, threads: result.threads ?? [] };
  }
  getThread(threadId: string, format: 'full' | 'metadata' | 'minimal' = 'full') {
    return this.request(
      'GET',
      `/threads/${encodeURIComponent(requireIdentifier(threadId, 'threadId'))}`,
      threadSchema,
      new URLSearchParams({ format })
    );
  }
  modifyThread(threadId: string, addLabelIds: string[] = [], removeLabelIds: string[] = []) {
    for (const labels of [addLabelIds, removeLabelIds]) {
      if (labels.length > 100)
        throw createApiServiceError('A label update may contain at most 100 label IDs.');
      for (const label of labels) requireIdentifier(label, 'labelIds');
    }
    return this.request(
      'POST',
      `/threads/${encodeURIComponent(requireIdentifier(threadId, 'threadId'))}/modify`,
      threadSchema,
      undefined,
      { addLabelIds, removeLabelIds }
    );
  }
  trashThread(threadId: string) {
    return this.request(
      'POST',
      `/threads/${encodeURIComponent(requireIdentifier(threadId, 'threadId'))}/trash`,
      threadSchema,
      undefined,
      {}
    );
  }
  untrashThread(threadId: string) {
    return this.request(
      'POST',
      `/threads/${encodeURIComponent(requireIdentifier(threadId, 'threadId'))}/untrash`,
      threadSchema,
      undefined,
      {}
    );
  }
  async deleteThread(threadId: string) {
    await this.request(
      'DELETE',
      `/threads/${encodeURIComponent(requireIdentifier(threadId, 'threadId'))}`,
      z.unknown()
    );
  }
  async listDrafts(params: { maxResults?: number; pageToken?: string; query?: string }) {
    const result = await this.request('GET', '/drafts', draftsSchema, pageQuery(params));
    return { ...result, drafts: result.drafts ?? [] };
  }
  getDraft(draftId: string, format: 'full' | 'raw' = 'full') {
    return this.request(
      'GET',
      `/drafts/${encodeURIComponent(requireIdentifier(draftId, 'draftId'))}`,
      draftSchema,
      new URLSearchParams({ format })
    );
  }
  private async compose(params: MimeInput) {
    validateComposeInput(params);
    const profile = params.from ? undefined : await this.getProfile();
    return encodeBase64Url(
      buildMimeMessage({ ...params, from: params.from ?? profile?.emailAddress })
    );
  }
  async sendMessage(params: MimeInput) {
    const threadId = requireIdentifier(params.threadId, 'threadId');
    return this.request('POST', '/messages/send', messageSchema, undefined, {
      raw: await this.compose(params),
      threadId
    });
  }
  async createDraft(params: MimeInput) {
    const threadId = requireIdentifier(params.threadId, 'threadId');
    return this.request('POST', '/drafts', draftSchema, undefined, {
      message: { raw: await this.compose(params), threadId }
    });
  }
  async updateDraft(draftId: string, params: MimeInput) {
    return this.updateDraftRaw(draftId, params.threadId, await this.compose(params));
  }
  updateDraftRaw(draftId: string, threadId: string | undefined, raw: string) {
    return this.request(
      'PUT',
      `/drafts/${encodeURIComponent(requireIdentifier(draftId, 'draftId'))}`,
      draftSchema,
      undefined,
      { message: { raw, threadId: requireIdentifier(threadId, 'threadId') } }
    );
  }
  sendDraft(draftId: string) {
    return this.request('POST', '/drafts/send', messageSchema, undefined, {
      id: requireIdentifier(draftId, 'draftId')
    });
  }
  async deleteDraft(draftId: string) {
    await this.request(
      'DELETE',
      `/drafts/${encodeURIComponent(requireIdentifier(draftId, 'draftId'))}`,
      z.unknown()
    );
  }
  getAttachment(messageId: string, attachmentId: string) {
    return this.request(
      'GET',
      `/messages/${encodeURIComponent(requireIdentifier(messageId, 'messageId'))}/attachments/${encodeURIComponent(requireIdentifier(attachmentId, 'attachmentId'))}`,
      bodySchema
    );
  }
  async partBytes(messageId: string, part: MessagePart): Promise<Buffer> {
    const body = part.body?.attachmentId
      ? await this.getAttachment(messageId, part.body.attachmentId)
      : part.body;
    if (body?.data === undefined)
      throw createApiServiceError('Gmail did not return the file data.');
    const bytes = decodeBase64Url(body.data);
    if (body.size !== undefined && bytes.length !== body.size)
      throw createApiServiceError('Gmail file data did not match its reported byte length.');
    return bytes;
  }
  async draftFiles(message: GmailMessage): Promise<MimeFile[]> {
    const files: MimeFile[] = [];
    for (const part of leafParts(message.payload)) {
      const contentId = part.headers?.find(h => h.name.toLowerCase() === 'content-id')?.value;
      const disposition = part.headers?.find(
        h => h.name.toLowerCase() === 'content-disposition'
      )?.value;
      if (part.filename || contentId || /^(attachment|inline)\b/i.test(disposition ?? '')) {
        if (!part.mimeType)
          throw createApiServiceError('The existing draft has a file without a MIME type.');
        files.push({
          filename: part.filename ?? '',
          mimeType: part.mimeType,
          content: (await this.partBytes(message.id, part)).toString('base64'),
          disposition:
            contentId || /^inline\b/i.test(disposition ?? '') ? 'inline' : 'attachment',
          contentId
        });
      } else if (part.mimeType !== 'text/plain' && part.mimeType !== 'text/html') {
        throw createApiServiceError(
          'This draft contains a complex MIME part. Omit body to preserve it, or edit it in Gmail.'
        );
      }
    }
    return files;
  }
}
export const leafParts = (part?: MessagePart): MessagePart[] =>
  part?.parts?.length ? part.parts.flatMap(leafParts) : part ? [part] : [];
const decodeText = (bytes: Buffer, charset = 'utf-8') => {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    throw createApiServiceError('A message uses an unsupported text character set.');
  }
};
const decodeHeader = (value: string) =>
  value
    .replace(/(\?=)\s+(?==\?)/g, '$1')
    .replace(
      /=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,
      (_all, charset: string, encoding: string, encoded: string) => {
        const bytes =
          encoding.toLowerCase() === 'b'
            ? Buffer.from(encoded, 'base64')
            : Buffer.from(
                encoded
                  .replace(/_/g, ' ')
                  .replace(/=([\da-f]{2})/gi, (_match, hex: string) =>
                    String.fromCharCode(Number.parseInt(hex, 16))
                  ),
                'latin1'
              );
        return decodeText(bytes, charset);
      }
    );
export const extractHeader = (message: GmailMessage, name: string) => {
  const value = message.payload?.headers?.find(
    h => h.name.toLowerCase() === name.toLowerCase()
  )?.value;
  return value === undefined ? undefined : decodeHeader(value.replace(/\r?\n[ \t]+/g, ' '));
};
export const extractBody = (payload?: MessagePart) => {
  const result: { text?: string; html?: string } = {};
  for (const part of leafParts(payload)) {
    if (part.filename || part.body?.data === undefined) continue;
    if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
      const contentType = part.headers?.find(
        h => h.name.toLowerCase() === 'content-type'
      )?.value;
      const charset = /charset\s*=\s*["']?([^\s;"']+)/i.exec(contentType ?? '')?.[1];
      const value = decodeText(decodeBase64Url(part.body.data), charset);
      if (part.mimeType === 'text/plain' && result.text === undefined) result.text = value;
      if (part.mimeType === 'text/html' && result.html === undefined) result.html = value;
    }
  }
  return result;
};
export const extractAttachments = (payload?: MessagePart) =>
  leafParts(payload)
    .filter(part => !!part.filename)
    .map(part => ({
      attachmentId: part.body?.attachmentId,
      partId: part.partId,
      filename: part.filename ?? '',
      mimeType: part.mimeType,
      size: part.body?.size
    }));
export const parseMessage = (message: GmailMessage) => {
  const body = extractBody(message.payload);
  return {
    messageId: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds ?? [],
    snippet: message.snippet,
    historyId: message.historyId,
    internalDate: message.internalDate,
    sizeEstimate: message.sizeEstimate,
    from: extractHeader(message, 'From'),
    to: extractHeader(message, 'To'),
    cc: extractHeader(message, 'Cc'),
    bcc: extractHeader(message, 'Bcc'),
    subject: extractHeader(message, 'Subject'),
    date: extractHeader(message, 'Date'),
    mimeMessageId: extractHeader(message, 'Message-ID'),
    replyTo: extractHeader(message, 'Reply-To'),
    inReplyTo: extractHeader(message, 'In-Reply-To'),
    references: extractHeader(message, 'References'),
    bodyText: body.text,
    bodyHtml: body.html,
    attachments: extractAttachments(message.payload)
  };
};
export type ParsedMessage = ReturnType<typeof parseMessage>;
