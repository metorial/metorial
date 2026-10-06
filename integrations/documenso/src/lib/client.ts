import { createAxios, getBase64ByteLength, pickDefined, requestAxios } from 'slates';
import { z } from 'zod';
import {
  auditSchema,
  type Envelope,
  envelopeSchema,
  type Field,
  fieldSchema,
  folderSchema,
  pageSchema,
  recipientSchema,
  summarySchema
} from './schemas';
import {
  baseUrl,
  email,
  id,
  invalid,
  numericId,
  paging,
  parse,
  safeData,
  text,
  token,
  upstream
} from './validation';

export type ClientConfig = { token: string; baseUrl: string };
export type RecipientInput = {
  email: string;
  name?: string;
  role?: string;
  signingOrder?: number;
};
export type RecipientUpdate = Partial<RecipientInput> & { recipientId: number };
export type FieldMeta = {
  label?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  fontSize?: number;
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT';
  value?: string;
  values?: Array<{ value: string; id?: number; checked?: boolean }>;
};
export type FieldInput = {
  type: string;
  recipientId: number;
  envelopeItemId?: string;
  pageNumber: number;
  pageX: number;
  pageY: number;
  width: number;
  height: number;
  fieldMeta?: FieldMeta;
};
export type FieldUpdate = Partial<Omit<FieldInput, 'recipientId'>> & { fieldId: number };
export type EnvelopeMeta = {
  subject?: string;
  message?: string;
  signingOrder?: 'PARALLEL' | 'SEQUENTIAL';
  redirectUrl?: string;
  language?: string;
  timezone?: string;
  dateFormat?: string;
};
const languages = ['de', 'en', 'fr', 'es', 'it', 'nl', 'pl', 'pt-BR', 'ja', 'ko', 'zh'];
const dates = [
  'yyyy-MM-dd hh:mm a',
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'dd-MM-yyyy',
  'MM/dd/yyyy',
  'yy-MM-dd',
  'MMMM dd, yyyy',
  'EEEE, MMMM dd, yyyy',
  'dd/MM/yyyy hh:mm a',
  'dd/MM/yyyy HH:mm',
  'dd-MM-yyyy hh:mm a',
  'dd-MM-yyyy HH:mm',
  'MM/dd/yyyy hh:mm a',
  'MM/dd/yyyy HH:mm',
  'dd.MM.yyyy',
  'dd.MM.yyyy HH:mm',
  'yyyy-MM-dd HH:mm',
  'yy-MM-dd hh:mm a',
  'yy-MM-dd HH:mm',
  'yyyy-MM-dd HH:mm:ss',
  'MMMM dd, yyyy hh:mm a',
  'MMMM dd, yyyy HH:mm',
  'EEEE, MMMM dd, yyyy hh:mm a',
  'EEEE, MMMM dd, yyyy HH:mm',
  "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
];
const fieldTypes = [
  'FREE_SIGNATURE',
  'SIGNATURE',
  'INITIALS',
  'NAME',
  'EMAIL',
  'DATE',
  'TEXT',
  'NUMBER',
  'CHECKBOX',
  'RADIO',
  'DROPDOWN'
];
const acknowledged = z.object({ success: z.literal(true) });
const created = z.object({ id: z.string().min(1) });

export class Client {
  readonly baseUrl: string;
  private key: string;
  private axios: ReturnType<typeof createAxios>;
  constructor(config: ClientConfig) {
    this.baseUrl = baseUrl(config.baseUrl);
    this.key = token(config.token);
    this.axios = createAxios({ baseURL: this.baseUrl, timeout: 30000, maxRedirects: 0 });
  }
  private async request(
    method: 'get' | 'post',
    route: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    safeData(route, this.key);
    safeData(params, this.key);
    if (data instanceof FormData) {
      for (const v of data.values()) if (typeof v === 'string') safeData(v, this.key);
    } else safeData(data, this.key);
    const r = await requestAxios(
      'request',
      () =>
        this.axios.request<unknown>({
          method,
          url: route,
          data,
          params,
          headers: { Authorization: this.key }
        }),
      (e, op) => upstream(e, op, true)
    );
    if (r.status !== 200)
      throw invalid(
        'Documenso returned an unexpected status. Inspect the envelope and audit history before retrying.'
      );
    return safeData(r.data, this.key);
  }
  private checkedPage<T>(
    value: {
      data: T[];
      count: number;
      currentPage: number;
      perPage: number;
      totalPages: number;
    },
    requestedPage?: number
  ) {
    if (
      (requestedPage !== undefined && value.currentPage !== requestedPage) ||
      value.data.length > value.perPage ||
      value.data.length > value.count
    )
      throw invalid('Documenso returned conflicting page metadata.');
    return value;
  }
  async findEnvelopes(
    params: {
      query?: string;
      page?: number;
      perPage?: number;
      type?: 'DOCUMENT' | 'TEMPLATE';
      status?: string;
      folderId?: string;
      orderByColumn?: string;
      orderByDirection?: 'asc' | 'desc';
    } = {}
  ) {
    paging(params.page, params.perPage);
    if (params.folderId !== undefined) id(params.folderId);
    if (
      params.status !== undefined &&
      !['DRAFT', 'PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(params.status)
    )
      throw invalid(
        'Use a documented envelope status: DRAFT, PENDING, COMPLETED, REJECTED, or CANCELLED.'
      );
    if (params.orderByColumn !== undefined && params.orderByColumn !== 'createdAt')
      throw invalid('Documenso currently supports only createdAt for orderByColumn.');
    return this.checkedPage(
      parse(
        pageSchema(summarySchema),
        await this.request('get', '/envelope', undefined, pickDefined(params))
      ),
      params.page
    );
  }
  async getEnvelope(envelopeId: string) {
    id(envelopeId);
    const e = parse(envelopeSchema, await this.request('get', `/envelope/${envelopeId}`));
    if (
      e.id !== envelopeId ||
      e.recipients.some(r => r.envelopeId !== envelopeId) ||
      e.fields.some(f => f.envelopeId !== envelopeId) ||
      e.envelopeItems.some(i => i.envelopeId !== envelopeId) ||
      e.fields.some(
        f =>
          !e.recipients.some(r => r.id === f.recipientId) ||
          !e.envelopeItems.some(i => i.id === f.envelopeItemId)
      )
    )
      throw invalid('Documenso returned resources from a different envelope.');
    if (e.deletedAt)
      throw invalid('This envelope is deleted. Inspect its retained history in Documenso.');
    return e;
  }
  private draft(e: Envelope) {
    if (e.status !== 'DRAFT')
      throw invalid(
        'Recipients and fields can be changed only on a DRAFT envelope. Duplicate it to prepare a new draft.'
      );
  }
  private metadata(meta?: EnvelopeMeta) {
    if (!meta) return undefined;
    if (meta.subject !== undefined && text(meta.subject, 'Subject', true).length > 254)
      throw invalid('Subject must contain at most 254 characters.');
    if (meta.message !== undefined && text(meta.message, 'Email message', true).length > 5000)
      throw invalid('Email message must contain at most 5000 characters.');
    if (meta.language !== undefined && !languages.includes(meta.language))
      throw invalid(
        'Use a documented signing language: de, en, fr, es, it, nl, pl, pt-BR, ja, ko, or zh.'
      );
    if (meta.dateFormat !== undefined && !dates.includes(meta.dateFormat))
      throw invalid('Use a supported Documenso dateFormat from its API reference.');
    if (meta.timezone !== undefined) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: meta.timezone });
      } catch {
        throw invalid('Use a valid IANA timezone.');
      }
    }
    if (meta.redirectUrl !== undefined && meta.redirectUrl !== '') {
      let u: URL;
      try {
        u = new URL(meta.redirectUrl);
      } catch {
        throw invalid(
          'Use a complete HTTP/HTTPS redirect URL, or an empty string to clear it.'
        );
      }
      if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
        throw invalid('Use a credential-free HTTP/HTTPS redirect URL.');
    }
    return pickDefined(meta);
  }
  private recipient(r: RecipientInput, template = false) {
    email(r.email, template);
    if (r.name !== undefined && text(r.name, 'Recipient name', true).length > 255)
      throw invalid('Recipient name must contain at most 255 characters.');
    if (r.role !== undefined && !['SIGNER', 'VIEWER', 'APPROVER', 'CC'].includes(r.role))
      throw invalid('Use a supported recipient role.');
    if (
      r.signingOrder !== undefined &&
      (!Number.isSafeInteger(r.signingOrder) || r.signingOrder < 0)
    )
      throw invalid('signingOrder must be a nonnegative safe integer.');
    return pickDefined({ ...r, name: r.name ?? '', role: r.role ?? 'SIGNER' });
  }
  private title(value: string) {
    if (text(value, 'Title').length > 255)
      throw invalid('Title must contain at most 255 characters.');
    return value;
  }
  private pdfs(files?: Array<{ name: string; data: string }>) {
    const form = new FormData();
    for (const f of files ?? []) {
      text(f.name, 'PDF filename');
      if (/[\\/]/.test(f.name)) throw invalid('PDF filenames must not contain a path.');
      const raw = f.data.replace(/^data:application\/pdf;base64,/, '');
      if (
        !/^[A-Za-z0-9+/]*={0,2}$/.test(raw) ||
        raw.length % 4 !== 0 ||
        !getBase64ByteLength(raw)
      )
        throw invalid('Supply valid Base64 PDF content.');
      const bytes = Buffer.from(raw, 'base64');
      if (bytes.subarray(0, 5).toString() !== '%PDF-')
        throw invalid(
          'Only PDF files are supported; conversion and signing are not performed.'
        );
      form.append('files', new Blob([bytes], { type: 'application/pdf' }), f.name);
    }
    return form;
  }
  async createEnvelope(
    payload: {
      title: string;
      type: 'DOCUMENT' | 'TEMPLATE';
      folderId?: string;
      recipients?: RecipientInput[];
      meta?: EnvelopeMeta;
    },
    files?: Array<{ name: string; data: string }>
  ) {
    this.title(payload.title);
    if (payload.folderId !== undefined) id(payload.folderId);
    const form = this.pdfs(files);
    form.append(
      'payload',
      JSON.stringify(
        pickDefined({
          ...payload,
          recipients: payload.recipients?.map(r =>
            this.recipient(r, payload.type === 'TEMPLATE')
          ),
          meta: this.metadata(payload.meta)
        })
      )
    );
    const r = parse(created, await this.request('post', '/envelope/create', form));
    id(r.id);
    return r;
  }
  async updateEnvelope(envelopeId: string, data: { title?: string; meta?: EnvelopeMeta }) {
    id(envelopeId);
    if (data.title !== undefined) this.title(data.title);
    const meta = this.metadata(data.meta);
    if (data.title === undefined && !Object.keys(meta ?? {}).length)
      throw invalid('Provide a title or metadata property to update.');
    const r = parse(
      summarySchema,
      await this.request(
        'post',
        '/envelope/update',
        pickDefined({
          envelopeId,
          data: data.title === undefined ? undefined : { title: data.title },
          meta
        })
      )
    );
    if (r.id !== envelopeId)
      throw invalid('Documenso updated a different envelope. Inspect it before retrying.');
    return r;
  }
  async deleteEnvelope(envelopeId: string) {
    id(envelopeId);
    const e = await this.getEnvelope(envelopeId);
    if (e.status === 'COMPLETED')
      throw invalid('Completed envelopes cannot be deleted through this API.');
    return parse(acknowledged, await this.request('post', '/envelope/delete', { envelopeId }));
  }
  private async distributed(envelopeId: string, recipients?: number[]) {
    const r = parse(
      z.object({
        success: z.literal(true),
        id: z.string(),
        recipients: z.array(z.object({ id: z.number().int().positive().safe() }))
      }),
      await this.request(
        'post',
        recipients ? '/envelope/redistribute' : '/envelope/distribute',
        pickDefined({ envelopeId, recipients })
      )
    );
    if (
      r.id !== envelopeId ||
      (recipients && r.recipients.some(v => !recipients.includes(v.id)))
    )
      throw invalid(
        'Documenso returned an unbound send receipt. Inspect recipients and audit history before retrying.'
      );
    return r;
  }
  async distributeEnvelope(envelopeId: string) {
    const e = await this.getEnvelope(envelopeId);
    if (e.type !== 'DOCUMENT' || e.status !== 'DRAFT' || !e.recipients.length)
      throw invalid('Distribution requires a DRAFT document envelope with recipients.');
    return this.distributed(envelopeId);
  }
  async redistributeEnvelope(envelopeId: string, recipientIds?: number[]) {
    const e = await this.getEnvelope(envelopeId);
    if (e.type !== 'DOCUMENT' || e.status !== 'PENDING')
      throw invalid('Redistribution requires a PENDING document envelope.');
    const selected =
      recipientIds ??
      e.recipients.filter(r => r.signingStatus === 'NOT_SIGNED').map(r => r.id);
    if (!selected.length || new Set(selected).size !== selected.length)
      throw invalid('Choose distinct unsigned recipients from get_envelope.');
    selected.forEach(numericId);
    if (
      selected.some(
        v => !e.recipients.some(r => r.id === v && r.signingStatus === 'NOT_SIGNED')
      )
    )
      throw invalid(
        'Redistribution targets must belong to this envelope and remain unsigned.'
      );
    return this.distributed(envelopeId, selected);
  }
  async duplicateEnvelope(envelopeId: string) {
    await this.getEnvelope(envelopeId);
    const r = parse(
      created,
      await this.request('post', '/envelope/duplicate', { envelopeId })
    );
    id(r.id);
    if (r.id === envelopeId)
      throw invalid('Documenso did not return a distinct duplicate ID.');
    return r;
  }
  async getEnvelopeAuditLog(
    envelopeId: string,
    params: { page?: number; perPage?: number } = {}
  ) {
    id(envelopeId);
    paging(params.page, params.perPage);
    const p = this.checkedPage(
      parse(
        pageSchema(auditSchema),
        await this.request(
          'get',
          `/envelope/${envelopeId}/audit-log`,
          undefined,
          pickDefined(params)
        )
      ),
      params.page
    );
    if (p.data.some(r => r.envelopeId !== envelopeId))
      throw invalid('Documenso returned audit entries for a different envelope.');
    return p;
  }
  private recipientsBound(value: unknown, envelopeId: string, expected?: number[]) {
    const r = parse(z.object({ data: z.array(recipientSchema) }), value);
    if (
      r.data.some(v => v.envelopeId !== envelopeId) ||
      new Set(r.data.map(v => v.id)).size !== r.data.length ||
      (expected &&
        (r.data.length !== expected.length || r.data.some(v => !expected.includes(v.id))))
    )
      throw invalid(
        'Documenso returned an unbound recipient receipt. Inspect this envelope before retrying.'
      );
    return r;
  }
  async createRecipients(envelopeId: string, data: RecipientInput[]) {
    if (!data.length) throw invalid('Provide recipients to create.');
    const e = await this.getEnvelope(envelopeId);
    this.draft(e);
    const normalized = data.map(r => this.recipient(r, e.type === 'TEMPLATE'));
    const r = this.recipientsBound(
      await this.request('post', '/envelope/recipient/create-many', {
        envelopeId,
        data: normalized
      }),
      envelopeId
    );
    if (
      r.data.length !== data.length ||
      r.data.some(v => e.recipients.some(old => old.id === v.id))
    )
      throw invalid(
        'Recipient creation did not return distinct new IDs for every requested recipient.'
      );
    return r;
  }
  async updateRecipients(envelopeId: string, data: RecipientUpdate[]) {
    if (!data.length) throw invalid('Provide recipients to update.');
    const e = await this.getEnvelope(envelopeId);
    this.draft(e);
    const expected = data.map(r => numericId(r.recipientId));
    if (new Set(expected).size !== expected.length)
      throw invalid('Recipient IDs must be distinct.');
    const normalized = data.map(({ recipientId, ...r }) => {
      if (!e.recipients.some(v => v.id === recipientId))
        throw invalid('The recipient does not belong to this envelope.');
      if (!Object.keys(pickDefined(r)).length)
        throw invalid('Provide a property for each recipient update.');
      if (r.email !== undefined) email(r.email, e.type === 'TEMPLATE');
      if (r.name !== undefined && text(r.name, 'Recipient name', true).length > 255)
        throw invalid('Recipient name must contain at most 255 characters.');
      if (
        r.signingOrder !== undefined &&
        (!Number.isSafeInteger(r.signingOrder) || r.signingOrder < 0)
      )
        throw invalid('signingOrder must be a nonnegative safe integer.');
      return pickDefined({ id: recipientId, ...r });
    });
    return this.recipientsBound(
      await this.request('post', '/envelope/recipient/update-many', {
        envelopeId,
        data: normalized
      }),
      envelopeId,
      expected
    );
  }
  async deleteRecipient(envelopeId: string, recipientId: number) {
    numericId(recipientId);
    const e = await this.getEnvelope(envelopeId);
    this.draft(e);
    if (!e.recipients.some(r => r.id === recipientId))
      throw invalid('The recipient does not belong to this envelope.');
    return parse(
      acknowledged,
      await this.request('post', '/envelope/recipient/delete', { recipientId })
    );
  }
  private fieldMeta(type: string, meta?: FieldMeta, previous?: Field) {
    if (!meta) return previous?.type === type ? (previous.fieldMeta ?? undefined) : undefined;
    if (type === 'FREE_SIGNATURE')
      throw invalid(
        'FREE_SIGNATURE fields do not support fieldMeta; update coordinates only.'
      );
    const native: Record<string, unknown> = {
      ...(previous?.type === type ? (previous.fieldMeta ?? {}) : {}),
      type: type.toLowerCase()
    };
    for (const k of ['label', 'placeholder', 'required', 'readOnly', 'fontSize'] as const)
      if (meta[k] !== undefined) native[k] = meta[k];
    if (meta.fontSize !== undefined && (meta.fontSize < 8 || meta.fontSize > 96))
      throw invalid('Field fontSize must be 8–96.');
    if (meta.textAlign !== undefined) {
      if (['SIGNATURE', 'CHECKBOX', 'RADIO', 'DROPDOWN'].includes(type))
        throw invalid('textAlign is unsupported for this field type.');
      native.textAlign = meta.textAlign.toLowerCase();
    }
    if (meta.values !== undefined) {
      if (!['CHECKBOX', 'RADIO', 'DROPDOWN'].includes(type))
        throw invalid('values options apply only to choice fields.');
      if (
        type !== 'DROPDOWN' &&
        meta.values.some(
          v =>
            v.id === undefined ||
            !Number.isSafeInteger(v.id) ||
            v.id < 0 ||
            typeof v.checked !== 'boolean'
        )
      )
        throw invalid(
          'Radio and checkbox options require a nonnegative integer id and checked boolean.'
        );
      native.values = meta.values;
    }
    if (meta.value !== undefined) {
      if (type === 'TEXT') native.text = meta.value;
      else if (type === 'NUMBER') native.value = meta.value;
      else
        throw invalid(
          'Legacy fieldMeta.value is supported only for TEXT and NUMBER. Configure choice options through fieldMeta.values; recipient signatures cannot be prefilled.'
        );
    }
    return native;
  }
  private fieldInput(f: FieldInput | FieldUpdate, e: Envelope, previous?: Field) {
    const type = f.type ?? previous?.type;
    if (!type || !fieldTypes.includes(type)) throw invalid('Use a supported field type.');
    const mapped = pickDefined({
      type,
      fieldMeta: this.fieldMeta(type, f.fieldMeta, previous),
      page: f.pageNumber,
      positionX: f.pageX,
      positionY: f.pageY,
      width: f.width,
      height: f.height
    });
    if (
      f.pageNumber !== undefined &&
      (!Number.isSafeInteger(f.pageNumber) || f.pageNumber < 1)
    )
      throw invalid('pageNumber must be a positive safe integer.');
    for (const n of [f.pageX, f.pageY, f.width, f.height])
      if (n !== undefined && (!Number.isFinite(n) || n < 0 || n > 100))
        throw invalid('Field coordinates and dimensions are percentages from 0 to 100.');
    if (!previous) {
      if (!('recipientId' in f)) throw invalid('A new field needs recipientId.');
      numericId(f.recipientId);
      if (!e.recipients.some(r => r.id === f.recipientId))
        throw invalid('The field recipient does not belong to this envelope.');
      let item = f.envelopeItemId;
      if (item === undefined) {
        if (e.envelopeItems.length !== 1)
          throw invalid(
            'Select envelopeItemId from get_envelope when the envelope contains zero or multiple PDFs.'
          );
        item = e.envelopeItems[0]?.id;
      }
      if (!e.envelopeItems.some(i => i.id === item))
        throw invalid('The PDF item does not belong to this envelope.');
      return { ...mapped, recipientId: f.recipientId, envelopeItemId: item };
    }
    return { id: previous.id, ...mapped };
  }
  private fieldsBound(value: unknown, envelopeId: string, expected?: number[]) {
    const r = parse(z.object({ data: z.array(fieldSchema) }), value);
    if (
      r.data.some(v => v.envelopeId !== envelopeId) ||
      new Set(r.data.map(v => v.id)).size !== r.data.length ||
      (expected &&
        (r.data.length !== expected.length || r.data.some(v => !expected.includes(v.id))))
    )
      throw invalid(
        'Documenso returned an unbound field receipt. Inspect the envelope before retrying.'
      );
    return r;
  }
  async createFields(envelopeId: string, data: FieldInput[]) {
    if (!data.length) throw invalid('Provide fields to create.');
    const e = await this.getEnvelope(envelopeId);
    this.draft(e);
    const r = this.fieldsBound(
      await this.request('post', '/envelope/field/create-many', {
        envelopeId,
        data: data.map(f => this.fieldInput(f, e))
      }),
      envelopeId
    );
    if (
      r.data.length !== data.length ||
      r.data.some(v => e.fields.some(old => old.id === v.id))
    )
      throw invalid(
        'Field creation did not return distinct new IDs for every requested field.'
      );
    return r;
  }
  async updateFields(envelopeId: string, data: FieldUpdate[]) {
    if (!data.length) throw invalid('Provide fields to update.');
    const e = await this.getEnvelope(envelopeId);
    this.draft(e);
    const expected = data.map(f => numericId(f.fieldId));
    if (new Set(expected).size !== expected.length)
      throw invalid('Field IDs must be distinct.');
    const mapped = data.map(f => {
      const previous = e.fields.find(v => v.id === f.fieldId);
      if (!previous) throw invalid('The field does not belong to this envelope.');
      if (!Object.keys(pickDefined({ ...f, fieldId: undefined })).length)
        throw invalid('Provide a property for each field update.');
      return this.fieldInput(f, e, previous);
    });
    return this.fieldsBound(
      await this.request('post', '/envelope/field/update-many', { envelopeId, data: mapped }),
      envelopeId,
      expected
    );
  }
  async deleteField(envelopeId: string, fieldId: number) {
    numericId(fieldId);
    const e = await this.getEnvelope(envelopeId);
    this.draft(e);
    if (!e.fields.some(f => f.id === fieldId))
      throw invalid('The field does not belong to this envelope.');
    return parse(
      acknowledged,
      await this.request('post', '/envelope/field/delete', { fieldId })
    );
  }
  async useTemplate(
    templateId: string,
    data: {
      recipients?: Array<{ recipientId: number; email?: string; name?: string }>;
      prefillFields?: Array<{ fieldId: number; value: string }>;
    }
  ) {
    const e = await this.getEnvelope(templateId);
    if (e.type !== 'TEMPLATE') throw invalid('templateId must reference a TEMPLATE envelope.');
    const recipients = data.recipients?.map(({ recipientId, ...r }) => {
      numericId(recipientId);
      const original = e.recipients.find(v => v.id === recipientId);
      if (!original) throw invalid('The override recipient does not belong to this template.');
      return pickDefined({
        id: recipientId,
        email: email(r.email ?? original.email),
        name: r.name
      });
    });
    if (recipients && new Set(recipients.map(r => r.id)).size !== recipients.length)
      throw invalid('Override recipient IDs must be distinct.');
    const prefillFields = data.prefillFields?.map(f => {
      numericId(f.fieldId);
      const original = e.fields.find(v => v.id === f.fieldId);
      if (
        !original ||
        !['TEXT', 'NUMBER', 'DATE', 'RADIO', 'CHECKBOX', 'DROPDOWN'].includes(original.type)
      )
        throw invalid(
          'Prefill only a supported existing template field; signatures and identity fields cannot be signed on a recipient’s behalf.'
        );
      return {
        id: f.fieldId,
        type: original.type.toLowerCase(),
        value: original.type === 'CHECKBOX' ? [f.value] : f.value
      };
    });
    if (prefillFields && new Set(prefillFields.map(f => f.id)).size !== prefillFields.length)
      throw invalid('Prefill field IDs must be distinct.');
    const form = new FormData();
    form.append(
      'payload',
      JSON.stringify(
        pickDefined({
          envelopeId: templateId,
          recipients,
          prefillFields,
          distributeDocument: false
        })
      )
    );
    const r = parse(created, await this.request('post', '/envelope/use', form));
    id(r.id);
    if (r.id === templateId)
      throw invalid('Documenso did not return a distinct new envelope ID.');
    return r;
  }
  async findFolders(
    params: { query?: string; page?: number; perPage?: number; parentFolderId?: string } = {}
  ) {
    paging(params.page, params.perPage);
    if (params.parentFolderId !== undefined) id(params.parentFolderId);
    return this.checkedPage(
      parse(
        pageSchema(folderSchema),
        await this.request(
          'get',
          '/folder',
          undefined,
          pickDefined({
            query: params.query,
            page: params.page,
            perPage: params.perPage,
            parentId: params.parentFolderId
          })
        )
      ),
      params.page
    );
  }
  private folderName(name: string) {
    if (text(name, 'Folder name').length < 2 || name.length > 100)
      throw invalid('Folder name must contain 2–100 characters.');
  }
  async createFolder(data: { name: string; parentFolderId?: string }) {
    this.folderName(data.name);
    if (data.parentFolderId !== undefined) id(data.parentFolderId);
    const r = parse(
      folderSchema,
      await this.request(
        'post',
        '/folder/create',
        pickDefined({ name: data.name, parentId: data.parentFolderId })
      )
    );
    id(r.id);
    if (r.name !== data.name || r.parentId !== (data.parentFolderId ?? null))
      throw invalid('Documenso returned a different folder than requested.');
    return r;
  }
  async updateFolder(folderId: string, data: { name?: string }) {
    id(folderId);
    if (data.name === undefined) throw invalid('Provide a name to update.');
    this.folderName(data.name);
    const r = parse(
      folderSchema,
      await this.request('post', '/folder/update', { folderId, data })
    );
    if (r.id !== folderId || r.name !== data.name)
      throw invalid('Documenso returned a different folder update.');
    return r;
  }
  async deleteFolder(folderId: string) {
    id(folderId);
    return parse(acknowledged, await this.request('post', '/folder/delete', { folderId }));
  }
}
