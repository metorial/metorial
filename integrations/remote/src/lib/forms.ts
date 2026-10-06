import type { Client } from './client';
import {
  country,
  fail,
  integer,
  isRecord,
  jsonObject,
  type RecordData,
  record
} from './validation';
export async function countryForm(
  client: Client,
  countryCode: string,
  form: string,
  employmentId?: string
) {
  let result = record(
    await client.get(`/countries/${country(countryCode)}/${form}`, {
      employment_id: employmentId
    }),
    'country form response'
  );
  let data = record(result.data, 'country form data');
  let schema = record(data.schema ?? data, 'country form schema');
  return {
    schema,
    version:
      data.version === undefined ? undefined : integer(data.version, 'Country form version', 1)
  };
}
export function validateForm(value: unknown, schema: RecordData, label: string): RecordData {
  let data = jsonObject(value, label);
  let properties = isRecord(schema.properties) ? schema.properties : {};
  if (Array.isArray(schema.required))
    for (let key of schema.required)
      if (
        typeof key === 'string' &&
        (data[key] === undefined || data[key] === null || data[key] === '')
      )
        fail(
          `${label} requires ${key}. Read the current country form schema and provide all required fields.`
        );
  for (let [key, value] of Object.entries(data)) {
    let field = properties[key];
    if (!isRecord(field)) {
      if (schema.additionalProperties === false)
        fail(
          `${label} contains unsupported field ${key}. Read the current country form schema.`
        );
      continue;
    }
    let presentation = isRecord(field['x-jsf-presentation'])
      ? field['x-jsf-presentation']
      : {};
    if (field.type === 'integer' || presentation.inputType === 'money')
      integer(
        value,
        `${label}.${key}`,
        typeof field.minimum === 'number' ? field.minimum : Number.MIN_SAFE_INTEGER,
        typeof field.maximum === 'number' ? field.maximum : Number.MAX_SAFE_INTEGER
      );
    if (Array.isArray(field.enum) && !field.enum.includes(value))
      fail(`${label}.${key} must use a value from the current country schema.`);
  }
  return data;
}
