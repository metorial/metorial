export type LaunchDarklyResourceKeys = {
  projectKey?: string;
  environmentKey?: string;
  flagKey?: string;
  segmentKey?: string;
  memberId?: string;
};

let RESOURCE_FIELD: Record<string, keyof LaunchDarklyResourceKeys> = {
  proj: 'projectKey',
  env: 'environmentKey',
  flag: 'flagKey',
  segment: 'segmentKey',
  member: 'memberId'
};

export let parseResourceSpecifiers = (resources: unknown): LaunchDarklyResourceKeys => {
  let result: LaunchDarklyResourceKeys = {};
  if (!Array.isArray(resources)) return result;

  for (let resource of resources) {
    if (typeof resource !== 'string') continue;

    for (let part of resource.split(':')) {
      let separator = part.indexOf('/');
      if (separator < 1) continue;
      let kind = part.slice(0, separator);
      let key = part.slice(separator + 1);
      let field = RESOURCE_FIELD[kind];
      if (field && key && key !== '*') result[field] = key;
    }
  }

  return result;
};
