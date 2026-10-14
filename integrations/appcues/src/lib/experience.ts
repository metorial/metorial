export interface AppcuesExperience {
  id?: string;
  ID?: string;
  name?: string;
  Name?: string;
  internal_name?: string;
  title?: string;
  published?: boolean;
  Published?: boolean;
  created_at?: string | number | null;
  createdAt?: string | number | null;
  updated_at?: string | number | null;
  updatedAt?: string | number | null;
  frequency?: string;
  tag_ids?: string[];
  tags?: Record<string, boolean> | (string | { name?: string; id?: string })[];
}

let formatTimestamp = (value: string | number | null | undefined) => {
  if (typeof value === 'string') return value || undefined;
  if (typeof value !== 'number') return undefined;
  let date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

let mapTags = (item: AppcuesExperience) => {
  if (item.tag_ids) return item.tag_ids;
  let tags = item.tags;
  if (Array.isArray(tags)) {
    return tags
      .map(tag => (typeof tag === 'string' ? tag : tag.name || tag.id))
      .filter((tag): tag is string => typeof tag === 'string');
  }
  return tags ? Object.keys(tags).filter(id => tags[id] === true) : undefined;
};

export let mapExperience = (
  item: AppcuesExperience,
  experienceType: string,
  fallbackId = ''
) => ({
  experienceId: item.id || item.ID || fallbackId,
  name: item.name || item.Name || item.internal_name || item.title || '',
  published: item.published ?? item.Published ?? false,
  experienceType,
  createdAt: formatTimestamp(item.created_at ?? item.createdAt),
  updatedAt: formatTimestamp(item.updated_at ?? item.updatedAt),
  frequency: item.frequency || undefined,
  tags: mapTags(item)
});
