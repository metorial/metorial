import { createHash } from 'node:crypto';
import { evernoteServiceError } from './errors';
import type { EvernoteResource } from './types';

export type NoteResourceInput = {
  fileName?: string;
  mimeType: string;
  contentBase64: string;
};

type PreparedResource = {
  resource: EvernoteResource;
  mediaTag: string;
};

let enmlPrefix =
  '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>';
let enmlSuffix = '</en-note>';

let escapeXmlAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

let decodeBase64 = (value: string, label: string) => {
  let normalized = value.replace(/\s/g, '');
  let bytes = Buffer.from(normalized, 'base64');
  let roundTrip = bytes.toString('base64').replace(/=+$/, '');
  let input = normalized.replace(/=+$/, '');

  if (bytes.length === 0 || roundTrip !== input) {
    throw evernoteServiceError(`${label} must be valid non-empty base64 content.`);
  }

  return bytes;
};

export let prepareNoteResources = (
  inputs: NoteResourceInput[] | undefined
): PreparedResource[] => {
  if (!inputs?.length) {
    return [];
  }

  return inputs.map((input, index) => {
    let body = decodeBase64(input.contentBase64, `resources[${index}].contentBase64`);
    let hash = createHash('md5').update(body).digest();
    let hashHex = hash.toString('hex');

    return {
      resource: {
        mime: input.mimeType,
        attributes: {
          fileName: input.fileName,
          attachment: true
        },
        data: {
          bodyHash: new Uint8Array(hash),
          size: body.length,
          body: new Uint8Array(body)
        }
      },
      mediaTag: `<div><en-media type="${escapeXmlAttribute(input.mimeType)}" hash="${hashHex}" /></div>`
    };
  });
};

export let buildEnmlContent = (content: string, resources: PreparedResource[] = []) => {
  let resourceMarkup = resources.map(resource => resource.mediaTag).join('');
  let trimmed = content.trimStart();

  if (!trimmed.startsWith('<?xml')) {
    return `${enmlPrefix}${content}${resourceMarkup}${enmlSuffix}`;
  }

  if (!resourceMarkup) {
    return content;
  }

  if (!content.includes(enmlSuffix)) {
    throw evernoteServiceError(
      'Full ENML content must include a closing </en-note> tag when resources are attached.'
    );
  }

  return content.replace(/<\/en-note>\s*$/, `${resourceMarkup}${enmlSuffix}`);
};
