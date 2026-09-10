import { createApiServiceError, createTextAttachment, type SlateAttachment } from 'slates';
import { z } from 'zod';
import { MAX_FILE_BYTES } from './constants';
import { parseResponse } from './response';
import { annualStatementSchema, type fileSchema } from './schemas';

export function statementFiles(value: unknown, html: boolean, entityId: string) {
  let documents = value == null ? [] : parseResponse(z.array(annualStatementSchema), value);
  let files: z.infer<typeof fileSchema>[] = [];
  let attachments: SlateAttachment[] = [];
  let bytes = 0;
  for (let [index, document] of documents.entries()) {
    let text = html ? document.document_html : document.document_md;
    let byteSize = text ? Buffer.byteLength(text) : 0;
    bytes += byteSize;
    if (bytes > MAX_FILE_BYTES)
      throw createApiServiceError('The annual statements exceed the 50 MiB download limit.');
    let mimeType = html ? 'text/html' : 'text/markdown';
    files.push({
      fileName: `${entityId.replace(/[^a-zA-Z0-9_-]/g, '_')}-${document.year ?? 'statement'}-${index + 1}.${html ? 'html' : 'md'}`,
      mimeType,
      byteSize,
      year: document.year,
      document_type: document.document_type,
      document_date: document.document_date,
      document_title: document.document_title,
      language: document.language
    });
    if (text) attachments.push(createTextAttachment(text, mimeType));
  }
  return { files, attachments };
}

const websitePageSchema = z.object({
  url: z.string().optional(),
  content: z.string().optional()
});
const websiteContentSchema = z
  .union([z.string(), websitePageSchema, z.array(websitePageSchema)])
  .nullish();

export function websiteFiles(value: unknown, entityId: string) {
  let data = parseResponse(websiteContentSchema, value);
  let pages =
    typeof data === 'string'
      ? [{ content: data }]
      : data == null
        ? []
        : Array.isArray(data)
          ? data
          : [data];
  let files: z.infer<typeof fileSchema>[] = [];
  let attachments: SlateAttachment[] = [];
  let totalBytes = 0;
  for (let [index, page] of pages.entries()) {
    let byteSize = page.content ? Buffer.byteLength(page.content) : 0;
    totalBytes += byteSize;
    if (totalBytes > MAX_FILE_BYTES)
      throw createApiServiceError('The website content exceeds the 50 MiB download limit.');
    files.push({
      fileName: `${entityId.replace(/[^a-zA-Z0-9_-]/g, '_')}-website-${index + 1}.md`,
      mimeType: 'text/markdown',
      byteSize,
      sourceUrl: page.url
    });
    if (page.content) attachments.push(createTextAttachment(page.content, 'text/markdown'));
  }
  return { files, attachments };
}
