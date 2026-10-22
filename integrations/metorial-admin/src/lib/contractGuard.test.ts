import { describe, expect, it } from 'vitest';
import { DEFAULT_API_VERSION } from '../config';
import contractJson from './contract.json';
import {
  type Contract,
  contractBreaks,
  contractVersionBreaks,
  type Schema,
  schemaBreaks
} from './contractGuard';

let breaks = (previous: Schema, next: Schema) => schemaBreaks('field', previous, next);

let stringOrList: Schema = {
  anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }]
};

describe('contract sync guard (contract test: generated schema changes ship without per-tool review, so live E2E cannot catch a breaking regeneration before it lands)', () => {
  it('accepts the committed contract against itself', () => {
    let contract = contractJson as unknown as Contract;
    expect(contractBreaks(contract, structuredClone(contract))).toEqual([]);
  });

  it('flags removed tools, categories, routes, and params', () => {
    let tool = {
      key: 'file_get',
      method: 'GET',
      path: '/files/:fileId',
      instanceScoped: true,
      params: { file_id: { in: 'path', name: 'fileId' } },
      inputSchema: { type: 'object' }
    };
    let previous = {
      categories: [{ key: 'files' }],
      tools: [tool, { ...tool, key: 'file_list' }]
    };

    expect(contractBreaks(previous, { categories: [], tools: [] })).toEqual([
      'category files: removed',
      'tool file_get: removed',
      'tool file_list: removed'
    ]);
    expect(
      contractBreaks(previous, {
        categories: previous.categories,
        tools: [
          {
            ...tool,
            method: 'POST',
            path: '/files',
            instanceScoped: false,
            params: {}
          },
          { ...tool, key: 'file_list' }
        ]
      })
    ).toEqual([
      'tool file_get: method changed',
      'tool file_get: path changed',
      'tool file_get: no longer instance scoped',
      'tool file_get: param file_id changed'
    ]);
  });

  it('flags removed types, enum values, properties, and newly required fields', () => {
    expect(breaks({ type: ['string', 'null'] }, { type: 'string' })).toEqual([
      'field: type "null" removed'
    ]);
    expect(breaks({ enum: ['a', 'b'] }, { enum: ['a'] })).toEqual([
      'field: enum value "b" removed'
    ]);
    expect(breaks({ type: 'string' }, { type: 'string', enum: ['a'] })).toEqual([
      'field: enum added'
    ]);
    expect(
      breaks(
        { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } },
        { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }
      )
    ).toEqual(['field.a: newly required', 'field.b: removed']);
    expect(breaks({}, { additionalProperties: false })).toEqual([
      'field: additional properties no longer allowed'
    ]);
  });

  it('flags a union narrowed to a single schema', () => {
    expect(breaks(stringOrList, { type: 'string' })).toEqual([
      'field: type "array" removed',
      'field.anyOf[1]: removed'
    ]);
    expect(breaks(stringOrList, { anyOf: [{ type: 'string' }] })).toEqual([
      'field.anyOf[1]: removed'
    ]);
  });

  it('flags an items schema added to an array that accepted any items', () => {
    expect(breaks({ type: 'array' }, { type: 'array', items: { type: 'string' } })).toEqual([
      'field: items schema added'
    ]);
  });

  it('fails when the generated contract targets a different API version than the default', () => {
    let contract = contractJson as unknown as Contract;
    expect(contractVersionBreaks(contract, DEFAULT_API_VERSION)).toEqual([]);
    expect(
      contractVersionBreaks(
        { ...contract, generatedFrom: { apiVersion: 'mt_next' } },
        DEFAULT_API_VERSION
      )
    ).toEqual([
      `generatedFrom.apiVersion "mt_next" differs from DEFAULT_API_VERSION ${JSON.stringify(DEFAULT_API_VERSION)}`
    ]);
  });

  it('flags a type added to an untyped field', () => {
    expect(breaks({}, { type: 'string' })).toEqual(['field: type added']);
  });

  it('flags new allOf branches and restrictive new unions', () => {
    expect(breaks({ type: 'string' }, { type: 'string', allOf: [{ minLength: 1 }] })).toEqual([
      'field.allOf[0]: added'
    ]);
    expect(
      breaks(
        { type: 'string' },
        { type: 'string', anyOf: [{ minLength: 1 }, { pattern: '^x' }] }
      )
    ).toEqual(['field.anyOf: added']);
    expect(
      breaks(
        { type: 'object', properties: { a: { type: 'string' } } },
        {
          type: 'object',
          properties: { a: { type: 'string' } },
          oneOf: [{ required: ['a'] }, { required: ['b'] }]
        }
      )
    ).toEqual(['field.oneOf: added']);
  });

  it('flags narrowed constraints', () => {
    expect(
      breaks(
        { type: 'string', minLength: 1, maxLength: 10 },
        { type: 'string', minLength: 2, maxLength: 9, pattern: '^x', format: 'uri' }
      )
    ).toEqual([
      'field: minLength raised to 2',
      'field: maxLength lowered to 9',
      'field: format added or changed',
      'field: pattern added or changed'
    ]);
    expect(breaks({ type: 'array' }, { type: 'array', minItems: 1, maxItems: 5 })).toEqual([
      'field: minItems raised to 1',
      'field: maxItems lowered to 5'
    ]);
    expect(breaks({ minimum: 0 }, { minimum: 1, maximum: 100 })).toEqual([
      'field: minimum raised to 1',
      'field: maximum lowered to 100'
    ]);
    expect(breaks({ pattern: '^a' }, { pattern: '^b' })).toEqual([
      'field: pattern added or changed'
    ]);
  });

  it('accepts widenings', () => {
    let widenings: [Schema, Schema][] = [
      [{ type: 'string' }, stringOrList],
      [{ type: 'string' }, {}],
      [{ type: 'integer' }, { type: 'number' }],
      [{ type: 'string' }, { type: ['string', 'null'] }],
      [{ enum: ['a'] }, { enum: ['a', 'b'] }],
      [{ enum: ['a'] }, {}],
      [{ anyOf: [{ type: 'string' }] }, { type: 'string' }],
      [
        { anyOf: [{ type: 'array', items: { type: 'string' } }] },
        { type: 'array', items: { type: 'string' } }
      ],
      [stringOrList, { anyOf: [...stringOrList.anyOf!, { type: 'null' }] }],
      [{ oneOf: stringOrList.anyOf }, stringOrList],
      [{ allOf: [{ minLength: 1 }] }, {}],
      [{ required: ['a'] }, {}],
      [{ additionalProperties: false }, {}],
      [{ properties: {} }, { properties: { b: { type: 'string' } } }],
      [
        { type: 'string', minLength: 2, maxLength: 5, pattern: '^x', format: 'uri' },
        { type: 'string', minLength: 1, maxLength: 6 }
      ],
      [
        { minimum: 1, maximum: 5, minItems: 2, maxItems: 3 },
        { minimum: 0, maximum: 6, minItems: 1, maxItems: 4 }
      ]
    ];

    for (let [previous, next] of widenings) expect(breaks(previous, next)).toEqual([]);
  });
});
