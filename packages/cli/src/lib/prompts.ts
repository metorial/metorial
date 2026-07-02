import { checkbox, confirm, input, password, select } from '@inquirer/prompts';
import type { JsonObject } from './types';

export let prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

export let parseJsonObject = (value: string | undefined, label: string): JsonObject | null => {
  if (!value) return null;

  let parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed;
};

export let parseList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

export let print = (value: unknown) => {
  console.log(prettyJson(value));
};

export let promptForString = async (d: {
  message: string;
  defaultValue?: string;
  secret?: boolean;
}) => {
  if (d.secret) {
    return password({
      message: d.message,
      mask: '*'
    });
  }

  return input({
    message: d.message,
    default: d.defaultValue
  });
};

export let promptForSchemaValue = async (d: {
  key: string;
  schema: any;
  currentValue?: any;
  required?: boolean;
}): Promise<any> => {
  let schema = d.schema ?? {};
  let label = schema.title ?? d.key;

  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return select({
      message: label,
      default: d.currentValue,
      choices: schema.enum.map((value: string) => ({
        name: value,
        value
      }))
    });
  }

  if (schema.type === 'boolean') {
    return confirm({
      message: label,
      default: d.currentValue ?? false
    });
  }

  if (schema.type === 'array') {
    if (Array.isArray(schema.items?.enum) && schema.items.enum.length > 0) {
      return checkbox({
        message: label,
        choices: schema.items.enum.map((value: string) => ({
          name: value,
          value,
          checked: Array.isArray(d.currentValue) ? d.currentValue.includes(value) : false
        }))
      });
    }

    let raw = await input({
      message: `${label} (JSON array)`,
      default: Array.isArray(d.currentValue) ? prettyJson(d.currentValue) : undefined
    });

    if (!raw.trim()) return [];
    return JSON.parse(raw);
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    let raw = await input({
      message: label,
      default: d.currentValue !== undefined ? String(d.currentValue) : undefined
    });

    if (!raw.trim() && !d.required) return undefined;
    return Number(raw);
  }

  if (schema.type === 'object') {
    let raw = await input({
      message: `${label} (JSON object)`,
      default: d.currentValue ? prettyJson(d.currentValue) : '{}'
    });

    if (!raw.trim()) return {};
    return JSON.parse(raw);
  }

  let isSecret = /secret|token|password/i.test(d.key);
  let raw = await promptForString({
    message: label,
    defaultValue: typeof d.currentValue === 'string' ? d.currentValue : undefined,
    secret: isSecret
  });

  if (!raw.trim() && !d.required) return undefined;
  return raw;
};

export let promptForObjectSchema = async (schema: any, initialValue: JsonObject = {}) => {
  let properties = schema?.properties ?? {};
  let required = new Set<string>(schema?.required ?? []);
  let keys = Object.keys(properties);

  if (keys.length === 0) {
    if (Object.keys(initialValue).length === 0) {
      return {};
    }

    let raw = await input({
      message: 'Enter JSON object',
      default: Object.keys(initialValue).length > 0 ? prettyJson(initialValue) : '{}'
    });

    if (!raw.trim()) return {};
    return parseJsonObject(raw, 'JSON input') ?? {};
  }

  let result: JsonObject = { ...initialValue };

  for (let key of keys) {
    let value = await promptForSchemaValue({
      key,
      schema: properties[key],
      currentValue: initialValue[key],
      required: required.has(key)
    });

    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
};
