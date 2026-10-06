import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  folderSchema,
  type LastPassBatchAddUser,
  type LastPassGroupChange,
  type LastPassReceipt,
  reportSchema,
  usersResponseSchema
} from './types';

export let invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
export let requiredText = (value: unknown, field: string): string => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value !== value.trim() ||
    value.length > 4096 ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid(
      `Provide a nonempty ${field} without surrounding whitespace or control characters.`
    );
  return value;
};
export let email = (value: unknown) => {
  let text = requiredText(value, 'user email');
  if (!z.email().safeParse(text).success) throw invalid('Provide a valid user email address.');
  return text;
};
export let credentials = (value: { companyId: string; provisioningHash: string }) => {
  try {
    let companyId = requiredText(value.companyId, 'company ID');
    if (
      !/^\d+$/.test(companyId) ||
      !Number.isSafeInteger(Number(companyId)) ||
      Number(companyId) <= 0
    )
      throw invalid(
        'Company ID must be a positive safe integer from the LastPass Admin Console account menu.'
      );
    let provisioningHash = requiredText(
      value.provisioningHash,
      'Enterprise API provisioning hash'
    );
    if (provisioningHash.startsWith('lpkey_'))
      throw invalid(
        'Use the Enterprise API provisioning hash. Early-access LastPass REST API keys are a different credential family.'
      );
    return { companyId, provisioningHash };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw invalid('Provide the company ID and Enterprise API provisioning hash.');
  }
};
let responseError = (
  message = 'LastPass returned an incomplete or invalid response. Check the account in the Admin Console before retrying a write.'
) => createApiServiceError(message, { reason: 'invalid_upstream_response' });
let record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
let secretVariants = (value: string) => {
  let variants = new Set([
    value,
    Buffer.from(value).toString('base64'),
    Buffer.from(value).toString('base64url')
  ]);
  let uri = value;
  let form = value;
  for (let depth = 0; depth < 5; depth++) {
    try {
      uri = encodeURIComponent(uri);
      form = encodeURIComponent(form).replace(/%20/g, '+');
    } catch {
      break;
    }
    variants.add(uri);
    variants.add(form);
  }
  return [...variants];
};

export class LastPassClient {
  private companyId: string;
  private provisioningHash: string;
  private readonly credentialVariants: string[];
  private readonly credentialRedactor: AuthConfigSecretRedactor;
  constructor(params: { companyId: string; provisioningHash: string }) {
    let normalized = credentials(params);
    this.companyId = normalized.companyId;
    this.provisioningHash = normalized.provisioningHash;
    this.credentialVariants = secretVariants(this.provisioningHash);
    this.credentialRedactor = new AuthConfigSecretRedactor({
      variants: this.credentialVariants
    });
  }
  private credentialFree(value: unknown): boolean {
    let pending: unknown[] = [value];
    let seen = new Set<object>();
    try {
      while (pending.length) {
        let current = pending.pop();
        if (typeof current === 'string') {
          if (this.credentialRedactor.redactEmbedded(current) !== current) return false;
        } else if (current !== null && typeof current === 'object' && !seen.has(current)) {
          seen.add(current);
          for (let key of Reflect.ownKeys(current)) {
            if (this.credentialRedactor.redactEmbedded(String(key)) !== String(key))
              return false;
            let property = Object.getOwnPropertyDescriptor(current, key);
            if (!property || !('value' in property)) return false;
            pending.push(property.value);
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }
  private assertNoCredential(value: unknown) {
    if (!this.credentialFree(value))
      throw invalid(
        'Do not use the provisioning hash in tool inputs or resource identifiers.'
      );
  }
  private safeWarning(value: string) {
    for (let secret of this.credentialVariants) value = value.split(secret).join('[redacted]');
    return value.slice(0, 1000);
  }
  private async execute(cmd: string, data?: unknown): Promise<Record<string, unknown>> {
    this.assertNoCredential(data);
    try {
      let client = createAxios({
        baseURL: 'https://lastpass.com',
        maxRedirects: 0,
        timeout: 30000,
        maxContentLength: 16 * 1024 * 1024,
        headers: { 'Content-Type': 'application/json' }
      });
      let response = await client.post<unknown>(
        '/enterpriseapi.php',
        pickDefined({
          cid: Number(this.companyId),
          provhash: this.provisioningHash,
          cmd,
          data
        })
      );
      if (response.status !== 200 || !record(response.data)) throw responseError();
      let result = response.data;
      if (
        result.status !== undefined &&
        result.status !== 'OK' &&
        result.status !== 'WARN' &&
        !(cmd === 'disableuser' && result.status === 'success')
      )
        throw createApiServiceError(
          'LastPass rejected the request. Check the provisioning hash, account permissions, and requested users in the Admin Console.',
          { reason: 'upstream_rejected' }
        );
      if (!this.credentialFree(result))
        throw responseError(
          'LastPass returned credential data instead of a safe administrative result.'
        );
      if (result.status === 'WARN' && ['getuserdata', 'getsfdata', 'reporting'].includes(cmd))
        throw responseError(
          'LastPass returned a warning for this read; the inventory may be incomplete. Resolve it in the Admin Console before relying on the result.'
        );
      return result;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      let status: number | undefined;
      try {
        let candidate = (error as { response?: { status?: unknown } })?.response?.status;
        if (
          typeof candidate === 'number' &&
          Number.isInteger(candidate) &&
          candidate >= 100 &&
          candidate <= 599
        )
          status = candidate;
      } catch {
        /* Upstream runtime objects can contain throwing getters. */
      }
      throw buildApiServiceError(error, {
        providerLabel: 'LastPass',
        operation: cmd,
        reason: 'upstream_error',
        parent: {},
        extractResponse: () => (status === undefined ? undefined : { status }),
        extractStatus: () => status,
        extractMessage: () =>
          'The administrative request failed. For writes, verify current user state before retrying; delivery or prior actions may already have occurred.'
      });
    }
  }
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    try {
      let result = schema.safeParse(value);
      if (result.success) return result.data;
    } catch {
      /* Never retain untrusted response getters or parser errors. */
    }
    throw responseError();
  }
  private receipt(value: Record<string, unknown>): LastPassReceipt {
    if (value.status !== 'OK' && value.status !== 'WARN') throw responseError();
    let warnings: string[] | undefined;
    if (value.errors !== undefined)
      warnings = this.parse(z.array(z.string()), value.errors).map(message =>
        this.safeWarning(message)
      );
    return { status: value.status, warnings };
  }
  async getUserData(
    username?: string,
    pageIndex = 0,
    pageSize = 500,
    disabled?: boolean,
    admin?: boolean
  ) {
    if (
      !Number.isInteger(pageIndex) ||
      pageIndex < 0 ||
      !Number.isSafeInteger(pageIndex * pageSize) ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 2000
    )
      throw invalid('Use a nonnegative pageIndex and pageSize between 1 and 2000.');
    let result = this.parse(
      usersResponseSchema,
      await this.execute(
        'getuserdata',
        pickDefined({
          username: username === undefined ? undefined : email(username),
          pageindex: pageIndex,
          pagesize: pageSize,
          disabled: disabled === undefined ? undefined : Number(disabled),
          admin: admin === undefined ? undefined : Number(admin)
        })
      )
    );
    if (result.count !== undefined && result.count !== Object.keys(result.Users).length)
      throw responseError();
    if (
      result.total !== undefined &&
      result.total < (result.count ?? Object.keys(result.Users).length)
    )
      throw responseError();
    if (
      username !== undefined &&
      Object.values(result.Users).some(
        user => user.username.toLowerCase() !== username.toLowerCase()
      )
    )
      throw responseError('LastPass returned a different user than requested.');
    return result;
  }
  async batchAdd(users: LastPassBatchAddUser[]) {
    if (!users.length) throw invalid('Provide at least one user to provision.');
    let normalized = users.map(user => ({
      username: email(user.username),
      ...pickDefined({
        fullname:
          user.fullname === undefined ? undefined : requiredText(user.fullname, 'full name'),
        groups: user.groups?.map(group => requiredText(group, 'group name'))
      })
    }));
    if (
      new Set(normalized.map(user => user.username.toLowerCase())).size !== normalized.length
    )
      throw invalid('Each provisioned user email must be unique within the request.');
    return this.receipt(await this.execute('batchadd', normalized));
  }
  async deleteUser(username: string, deleteAction: 0 | 1 | 2 = 0) {
    if (![0, 1, 2].includes(deleteAction))
      throw invalid('Choose deactivate, remove, or delete.');
    return this.receipt(
      await this.execute('deluser', { username: email(username), deleteaction: deleteAction })
    );
  }
  async disableUser(username: string): Promise<LastPassReceipt> {
    username = email(username);
    let value = await this.execute('disableuser', [username]);
    let parsed = this.parse(
      z.object({
        status: z.literal('success'),
        disabled_users: z.array(z.string()).optional(),
        unchanged_users: z.array(z.string()).optional(),
        error: z.string().optional()
      }),
      value
    );
    let listed = [...(parsed.disabled_users ?? []), ...(parsed.unchanged_users ?? [])];
    if (
      parsed.error ||
      !listed.some(user => user.toLowerCase() === username.toLowerCase()) ||
      listed.some(user => user.toLowerCase() !== username.toLowerCase())
    )
      throw responseError(
        'LastPass did not confirm the requested account was disabled or already unchanged. Check its current state before retrying.'
      );
    return {
      status: parsed.status,
      disabledUsers: parsed.disabled_users,
      unchangedUsers: parsed.unchanged_users
    };
  }
  async resetPassword(username: string) {
    return this.receipt(await this.execute('resetpassword', { username: email(username) }));
  }
  async disableMultifactor(username: string) {
    return this.receipt(
      await this.execute('disablemultifactor', { username: email(username) })
    );
  }
  async batchChangeGroup(changes: LastPassGroupChange[]) {
    if (!changes.length) throw invalid('Provide at least one membership change.');
    let normalized = changes.map(change => {
      let add = change.add?.map(group => requiredText(group, 'group name'));
      let del = change.del?.map(group => requiredText(group, 'group name'));
      if (!(add?.length || del?.length) || add?.some(group => del?.includes(group)))
        throw invalid(
          'Each membership change needs a nonempty add or remove list, without the same group in both.'
        );
      return { username: email(change.username), ...pickDefined({ add, del }) };
    });
    if (
      new Set(normalized.map(change => change.username.toLowerCase())).size !==
      normalized.length
    )
      throw invalid('Combine changes for each user into one entry.');
    return this.receipt(await this.execute('batchchangegrp', normalized));
  }
  async getSharedFolderData() {
    let value = await this.execute('getsfdata', 'all');
    let folders: Record<string, z.infer<typeof folderSchema>> = {};
    for (let [key, folder] of Object.entries(value)) {
      if (key === 'status' || key === 'errors') continue;
      if (!/^\d+$/.test(key)) throw responseError();
      folders[key] = this.parse(folderSchema, folder);
    }
    return folders;
  }
  async getEventReport(params: {
    from: string;
    to: string;
    search?: string;
    user?: string;
    next?: string;
    admin?: boolean;
  }) {
    let datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    for (let value of [params.from, params.to]) {
      if (
        !datePattern.test(value) ||
        !Number.isFinite(Date.parse(`${value.replace(' ', 'T')}Z`)) ||
        new Date(`${value.replace(' ', 'T')}Z`)
          .toISOString()
          .slice(0, 19)
          .replace('T', ' ') !== value
      )
        throw invalid(
          'Use real from/to dates in YYYY-MM-DD HH:MM:SS format, in the LastPass account reporting time zone.'
        );
    }
    if (params.from > params.to) throw invalid('from must be at or before to.');
    if (params.next !== undefined)
      requiredText(params.next, 'native event continuation timestamp');
    let result = this.parse(
      reportSchema,
      await this.execute(
        'reporting',
        pickDefined({
          ...params,
          search:
            params.search === undefined
              ? undefined
              : requiredText(params.search, 'search term'),
          user:
            params.user === undefined
              ? undefined
              : params.user === 'allusers'
                ? 'allusers'
                : email(params.user),
          admin: params.admin === undefined ? undefined : Number(params.admin)
        })
      )
    );
    return result;
  }
}
