import { createBase64Attachment, getBase64ByteLength } from 'slates';
import { z } from 'zod';

export type Pdf4meFileResult = {
  fileContent: string;
  fileName: string;
};

export type Pdf4meStreamDocument = {
  fileName: string;
  streamFile: string;
};

export let fileAttachmentOutputSchema = z.object({
  fileName: z.string().describe('Output file name'),
  mimeType: z.string().describe('MIME type of the returned attachment'),
  byteLength: z.number().describe('Decoded byte length of the returned attachment'),
  attachmentCount: z.number().describe('Number of attachments returned')
});

export let attachmentMetadataSchema = z.object({
  fileName: z.string().describe('Attachment file name'),
  mimeType: z.string().describe('Attachment MIME type'),
  byteLength: z.number().describe('Decoded attachment byte length'),
  attachmentIndex: z.number().describe('Zero-based index into the returned attachments array')
});

export let mimeTypeForFileName = (fileName: string) => {
  let extension = fileName.toLowerCase().split('.').pop();

  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'tif':
    case 'tiff':
      return 'image/tiff';
    case 'html':
    case 'htm':
      return 'text/html';
    case 'txt':
      return 'text/plain';
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'md':
      return 'text/markdown';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
};

export let byteLengthFromBase64 = getBase64ByteLength;

export let fileOutput = (
  file: Pdf4meFileResult,
  mimeType = mimeTypeForFileName(file.fileName)
) => ({
  fileName: file.fileName,
  mimeType,
  byteLength: byteLengthFromBase64(file.fileContent),
  attachmentCount: 1
});

export let fileAttachment = (
  file: Pdf4meFileResult,
  mimeType = mimeTypeForFileName(file.fileName)
) => createBase64Attachment(file.fileContent, mimeType);

export let streamDocumentOutput = (
  document: Pdf4meStreamDocument,
  attachmentIndex: number
) => ({
  fileName: document.fileName,
  mimeType: mimeTypeForFileName(document.fileName),
  byteLength: byteLengthFromBase64(document.streamFile),
  attachmentIndex
});

export let streamDocumentAttachment = (document: Pdf4meStreamDocument) =>
  createBase64Attachment(document.streamFile, mimeTypeForFileName(document.fileName));
