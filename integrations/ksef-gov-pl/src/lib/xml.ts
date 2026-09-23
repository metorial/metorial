import { ServiceError } from '@lowerdeck/error';
import { SaxesParser, type SaxesTagNS } from 'saxes';
import { ksefValidationError } from './errors';

export const FA3_NAMESPACE = 'http://crd.gov.pl/wzor/2025/06/25/13775/';

type InvoiceXmlInfo = { hasEmbeddedAttachment: boolean };

function parseInvoice(xml: string): InvoiceXmlInfo {
  if (typeof xml !== 'string' || !xml.trim()) {
    throw ksefValidationError('Provide a complete FA(3) invoice XML string.');
  }

  const parser = new SaxesParser({
    xmlns: true,
    defaultXMLVersion: '1.0',
    forceXMLVersion: true
  });
  const stack: SaxesTagNS[] = [];
  let formDepth: number | undefined;
  let variantDepth: number | undefined;
  let formText = '';
  let variantText = '';
  let formCode: string | undefined;
  let schemaVersion: string | undefined;
  let sawHeader = false;
  let hasAttachment = false;
  let declaredEncoding: string | undefined;
  let declaredVersion: string | undefined;

  parser.on('xmldecl', declaration => {
    declaredEncoding = declaration.encoding;
    declaredVersion = declaration.version;
  });
  parser.on('doctype', () => {
    throw ksefValidationError('Invoice XML cannot contain DTD or entity declarations.');
  });
  parser.on('opentag', tag => {
    const depth = stack.length;
    if (depth === 0 && (tag.local !== 'Faktura' || tag.uri !== FA3_NAMESPACE)) {
      throw ksefValidationError(
        'Invoice XML must have a Faktura root in the FA(3) namespace.'
      );
    }
    if (tag.local === 'Zalacznik' && tag.uri === FA3_NAMESPACE) hasAttachment = true;

    if (depth === 1 && tag.local === 'Naglowek' && tag.uri === FA3_NAMESPACE) {
      sawHeader = true;
    }
    const parent = stack.at(-1);
    if (depth === 2 && parent?.local === 'Naglowek' && parent.uri === FA3_NAMESPACE) {
      if (tag.local === 'KodFormularza' && tag.uri === FA3_NAMESPACE) {
        formDepth = depth + 1;
        const code = tag.attributes.kodSystemowy;
        const version = tag.attributes.wersjaSchemy;
        formCode = code?.uri === '' ? code.value : undefined;
        schemaVersion = version?.uri === '' ? version.value : undefined;
      }
      if (tag.local === 'WariantFormularza' && tag.uri === FA3_NAMESPACE) {
        variantDepth = depth + 1;
      }
    }
    stack.push(tag);
  });
  const collectText = (value: string) => {
    if (formDepth === stack.length) formText += value;
    if (variantDepth === stack.length) variantText += value;
  };
  parser.on('text', collectText);
  parser.on('cdata', collectText);
  parser.on('closetag', () => {
    if (formDepth === stack.length) formDepth = undefined;
    if (variantDepth === stack.length) variantDepth = undefined;
    stack.pop();
  });

  try {
    parser.write(xml).close();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw ksefValidationError('Invoice XML is not well formed XML 1.0.');
  }

  if (declaredEncoding && !/^utf-8$/i.test(declaredEncoding)) {
    throw ksefValidationError('Invoice XML must declare UTF-8 encoding.');
  }
  if (declaredVersion && declaredVersion !== '1.0') {
    throw ksefValidationError('Invoice XML must use XML 1.0.');
  }
  if (
    !sawHeader ||
    formText.trim() !== 'FA' ||
    formCode !== 'FA (3)' ||
    schemaVersion !== '1-0E' ||
    variantText.trim() !== '3'
  ) {
    throw ksefValidationError('Invoice XML must declare the FA(3) form and schema version.');
  }

  return { hasEmbeddedAttachment: hasAttachment };
}

export function validateInvoiceXml(xml: string): Buffer {
  parseInvoice(xml);
  return Buffer.from(xml, 'utf8');
}

export function hasEmbeddedAttachment(xml: string): boolean {
  return parseInvoice(xml).hasEmbeddedAttachment;
}
