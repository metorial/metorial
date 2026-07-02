import { createAxios } from 'slates';

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

export class RoamClient {
  private graphName: string;
  private token: string;

  constructor(config: { graphName: string; token: string }) {
    this.graphName = config.graphName;
    this.token = config.token;
  }

  private getAxios() {
    return createAxios({
      baseURL: `https://api.roamresearch.com/api/graph/${this.graphName}`,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Authorization': `Bearer ${this.token}`
      }
    });
  }

  async query(query: string, args?: unknown[]): Promise<unknown> {
    let http = this.getAxios();
    let body: Record<string, unknown> = { query };
    if (args && args.length > 0) {
      body.args = args;
    }
    let response = await http.post('/q', body);
    return response.data?.result ?? response.data;
  }

  async pull(selector: string, eid: string): Promise<unknown> {
    let http = this.getAxios();
    let response = await http.post('/pull', { selector, eid });
    return response.data?.result ?? response.data;
  }

  async pullMany(selector: string, eids: string): Promise<unknown> {
    let http = this.getAxios();
    let response = await http.post('/pull-many', { selector, eids });
    return response.data?.result ?? response.data;
  }

  async write(action: WriteAction): Promise<{ success: boolean }> {
    let http = this.getAxios();
    let response = await http.post('/write', action);
    return { success: response.data?.ok ?? true };
  }

  async batchWrite(actions: WriteAction[]): Promise<{ success: boolean }> {
    let http = this.getAxios();
    let response = await http.post('/write', {
      action: 'batch-actions',
      actions
    });
    return { success: response.data?.ok ?? true };
  }

  async createBlock(location: BlockLocation, block: BlockData): Promise<{ success: boolean }> {
    let action: CreateBlockAction = {
      action: 'create-block',
      location: {
        'parent-uid': location.parentUid,
        order: location.order
      },
      block: {
        string: block.string,
        ...(block.uid ? { uid: block.uid } : {}),
        ...(block.open !== undefined ? { open: block.open } : {}),
        ...(block.heading ? { heading: block.heading } : {}),
        ...(block.textAlign ? { 'text-align': block.textAlign } : {}),
        ...(block.childrenViewType ? { 'children-view-type': block.childrenViewType } : {})
      }
    };
    return this.write(action);
  }

  async updateBlock(
    uid: string,
    updates: {
      string?: string;
      open?: boolean;
      heading?: number;
      textAlign?: string;
      childrenViewType?: string;
    }
  ): Promise<{ success: boolean }> {
    let action: UpdateBlockAction = {
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
    };
    return this.write(action);
  }

  async moveBlock(uid: string, location: BlockLocation): Promise<{ success: boolean }> {
    let action: MoveBlockAction = {
      action: 'move-block',
      location: {
        'parent-uid': location.parentUid,
        order: location.order
      },
      block: { uid }
    };
    return this.write(action);
  }

  async deleteBlock(uid: string): Promise<{ success: boolean }> {
    let action: DeleteBlockAction = {
      action: 'delete-block',
      block: { uid }
    };
    return this.write(action);
  }

  async createPage(title: string, uid?: string): Promise<{ success: boolean }> {
    let action: CreatePageAction = {
      action: 'create-page',
      page: {
        title,
        ...(uid ? { uid } : {})
      }
    };
    return this.write(action);
  }

  async updatePage(uid: string, title: string): Promise<{ success: boolean }> {
    let action: UpdatePageAction = {
      action: 'update-page',
      page: { uid, title }
    };
    return this.write(action);
  }

  async deletePage(uid: string): Promise<{ success: boolean }> {
    let action: DeletePageAction = {
      action: 'delete-page',
      page: { uid }
    };
    return this.write(action);
  }
}
