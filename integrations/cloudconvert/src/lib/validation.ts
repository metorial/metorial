import { invalidInput } from './errors';

export type Tasks = Record<string, Record<string, unknown>>;
export const exactId = (value: unknown, label = 'Resource ID'): string => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value))
    throw invalidInput(
      `${label} must be the exact ID returned by CloudConvert, without URL or path characters.`
    );
  return value;
};
export const httpUrl = (value: unknown, label = 'Source URL'): string => {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    throw invalidInput(`${label} must be a valid HTTP or HTTPS URL.`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalidInput(`${label} must be a valid HTTP or HTTPS URL.`);
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    !url.hostname ||
    url.hash
  )
    throw invalidInput(
      `${label} must be an HTTP or HTTPS URL without embedded credentials or a fragment.`
    );
  return value;
};
export const applyOptions = (
  task: Record<string, unknown>,
  options?: Record<string, unknown>
) => {
  if (!options) return;
  for (const [key, value] of Object.entries(options)) {
    if (
      ['operation', 'input', '__proto__', 'prototype', 'constructor'].includes(key) ||
      Object.hasOwn(task, key)
    )
      throw invalidInput(
        `Additional options cannot override ${key}. Use its dedicated input field.`
      );
    if (value === undefined)
      throw invalidInput('Additional options must contain JSON values.');
    task[key] = value;
  }
};
export const validateTasks = (value: unknown): Tasks => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalidInput('Tasks must be a nonempty name-to-configuration object.');
  const entries = Object.entries(value);
  if (!entries.length || entries.length > 100)
    throw invalidInput('Provide between 1 and 100 tasks.');
  const names = new Set(entries.map(([name]) => name));
  const dependencies = new Map<string, string[]>();
  for (const [name, config] of entries) {
    if (
      !/^[A-Za-z0-9_-]+$/.test(name) ||
      ['__proto__', 'constructor', 'prototype'].includes(name)
    )
      throw invalidInput(
        'Task names may contain only letters, numbers, hyphens, and underscores.'
      );
    if (!config || typeof config !== 'object' || Array.isArray(config))
      throw invalidInput('Each task must have an operation and a JSON configuration object.');
    const task = config as Record<string, unknown>;
    if (
      typeof task.operation !== 'string' ||
      !/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?$/.test(task.operation)
    )
      throw invalidInput('Each task must specify a documented CloudConvert operation.');
    if (task.operation === 'import/url') httpUrl(task.url);
    if (task.operation === 'capture-website') httpUrl(task.url, 'Website URL');
    const refs =
      task.input === undefined
        ? []
        : typeof task.input === 'string'
          ? [task.input]
          : Array.isArray(task.input)
            ? task.input
            : null;
    if (
      !refs ||
      refs.some(ref => typeof ref !== 'string' || !names.has(ref) || ref === name) ||
      (task.input !== undefined && !refs.length)
    )
      throw invalidInput('Task input must reference other names in this job.');
    const images =
      task.image === undefined
        ? []
        : typeof task.image === 'string'
          ? [task.image]
          : Array.isArray(task.image)
            ? task.image
            : null;
    if (
      !images ||
      images.some(ref => typeof ref !== 'string' || !names.has(ref) || ref === name)
    )
      throw invalidInput('Watermark image must reference other task names in this job.');
    dependencies.set(name, [...refs, ...images]);
  }
  const visiting = new Set<string>();
  const complete = new Set<string>();
  const visit = (name: string) => {
    if (visiting.has(name)) throw invalidInput('Task dependencies must not contain a cycle.');
    if (complete.has(name)) return;
    visiting.add(name);
    for (const ref of dependencies.get(name) ?? []) visit(ref);
    visiting.delete(name);
    complete.add(name);
  };
  for (const name of names) visit(name);
  try {
    JSON.stringify(value);
  } catch {
    throw invalidInput('Tasks must contain serializable JSON values.');
  }
  return value as Tasks;
};
