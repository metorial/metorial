import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.monday.com/v2'
});

export class MondayClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      Authorization: this.token,
      'Content-Type': 'application/json',
      'API-Version': '2025-04'
    };
  }

  async query(graphqlQuery: string, variables?: Record<string, any>): Promise<any> {
    let body: Record<string, any> = { query: graphqlQuery };
    if (variables) {
      body.variables = variables;
    }

    let response = await api.post('', body, {
      headers: this.headers
    });

    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(
        `Monday.com API error: ${response.data.errors.map((e: any) => e.message).join(', ')}`
      );
    }

    return response.data.data;
  }

  // ==================== Boards ====================

  async getBoards(options?: {
    ids?: string[];
    limit?: number;
    page?: number;
    state?: string;
    boardKind?: string;
    workspaceIds?: string[];
  }): Promise<any[]> {
    let args: string[] = [];
    if (options?.ids?.length) args.push(`ids: [${options.ids.join(', ')}]`);
    if (options?.limit) args.push(`limit: ${options.limit}`);
    if (options?.page) args.push(`page: ${options.page}`);
    if (options?.state) args.push(`state: ${options.state}`);
    if (options?.boardKind) args.push(`board_kind: ${options.boardKind}`);
    if (options?.workspaceIds?.length)
      args.push(`workspace_ids: [${options.workspaceIds.join(', ')}]`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '';
    let data = await this.query(
      `{ boards${argsStr} { id name description state board_kind workspace_id columns { id title type } groups { id title color } owners { id name } } }`
    );
    return data.boards;
  }

  async createBoard(params: {
    boardName: string;
    boardKind: string;
    description?: string;
    workspaceId?: string;
    folderId?: string;
    templateId?: string;
  }): Promise<any> {
    let args: string[] = [
      `board_name: "${this.escapeGraphQL(params.boardName)}"`,
      `board_kind: ${params.boardKind}`
    ];
    if (params.description)
      args.push(`description: "${this.escapeGraphQL(params.description)}"`);
    if (params.workspaceId) args.push(`workspace_id: ${params.workspaceId}`);
    if (params.folderId) args.push(`folder_id: ${params.folderId}`);
    if (params.templateId) args.push(`template_id: ${params.templateId}`);

    let data = await this.query(
      `mutation { create_board(${args.join(', ')}) { id name description state board_kind } }`
    );
    return data.create_board;
  }

  async updateBoard(boardId: string, attribute: string, newValue: string): Promise<any> {
    let data = await this.query(
      `mutation { update_board(board_id: ${boardId}, board_attribute: ${attribute}, new_value: "${this.escapeGraphQL(newValue)}") }`
    );
    return data.update_board;
  }

  async archiveBoard(boardId: string): Promise<any> {
    let data = await this.query(
      `mutation { archive_board(board_id: ${boardId}) { id name state } }`
    );
    return data.archive_board;
  }

  async deleteBoard(boardId: string): Promise<any> {
    let data = await this.query(`mutation { delete_board(board_id: ${boardId}) { id } }`);
    return data.delete_board;
  }

  // ==================== Items ====================

  async getItems(ids: string[]): Promise<any[]> {
    let data = await this.query(
      `{ items(ids: [${ids.join(', ')}]) { id name state created_at updated_at group { id title } board { id name } column_values { id type text value } subitems { id name } } }`
    );
    return data.items;
  }

  async getBoardItems(
    boardId: string,
    options?: {
      limit?: number;
      cursor?: string;
      groupId?: string;
      queryParams?: { rules: any[]; operator?: string };
    }
  ): Promise<{ items: any[]; cursor: string | null }> {
    let itemsPageArgs: string[] = [];
    if (options?.limit) itemsPageArgs.push(`limit: ${options.limit}`);
    if (options?.cursor) itemsPageArgs.push(`cursor: "${options.cursor}"`);
    if (options?.queryParams) {
      let rules = JSON.stringify(options.queryParams.rules).replace(/"([^"]+)":/g, '$1:');
      let op = options.queryParams.operator || 'and';
      itemsPageArgs.push(`query_params: {rules: ${rules}, operator: ${op}}`);
    }

    let itemsPageArgsStr = itemsPageArgs.length > 0 ? `(${itemsPageArgs.join(', ')})` : '';

    if (options?.groupId) {
      let data = await this.query(
        `{ boards(ids: [${boardId}]) { groups(ids: ["${this.escapeGraphQL(options.groupId)}"]) { items_page${itemsPageArgsStr} { cursor items { id name state created_at updated_at group { id title } column_values { id type text value } subitems { id name } } } } } }`
      );
      let group = data.boards?.[0]?.groups?.[0];
      return {
        items: group?.items_page?.items || [],
        cursor: group?.items_page?.cursor || null
      };
    }

    let data = await this.query(
      `{ boards(ids: [${boardId}]) { items_page${itemsPageArgsStr} { cursor items { id name state created_at updated_at group { id title } column_values { id type text value } subitems { id name } } } } }`
    );
    let board = data.boards?.[0];
    return {
      items: board?.items_page?.items || [],
      cursor: board?.items_page?.cursor || null
    };
  }

  async createItem(params: {
    boardId: string;
    itemName: string;
    groupId?: string;
    columnValues?: Record<string, any>;
    createLabelsIfMissing?: boolean;
  }): Promise<any> {
    let variables: Record<string, any> = {
      boardId: Number(params.boardId),
      itemName: params.itemName
    };
    let varDefs = ['$boardId: ID!', '$itemName: String!'];
    let mutationArgs = ['board_id: $boardId', 'item_name: $itemName'];

    if (params.groupId) {
      variables.groupId = params.groupId;
      varDefs.push('$groupId: String');
      mutationArgs.push('group_id: $groupId');
    }
    if (params.columnValues) {
      variables.columnValues = JSON.stringify(params.columnValues);
      varDefs.push('$columnValues: JSON');
      mutationArgs.push('column_values: $columnValues');
    }
    if (params.createLabelsIfMissing) {
      mutationArgs.push('create_labels_if_missing: true');
    }

    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { create_item(${mutationArgs.join(', ')}) { id name group { id title } column_values { id type text value } } }`,
      variables
    );
    return data.create_item;
  }

  async updateColumnValues(
    boardId: string,
    itemId: string,
    columnValues: Record<string, any>,
    createLabelsIfMissing?: boolean
  ): Promise<any> {
    let variables: Record<string, any> = {
      boardId: Number(boardId),
      itemId: Number(itemId),
      columnValues: JSON.stringify(columnValues)
    };
    let labelsArg = createLabelsIfMissing ? ', create_labels_if_missing: true' : '';
    let data = await this.query(
      `mutation($boardId: ID!, $itemId: ID!, $columnValues: JSON!) { change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues${labelsArg}) { id name column_values { id type text value } } }`,
      variables
    );
    return data.change_multiple_column_values;
  }

  async moveItemToGroup(itemId: string, groupId: string): Promise<any> {
    let data = await this.query(
      `mutation { move_item_to_group(item_id: ${itemId}, group_id: "${this.escapeGraphQL(groupId)}") { id name group { id title } } }`
    );
    return data.move_item_to_group;
  }

  async archiveItem(itemId: string): Promise<any> {
    let data = await this.query(
      `mutation { archive_item(item_id: ${itemId}) { id name state } }`
    );
    return data.archive_item;
  }

  async deleteItem(itemId: string): Promise<any> {
    let data = await this.query(`mutation { delete_item(item_id: ${itemId}) { id } }`);
    return data.delete_item;
  }

  // ==================== Sub-items ====================

  async createSubitem(params: {
    parentItemId: string;
    itemName: string;
    columnValues?: Record<string, any>;
    createLabelsIfMissing?: boolean;
  }): Promise<any> {
    let variables: Record<string, any> = {
      parentItemId: Number(params.parentItemId),
      itemName: params.itemName
    };
    let varDefs = ['$parentItemId: ID!', '$itemName: String!'];
    let mutationArgs = ['parent_item_id: $parentItemId', 'item_name: $itemName'];

    if (params.columnValues) {
      variables.columnValues = JSON.stringify(params.columnValues);
      varDefs.push('$columnValues: JSON');
      mutationArgs.push('column_values: $columnValues');
    }
    if (params.createLabelsIfMissing) {
      mutationArgs.push('create_labels_if_missing: true');
    }

    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { create_subitem(parent_item_id: $parentItemId, item_name: $itemName${params.columnValues ? ', column_values: $columnValues' : ''}${params.createLabelsIfMissing ? ', create_labels_if_missing: true' : ''}) { id name column_values { id type text value } } }`,
      variables
    );
    return data.create_subitem;
  }

  // ==================== Groups ====================

  async getGroups(boardId: string): Promise<any[]> {
    let data = await this.query(
      `{ boards(ids: [${boardId}]) { groups { id title color archived deleted position } } }`
    );
    return data.boards?.[0]?.groups || [];
  }

  async createGroup(
    boardId: string,
    groupName: string,
    options?: { color?: string }
  ): Promise<any> {
    let args = [`board_id: ${boardId}`, `group_name: "${this.escapeGraphQL(groupName)}"`];
    if (options?.color) args.push(`group_color: "${this.escapeGraphQL(options.color)}"`);

    let data = await this.query(
      `mutation { create_group(${args.join(', ')}) { id title color } }`
    );
    return data.create_group;
  }

  async updateGroup(
    boardId: string,
    groupId: string,
    attribute: string,
    newValue: string
  ): Promise<any> {
    let data = await this.query(
      `mutation { update_group(board_id: ${boardId}, group_id: "${this.escapeGraphQL(groupId)}", group_attribute: ${attribute}, new_value: "${this.escapeGraphQL(newValue)}") { id title color } }`
    );
    return data.update_group;
  }

  async deleteGroup(boardId: string, groupId: string): Promise<any> {
    let data = await this.query(
      `mutation { delete_group(board_id: ${boardId}, group_id: "${this.escapeGraphQL(groupId)}") { id } }`
    );
    return data.delete_group;
  }

  async archiveGroup(boardId: string, groupId: string): Promise<any> {
    let data = await this.query(
      `mutation { archive_group(board_id: ${boardId}, group_id: "${this.escapeGraphQL(groupId)}") { id } }`
    );
    return data.archive_group;
  }

  // ==================== Columns ====================

  async getColumns(boardId: string): Promise<any[]> {
    let data = await this.query(
      `{ boards(ids: [${boardId}]) { columns { id title type description settings_str } } }`
    );
    return data.boards?.[0]?.columns || [];
  }

  async createColumn(
    boardId: string,
    title: string,
    columnType: string,
    options?: { description?: string; defaults?: string }
  ): Promise<any> {
    let args = [
      `board_id: ${boardId}`,
      `title: "${this.escapeGraphQL(title)}"`,
      `column_type: ${columnType}`
    ];
    if (options?.description)
      args.push(`description: "${this.escapeGraphQL(options.description)}"`);
    if (options?.defaults) args.push(`defaults: ${JSON.stringify(options.defaults)}`);

    let data = await this.query(
      `mutation { create_column(${args.join(', ')}) { id title type description } }`
    );
    return data.create_column;
  }

  async deleteColumn(boardId: string, columnId: string): Promise<any> {
    let data = await this.query(
      `mutation { delete_column(board_id: ${boardId}, column_id: "${this.escapeGraphQL(columnId)}") { id } }`
    );
    return data.delete_column;
  }

  // ==================== Updates ====================

  async getUpdates(options?: {
    ids?: string[];
    limit?: number;
    page?: number;
  }): Promise<any[]> {
    let args: string[] = [];
    if (options?.ids?.length) args.push(`ids: [${options.ids.join(', ')}]`);
    if (options?.limit) args.push(`limit: ${options.limit}`);
    if (options?.page) args.push(`page: ${options.page}`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '';
    let data = await this.query(
      `{ updates${argsStr} { id body text_body created_at updated_at creator_id creator { id name } item_id replies { id body text_body created_at creator_id } } }`
    );
    return data.updates;
  }

  async getItemUpdates(itemId: string, limit?: number): Promise<any[]> {
    let limitStr = limit ? `(limit: ${limit})` : '';
    let data = await this.query(
      `{ items(ids: [${itemId}]) { updates${limitStr} { id body text_body created_at updated_at creator_id creator { id name } replies { id body text_body created_at creator_id } } } }`
    );
    return data.items?.[0]?.updates || [];
  }

  async createUpdate(itemId: string, body: string, parentUpdateId?: string): Promise<any> {
    let variables: Record<string, any> = {
      itemId: Number(itemId),
      body: body
    };
    let varDefs = ['$itemId: ID!', '$body: String!'];
    let mutationArgs = ['item_id: $itemId', 'body: $body'];

    if (parentUpdateId) {
      variables.parentId = Number(parentUpdateId);
      varDefs.push('$parentId: ID');
      mutationArgs.push('parent_id: $parentId');
    }

    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { create_update(${mutationArgs.join(', ')}) { id body text_body created_at creator_id } }`,
      variables
    );
    return data.create_update;
  }

  async deleteUpdate(updateId: string): Promise<any> {
    let data = await this.query(`mutation { delete_update(id: ${updateId}) { id } }`);
    return data.delete_update;
  }

  // ==================== Users ====================

  async getUsers(options?: {
    ids?: string[];
    limit?: number;
    page?: number;
    emails?: string[];
    name?: string;
  }): Promise<any[]> {
    let args: string[] = [];
    if (options?.ids?.length) args.push(`ids: [${options.ids.join(', ')}]`);
    if (options?.limit) args.push(`limit: ${options.limit}`);
    if (options?.page) args.push(`page: ${options.page}`);
    if (options?.emails?.length)
      args.push(
        `emails: [${options.emails.map(e => `"${this.escapeGraphQL(e)}"`).join(', ')}]`
      );
    if (options?.name) args.push(`name: "${this.escapeGraphQL(options.name)}"`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '';
    let data = await this.query(
      `{ users${argsStr} { id name email url title phone mobile_phone location enabled is_admin is_guest created_at photo_original teams { id name } } }`
    );
    return data.users;
  }

  async getMe(): Promise<any> {
    let data = await this.query(
      `{ me { id name email url title phone mobile_phone location enabled is_admin created_at photo_original account { id name } teams { id name } } }`
    );
    return data.me;
  }

  // ==================== Teams ====================

  async getTeams(ids?: string[]): Promise<any[]> {
    let argsStr = ids?.length ? `(ids: [${ids.join(', ')}])` : '';
    let data = await this.query(
      `{ teams${argsStr} { id name picture_url owners { id name } users { id name } } }`
    );
    return data.teams;
  }

  // ==================== Workspaces ====================

  async getWorkspaces(options?: {
    ids?: string[];
    limit?: number;
    page?: number;
    kind?: string;
  }): Promise<any[]> {
    let args: string[] = [];
    if (options?.ids?.length) args.push(`ids: [${options.ids.join(', ')}]`);
    if (options?.limit) args.push(`limit: ${options.limit}`);
    if (options?.page) args.push(`page: ${options.page}`);
    if (options?.kind) args.push(`kind: ${options.kind}`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '';
    let data = await this.query(
      `{ workspaces${argsStr} { id name kind description created_at state is_default_workspace } }`
    );
    return data.workspaces;
  }

  async createWorkspace(name: string, kind: string, description?: string): Promise<any> {
    let args = [`name: "${this.escapeGraphQL(name)}"`, `kind: ${kind}`];
    if (description) args.push(`description: "${this.escapeGraphQL(description)}"`);

    let data = await this.query(
      `mutation { create_workspace(${args.join(', ')}) { id name kind description } }`
    );
    return data.create_workspace;
  }

  async updateWorkspace(
    workspaceId: string,
    attributes: { name?: string; description?: string }
  ): Promise<any> {
    let attrParts: string[] = [];
    if (attributes.name) attrParts.push(`name: "${this.escapeGraphQL(attributes.name)}"`);
    if (attributes.description)
      attrParts.push(`description: "${this.escapeGraphQL(attributes.description)}"`);

    if (attrParts.length === 0) return null;

    let data = await this.query(
      `mutation { update_workspace(id: ${workspaceId}, attributes: {${attrParts.join(', ')}}) { id name description } }`
    );
    return data.update_workspace;
  }

  async deleteWorkspace(workspaceId: string): Promise<any> {
    let data = await this.query(
      `mutation { delete_workspace(workspace_id: ${workspaceId}) { id } }`
    );
    return data.delete_workspace;
  }

  // ==================== Tags ====================

  async getTags(): Promise<any[]> {
    let data = await this.query(`{ tags { id name color } }`);
    return data.tags;
  }

  // ==================== Webhooks ====================

  async getWebhooks(boardId: string): Promise<any[]> {
    let data = await this.query(
      `{ webhooks(board_id: ${boardId}) { id event board_id config } }`
    );
    return data.webhooks;
  }

  async createWebhook(
    boardId: string,
    url: string,
    event: string,
    config?: Record<string, any>
  ): Promise<any> {
    let args = [
      `board_id: ${boardId}`,
      `url: "${this.escapeGraphQL(url)}"`,
      `event: ${event}`
    ];
    if (config) args.push(`config: "${this.escapeGraphQL(JSON.stringify(config))}"`);

    let data = await this.query(
      `mutation { create_webhook(${args.join(', ')}) { id board_id } }`
    );
    return data.create_webhook;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let data = await this.query(`mutation { delete_webhook(id: ${webhookId}) { id } }`);
    return data.delete_webhook;
  }

  // ==================== Notifications ====================

  async createNotification(
    userId: string,
    targetId: string,
    text: string,
    targetType: string
  ): Promise<any> {
    let variables = {
      userId: Number(userId),
      targetId: Number(targetId),
      text: text
    };
    let data = await this.query(
      `mutation($userId: ID!, $targetId: ID!, $text: String!) { create_notification(user_id: $userId, target_id: $targetId, text: $text, target_type: ${targetType}) { text } }`,
      variables
    );
    return data.create_notification;
  }

  // ==================== Activity Logs ====================

  async getActivityLogs(
    boardIds: string[],
    options?: { limit?: number; page?: number; from?: string; to?: string }
  ): Promise<any[]> {
    let args: string[] = [`board_ids: [${boardIds.join(', ')}]`];
    if (options?.limit) args.push(`limit: ${options.limit}`);
    if (options?.page) args.push(`page: ${options.page}`);
    if (options?.from) args.push(`from: "${options.from}"`);
    if (options?.to) args.push(`to: "${options.to}"`);

    let data = await this.query(
      `{ boards(ids: [${boardIds.join(', ')}]) { activity_logs(${args.slice(0).join(', ')}) { id event data entity account_id created_at user_id } } }`
    );
    return data.boards?.flatMap((b: any) => b.activity_logs || []) || [];
  }

  // ==================== Helpers ====================

  private escapeGraphQL(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }
}
