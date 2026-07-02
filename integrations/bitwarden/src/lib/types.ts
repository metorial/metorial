export interface CollectionAssociation {
  id: string;
  readOnly: boolean;
  hidePasswords?: boolean;
  manage?: boolean;
}

export interface MemberResponse {
  object: string;
  id: string;
  userId: string | null;
  name: string | null;
  email: string;
  twoFactorEnabled: boolean;
  status: number;
  type: number;
  accessAll: boolean;
  externalId: string | null;
  collections: CollectionAssociation[];
}

export interface GroupResponse {
  object: string;
  id: string;
  name: string;
  accessAll: boolean;
  externalId: string | null;
  collections: CollectionAssociation[];
}

export interface CollectionResponse {
  object: string;
  id: string;
  externalId: string | null;
  groups: CollectionAssociation[];
}

export interface PolicyResponse {
  object: string;
  id: string;
  type: number;
  enabled: boolean;
  data: Record<string, any> | null;
}

export interface EventResponse {
  object: string;
  type: number;
  itemId: string | null;
  collectionId: string | null;
  groupId: string | null;
  policyId: string | null;
  memberId: string | null;
  actingUserId: string | null;
  date: string;
  device: number | null;
  ipAddress: string | null;
}

export interface ListResponse<T> {
  object: string;
  data: T[];
  continuationToken: string | null;
}
