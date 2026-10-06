import { DOMParser } from '@xmldom/xmldom';

export { DOMParser } from '@xmldom/xmldom';

import { identifier, invalid } from './helpers';

const EDM = 'http://schemas.microsoft.com/ado/2008/09/edm';
const SAP = 'http://www.successfactors.com/edm/sap';
export type Property = {
  name: string;
  type: string;
  nullable: boolean;
  required: boolean;
  creatable: boolean;
  updatable: boolean;
  visible: boolean;
};
export type EntityMetadata = {
  name: string;
  type: string;
  keys: string[];
  properties: Property[];
  navigationProperties: string[];
  creatable: boolean;
  updatable: boolean;
  upsertable: boolean;
  deletable: boolean;
};
const flag = (e: Element, name: string, fallback: boolean) => {
  let v = e.getAttributeNS(SAP, name);
  if (!v) return fallback;
  if (v !== 'true' && v !== 'false')
    throw invalid('SAP metadata contains an invalid capability annotation.');
  return v === 'true';
};
export function parseMetadata(xml: unknown): EntityMetadata[] {
  if (
    typeof xml !== 'string' ||
    Buffer.byteLength(xml) > 16 * 1024 * 1024 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml)
  )
    throw invalid(
      'SAP metadata must be bounded XML without document types or entity declarations. Request a subset of entities.'
    );
  let bad = false;
  let doc: ReturnType<DOMParser['parseFromString']>;
  try {
    doc = new DOMParser({
      errorHandler: {
        warning: () => {
          bad = true;
        },
        error: () => {
          bad = true;
        },
        fatalError: () => {
          bad = true;
        }
      }
    }).parseFromString(xml, 'application/xml');
  } catch {
    throw invalid('SAP returned malformed metadata XML.');
  }
  if (
    bad ||
    !doc.documentElement ||
    doc.documentElement.localName !== 'Edmx' ||
    doc.documentElement.namespaceURI !== 'http://schemas.microsoft.com/ado/2007/06/edmx'
  )
    throw invalid('SAP returned an invalid OData V2 metadata document.');
  let types = new Map<string, Element>();
  for (let schema of Array.from(doc.getElementsByTagNameNS(EDM, 'Schema'))) {
    let namespace = schema.getAttribute('Namespace');
    for (let t of Array.from(schema.getElementsByTagNameNS(EDM, 'EntityType'))) {
      let name = identifier(t.getAttribute('Name') ?? '');
      if (!namespace || types.has(`${namespace}.${name}`))
        throw invalid('SAP metadata contains ambiguous entity types.');
      types.set(`${namespace}.${name}`, t);
    }
  }
  let result: EntityMetadata[] = [];
  for (let set of Array.from(doc.getElementsByTagNameNS(EDM, 'EntitySet'))) {
    let name = identifier(set.getAttribute('Name') ?? '');
    let type = set.getAttribute('EntityType') ?? '';
    let t = types.get(type);
    if (!t || result.some(x => x.name === name))
      throw invalid('SAP metadata contains unresolved or ambiguous entity sets.');
    let properties = Array.from(t.getElementsByTagNameNS(EDM, 'Property')).map(e => ({
      name: identifier(e.getAttribute('Name') ?? ''),
      type: e.getAttribute('Type') ?? '',
      nullable: e.getAttribute('Nullable') !== 'false',
      required: flag(e, 'required', false),
      creatable: flag(e, 'creatable', true),
      updatable: flag(e, 'updatable', true),
      visible: flag(e, 'visible', true)
    }));
    let keys = Array.from(t.getElementsByTagNameNS(EDM, 'PropertyRef')).map(e =>
      identifier(e.getAttribute('Name') ?? '')
    );
    if (
      !keys.length ||
      new Set(keys).size !== keys.length ||
      new Set(properties.map(x => x.name)).size !== properties.length ||
      keys.some(k => !properties.some(x => x.name === k))
    )
      throw invalid('SAP metadata has invalid entity keys or properties.');
    result.push({
      name,
      type,
      keys,
      properties,
      navigationProperties: Array.from(
        t.getElementsByTagNameNS(EDM, 'NavigationProperty')
      ).map(e => identifier(e.getAttribute('Name') ?? '')),
      creatable: flag(set, 'creatable', true),
      updatable: flag(set, 'updatable', true),
      upsertable: flag(set, 'upsertable', true),
      deletable: flag(set, 'deletable', true)
    });
  }
  if (!result.length)
    throw invalid('SAP metadata exposes no usable entity sets. Check API permissions.');
  return result;
}
