import { z } from 'zod';
import { exactId, inconsistent, invalid, parse, validText } from './contracts';
import { type ApiConfiguration, PrismicTransport } from './transport';
export interface MigrationApiConfig extends ApiConfiguration {
  migrationToken: string;
}
export interface MigrationDocument {
  title: string;
  type: string;
  uid?: string;
  lang?: string;
  tags?: string[];
  alternate_language_id?: string;
  data: Record<string, unknown>;
}
const receiptSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    type: z.string(),
    lang: z.string(),
    uid: z.string().nullable().optional()
  })
  .passthrough();
export type MigrationDocumentResponse = z.infer<typeof receiptSchema>;
export class MigrationApiClient {
  private readonly transport: PrismicTransport;
  constructor(config: MigrationApiConfig) {
    this.transport = new PrismicTransport(
      config,
      'https://migration.prismic.io',
      config.migrationToken
    );
  }
  async createDocument(document: MigrationDocument): Promise<MigrationDocumentResponse> {
    this.transport.check(document);
    validText(document.title, 'document title');
    exactId(document.type);
    if (!document.lang) invalid('Provide the document language from Get Repository Info.');
    validText(document.lang, 'language');
    if (document.uid !== undefined) validText(document.uid, 'UID');
    if (document.alternate_language_id !== undefined) exactId(document.alternate_language_id);
    const response = await this.transport.request('POST', '/documents', {
      data: document,
      headers: { 'Content-Type': 'application/json' }
    });
    this.transport.check(response.data);
    const receipt = parse(receiptSchema, response.data);
    if (
      receipt.title !== document.title ||
      receipt.type !== document.type ||
      receipt.lang !== document.lang ||
      (document.uid !== undefined && receipt.uid !== document.uid)
    )
      inconsistent();
    return receipt;
  }
  async updateDocument(
    documentId: string,
    document: MigrationDocument
  ): Promise<MigrationDocumentResponse> {
    exactId(documentId);
    this.transport.check(document);
    validText(document.title, 'document title');
    // PUT replaces data. Omitted tags are cleared by the provider; never silently
    // accept that destructive omission through this optional legacy field.
    if (document.tags === undefined)
      invalid(
        'Provide tags explicitly, including an empty array to clear them. Migration updates replace all data and tags.'
      );
    if (document.alternate_language_id !== undefined)
      invalid(
        'The Migration API cannot change alternateLanguageDocumentId on an existing document.'
      );
    const response = await this.transport.request(
      'PUT',
      `/documents/${encodeURIComponent(documentId)}`,
      {
        data: {
          title: document.title,
          uid: document.uid,
          tags: document.tags,
          data: document.data
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    this.transport.check(response.data);
    const receipt = parse(receiptSchema, response.data);
    if (
      receipt.id !== documentId ||
      receipt.type !== document.type ||
      (document.lang !== undefined && receipt.lang !== document.lang) ||
      receipt.title !== document.title ||
      (document.uid !== undefined && receipt.uid !== document.uid)
    )
      inconsistent();
    return receipt;
  }
}
