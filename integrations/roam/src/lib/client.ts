import { randomUUID } from 'node:crypto';
import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError, createAxios } from 'slates';
import {
  apiError,
  assertNoAuthenticationData,
  ednString,
  fail,
  jsonBody,
  privacy,
  record,
  text
} from './validation';

export interface BlockLocation {
  parentUid: string;
  order: number | 'first' | 'last';
}

export interface BlockData {
  string: string;
  uid?: string;
  open?: boolean;
  heading?: number;
  textAlign?: string;
  childrenViewType?: string;
}

export interface CreateBlockAction {
  action: 'create-block';
  location: { 'parent-uid': string; order: number | string };
  block: {
    string: string;
    uid?: string;
    open?: boolean;
    heading?: number;
    'text-align'?: string;
    'children-view-type'?: string;
  };
}

export interface UpdateBlockAction {
  action: 'update-block';
  block: {
    uid: string;
    string?: string;
    open?: boolean;
    heading?: number;
    'text-align'?: string;
    'children-view-type'?: string;
  };
}

export interface MoveBlockAction {
  action: 'move-block';
  location: { 'parent-uid': string; order: number | string };
  block: { uid: string };
}

export interface DeleteBlockAction {
  action: 'delete-block';
  block: { uid: string };
}

export interface CreatePageAction {
  action: 'create-page';
  page: {
    title: string;
    uid?: string;
  };
}

export interface UpdatePageAction {
  action: 'update-page';
  page: {
    title: string;
    uid: string;
  };
}

export interface DeletePageAction {
  action: 'delete-page';
  page: {
    uid: string;
  };
}

export type WriteAction =
  | CreateBlockAction
  | UpdateBlockAction
  | MoveBlockAction
  | DeleteBlockAction
  | CreatePageAction
  | UpdatePageAction
  | DeletePageAction;

type Receipt = {
  uid: string;
  deleted: boolean;
  fields: Record<string, unknown>;
  location?: { 'parent-uid': string; order: number | string };
};
export type WriteResult = { success: boolean; targetUid: string; verified: boolean };
const selector =
  '[:block/uid :node/title :block/string :block/open :block/heading :block/text-align :block/children-view-type :block/order {:block/_children [:block/uid]} {:block/children [:block/uid :block/order]}]';
export class RoamClient {
  readonly graphName: string;
  private readonly token: string;
  constructor(config: { graphName: string; token: string }) {
    this.graphName = text(config.graphName, 'Graph name', 512);
    this.token = text(config.token, 'Backend graph token', 8192);
    if (privacy(this.graphName, this.token) !== this.graphName)
      fail('The graph name cannot contain authentication data.');
    if (/\s/.test(this.token))
      fail('Enter the raw backend graph token without spaces or a Bearer prefix.');
  }
  private async request(
    route: 'q' | 'pull' | 'pull-many' | 'write',
    body: unknown
  ): Promise<unknown> {
    jsonBody(body);
    assertNoAuthenticationData(body, this.token);
    const path = `/api/graph/${encodeURIComponent(this.graphName)}/${route}`;
    let url = `https://api.roamresearch.com${path}`;
    const http = createAxios({
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 1024 * 1024,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Authorization': `Bearer ${this.token}`
      },
      validateStatus: () => true
    });
    for (let redirect = 0; redirect <= 2; redirect++) {
      let response: { status: number; data: unknown; headers: Record<string, unknown> };
      try {
        response = await http.post(url, body);
      } catch (error) {
        throw apiError(error, route === 'write');
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.location;
        if (typeof location !== 'string' || redirect === 2)
          fail(
            'Roam routing could not be resolved safely. A write may be unresolved; inspect its target UIDs before retrying.'
          );
        let target: URL;
        try {
          target = new URL(location, url);
        } catch {
          fail('Roam returned an invalid routing URL. No redirected request was sent.');
        }
        if (
          target.protocol !== 'https:' ||
          target.username ||
          target.password ||
          target.search ||
          target.hash ||
          !/^peer-\d+\.api\.roamresearch\.com$/i.test(target.hostname) ||
          target.pathname !== path
        )
          fail(
            'Roam returned an unsupported routing destination. No credential was forwarded; inspect write targets before retrying.'
          );
        url = target.toString();
        continue;
      }
      if (response.status !== 200)
        throw apiError({ response: { status: response.status } }, route === 'write');
      assertNoAuthenticationData(response.data, this.token);
      if (route === 'write') {
        if (response.data === '' || response.data === undefined || response.data === null)
          return undefined;
        if (
          !record(response.data) ||
          response.data.ok === false ||
          response.data.error !== undefined
        )
          fail(
            'Roam returned an unrecognized write receipt. Changes may already exist; read the original target UIDs before retrying.'
          );
        return response.data;
      }
      if (!record(response.data) || !Object.hasOwn(response.data, 'result'))
        fail(
          'Roam returned an invalid read envelope. Retry the exact read; no write was sent by this read.'
        );
      return response.data.result;
    }
    fail('Roam routing failed. Inspect any write targets before retrying.');
  }
  async query(query: string, args?: unknown[]): Promise<unknown> {
    text(query, 'Datalog query', 256 * 1024, true);
    return privacy(
      await this.request('q', { query, ...(args !== undefined ? { args } : {}) }),
      this.token
    );
  }
  async pull(pattern: string, eid: string): Promise<unknown> {
    text(pattern, 'Pull selector', 64 * 1024, true);
    text(eid, 'Entity identifier', 64 * 1024, true);
    return privacy(await this.request('pull', { selector: pattern, eid }), this.token);
  }
  async pullMany(pattern: string, eids: string): Promise<unknown> {
    text(pattern, 'Pull selector', 64 * 1024, true);
    text(eids, 'Entity identifiers', 64 * 1024, true);
    return privacy(await this.request('pull-many', { selector: pattern, eids }), this.token);
  }
  async entity(uid: string): Promise<Record<string, unknown> | null> {
    text(uid, 'Page or block UID', 256);
    if (privacy(uid, this.token) !== uid)
      fail('The target UID cannot contain authentication data.');
    const value = await this.pull(selector, `[:block/uid ${ednString(uid)}]`);
    if (value === null) return null;
    if (!record(value) || value[':block/uid'] !== uid)
      fail('The read did not identify the exact requested UID. No follow-up write was sent.');
    return value;
  }
  private validate(action: WriteAction): WriteAction {
    let copy: WriteAction;
    try {
      copy = structuredClone(action);
    } catch {
      fail('Write actions must contain serializable JSON values.');
    }
    const data = 'block' in copy ? copy.block : copy.page;
    if ('uid' in data && data.uid !== undefined) text(data.uid, 'Target UID', 256);
    if (copy.action === 'create-page' || copy.action === 'update-page')
      text(copy.page.title, 'Page title');
    if (
      'string' in data &&
      data.string !== undefined &&
      (typeof data.string !== 'string' || data.string.length > 256 * 1024)
    )
      fail('Block content must be a string within 256 KiB.');
    if ('location' in copy) {
      text(copy.location['parent-uid'], 'Parent UID', 256);
      const order = copy.location.order;
      if (
        order !== 'first' &&
        order !== 'last' &&
        !(Number.isSafeInteger(order) && Number(order) >= 0)
      )
        fail('Order must be a nonnegative safe integer, first, or last.');
    }
    if (
      'heading' in data &&
      data.heading !== undefined &&
      !(Number.isInteger(data.heading) && data.heading >= 0 && data.heading <= 3)
    )
      fail('Heading must be 0, 1, 2, or 3.');
    if (copy.action === 'update-block' && Object.keys(copy.block).length === 1)
      fail('Provide at least one block property to update.');
    if (copy.action === 'create-block' || copy.action === 'create-page')
      data.uid ??= randomUUID().replace(/-/g, '').slice(0, 9);
    jsonBody(copy);
    assertNoAuthenticationData(copy, this.token);
    return copy;
  }
  private target(action: WriteAction): string {
    return String('block' in action ? action.block.uid : action.page.uid);
  }
  private receipt(action: WriteAction, previous?: Receipt): Receipt {
    const deleted = action.action === 'delete-block' || action.action === 'delete-page';
    const reset =
      deleted || action.action === 'create-block' || action.action === 'create-page';
    const fields = !reset && previous && !previous.deleted ? { ...previous.fields } : {};
    const data = 'block' in action ? action.block : action.page;
    if (!deleted)
      for (const [key, expected] of Object.entries(data)) {
        if (key !== 'uid')
          fields[`${'page' in action ? ':node' : ':block'}/${key}`] = expected;
      }
    return {
      uid: this.target(action),
      deleted,
      fields,
      ...('location' in action
        ? { location: action.location }
        : !reset && previous?.location
          ? { location: previous.location }
          : {})
    };
  }
  private async verify(
    value: Record<string, unknown> | null,
    expected: Receipt
  ): Promise<boolean> {
    if (expected.deleted) return value === null;
    if (!value || value[':block/uid'] !== expected.uid) return false;
    for (const [key, wanted] of Object.entries(expected.fields))
      if (value[key] !== wanted) return false;
    if (expected.location) {
      const parents = value[':block/_children'];
      if (
        !Array.isArray(parents) ||
        parents.length !== 1 ||
        !record(parents[0]) ||
        parents[0][':block/uid'] !== expected.location['parent-uid']
      )
        return false;
      const order = expected.location.order;
      if (typeof order === 'number' && value[':block/order'] !== order) return false;
      if (order === 'first' && value[':block/order'] !== 0) return false;
      if (order === 'last') {
        const parent = await this.entity(expected.location['parent-uid']);
        const children = parent?.[':block/children'];
        if (
          !Array.isArray(children) ||
          !children.length ||
          children.some(
            child =>
              !record(child) ||
              typeof child[':block/uid'] !== 'string' ||
              !Number.isSafeInteger(child[':block/order']) ||
              Number(child[':block/order']) < 0
          )
        )
          return false;
        const last = [...children].sort(
          (a, b) => Number(b[':block/order']) - Number(a[':block/order'])
        )[0];
        if (
          !record(last) ||
          last[':block/uid'] !== expected.uid ||
          last[':block/order'] !== value[':block/order'] ||
          new Set(children.map(child => child[':block/order'])).size !== children.length
        )
          return false;
      }
    }
    return true;
  }
  async write(action: WriteAction): Promise<WriteResult> {
    const prepared = this.validate(action);
    const uid = this.target(prepared);
    const before = await this.entity(uid);
    const creating = prepared.action === 'create-block' || prepared.action === 'create-page';
    const deleting = prepared.action === 'delete-block' || prepared.action === 'delete-page';
    if (creating && before)
      fail(
        'The requested new UID already exists. Read it before deciding on an update; no create was sent.'
      );
    if (!creating && !before) {
      if (deleting) return { success: false, targetUid: uid, verified: true };
      fail('The exact target UID does not exist. Read it before retrying; no write was sent.');
    }
    if (
      before &&
      ('page' in prepared
        ? typeof before[':node/title'] !== 'string'
        : typeof before[':block/string'] !== 'string')
    )
      fail('The UID identifies a different entity kind. No write was sent.');
    if ('location' in prepared) {
      if (prepared.location['parent-uid'] === uid) fail('A block cannot be its own parent.');
      if (!(await this.entity(prepared.location['parent-uid'])))
        fail(
          'The exact parent UID does not exist. Create or retrieve the parent first; no write was sent.'
        );
    }
    try {
      await this.request('write', prepared);
    } catch (error) {
      const status = error instanceof ServiceError ? error.data.upstreamStatus : undefined;
      throw createApiServiceError(
        `The write outcome is unresolved. Read original UID ${String(privacy(uid, this.token))} before retrying; changes may remain.`,
        { upstreamStatus: typeof status === 'number' ? status : undefined, parent: {} }
      );
    }
    try {
      const after = await this.entity(uid);
      if (!(await this.verify(after, this.receipt(prepared))))
        fail(
          `The write was accepted but its requested outcome was not confirmed. Read UID ${String(privacy(uid, this.token))} before retrying; do not blindly resend.`
        );
    } catch (error) {
      const status = error instanceof ServiceError ? error.data.upstreamStatus : undefined;
      throw createApiServiceError(
        `The write was accepted but its exact outcome remains unconfirmed. Read original UID ${String(privacy(uid, this.token))} before retrying; changes may remain.`,
        { upstreamStatus: typeof status === 'number' ? status : undefined, parent: {} }
      );
    }
    return { success: true, targetUid: uid, verified: true };
  }
  async batchWrite(
    actions: WriteAction[]
  ): Promise<{ success: boolean; targetUids: string[] }> {
    if (!actions.length || actions.length > 100)
      fail('A batch must contain between 1 and 100 actions.');
    const prepared = actions.map(action => this.validate(action));
    const finals = new Map<string, Receipt>();
    for (const action of prepared) {
      const uid = this.target(action);
      finals.set(uid, this.receipt(action, finals.get(uid)));
    }
    const kinds = new Map<string, 'page' | 'block' | null>();
    const kind = async (id: string) => {
      if (kinds.has(id)) return kinds.get(id);
      const current = await this.entity(id);
      const result =
        current === null
          ? null
          : typeof current[':node/title'] === 'string'
            ? 'page'
            : typeof current[':block/string'] === 'string'
              ? 'block'
              : undefined;
      if (result === undefined)
        fail('A batch target kind could not be established. No batch write was sent.');
      kinds.set(id, result);
      return result;
    };
    for (const action of prepared) {
      const id = this.target(action);
      const expected = 'page' in action ? 'page' : 'block';
      const current = await kind(id);
      const creating = action.action === 'create-page' || action.action === 'create-block';
      if (creating && current !== null)
        fail('A planned batch create UID already exists. No batch write was sent.');
      if (!creating && current !== expected)
        fail(
          'A batch target is absent or has a different entity kind. No batch write was sent.'
        );
      if (
        'location' in action &&
        (action.location['parent-uid'] === id || !(await kind(action.location['parent-uid'])))
      )
        fail('A batch parent is absent or invalid. No batch write was sent.');
      kinds.set(
        id,
        action.action === 'delete-page' || action.action === 'delete-block' ? null : expected
      );
    }
    const targetUids = [...finals.keys()];
    try {
      await this.request('write', { action: 'batch-actions', actions: prepared });
      for (const [uid, action] of finals) {
        const value = await this.entity(uid);
        if (!(await this.verify(value, action)))
          fail(
            'The batch was accepted but final target readback did not match. Inspect every original target UID before retrying; earlier actions may remain.'
          );
      }
    } catch (error) {
      const status = error instanceof ServiceError ? error.data.upstreamStatus : undefined;
      throw createApiServiceError(
        `The batch outcome is unresolved and changes may remain. Read these original target UIDs before retrying: ${targetUids.map(uid => String(privacy(uid, this.token))).join(', ')}. Never blindly resend the entire batch.`,
        { upstreamStatus: typeof status === 'number' ? status : undefined, parent: {} }
      );
    }
    return { success: true, targetUids };
  }
  createBlock(location: BlockLocation, block: BlockData) {
    return this.write({
      action: 'create-block',
      location: { 'parent-uid': location.parentUid, order: location.order },
      block: {
        string: block.string,
        ...(block.uid !== undefined ? { uid: block.uid } : {}),
        ...(block.open !== undefined ? { open: block.open } : {}),
        ...(block.heading !== undefined ? { heading: block.heading } : {}),
        ...(block.textAlign !== undefined ? { 'text-align': block.textAlign } : {}),
        ...(block.childrenViewType !== undefined
          ? { 'children-view-type': block.childrenViewType }
          : {})
      }
    });
  }
  updateBlock(uid: string, updates: Omit<BlockData, 'uid' | 'string'> & { string?: string }) {
    return this.write({
      action: 'update-block',
      block: {
        uid,
        ...(updates.string !== undefined ? { string: updates.string } : {}),
        ...(updates.open !== undefined ? { open: updates.open } : {}),
        ...(updates.heading !== undefined ? { heading: updates.heading } : {}),
        ...(updates.textAlign !== undefined ? { 'text-align': updates.textAlign } : {}),
        ...(updates.childrenViewType !== undefined
          ? { 'children-view-type': updates.childrenViewType }
          : {})
      }
    });
  }
  moveBlock(uid: string, location: BlockLocation) {
    return this.write({
      action: 'move-block',
      location: { 'parent-uid': location.parentUid, order: location.order },
      block: { uid }
    });
  }
  deleteBlock(uid: string) {
    return this.write({ action: 'delete-block', block: { uid } });
  }
  createPage(title: string, uid?: string) {
    return this.write({
      action: 'create-page',
      page: { title, ...(uid !== undefined ? { uid } : {}) }
    });
  }
  updatePage(uid: string, title: string) {
    return this.write({ action: 'update-page', page: { uid, title } });
  }
  deletePage(uid: string) {
    return this.write({ action: 'delete-page', page: { uid } });
  }
}
