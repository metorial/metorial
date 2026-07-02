import { createAxios } from 'slates';
import { mondayApiError, mondayGraphQLError } from './errors';

let api = createAxios({
  baseURL: 'https://api.monday.com/v2'
});

type ItemFilterRule = {
  column_id: string;
  compare_value?: unknown;
  operator?: string;
};

type ItemOrderBy = {
  column_id: string;
  direction?: string;
};

type ColumnMapping = {
  source: string;
  target?: string | null;
};

type DynamicPosition = {
  object_id: string;
  object_type: string;
  is_after?: boolean;
};

type FolderPosition = DynamicPosition;

export class MondayClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      Authorization: this.token,
      'Content-Type': 'application/json',
      'API-Version': '2026-04'
    };
  }

  async query(
    graphqlQuery: string,
    variables?: Record<string, any>,
    operation = 'request'
  ): Promise<any> {
    let body: Record<string, any> = { query: graphqlQuery };
    if (variables) {
      body.variables = variables;
    }

    let response: any;
    try {
      response = await api.post('', body, {
        headers: this.headers
      });
    } catch (error) {
      throw mondayApiError(error, operation);
    }

    if (response.data.errors && response.data.errors.length > 0) {
      throw mondayGraphQLError(response.data.errors, operation);
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
    empty?: boolean;
    prompt?: string;
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
    if (params.empty !== undefined) args.push(`empty: ${params.empty}`);
    if (params.prompt) args.push(`prompt: "${this.escapeGraphQL(params.prompt)}"`);

    let data = await this.query(
      `mutation { create_board(${args.join(', ')}) { id name description state board_kind workspace_id } }`,
      undefined,
      'create board'
    );
    return data.create_board;
  }

  async updateBoard(boardId: string, attribute: string, newValue: string): Promise<any> {
    let data = await this.query(
      `mutation($boardId: ID!, $newValue: String!) { update_board(board_id: $boardId, board_attribute: ${attribute}, new_value: $newValue) }`,
      { boardId, newValue },
      'update board'
    );
    return data.update_board;
  }

  async archiveBoard(boardId: string): Promise<any> {
    let data = await this.query(
      `mutation($boardId: ID!) { archive_board(board_id: $boardId) { id name state } }`,
      { boardId },
      'archive board'
    );
    return data.archive_board;
  }

  async deleteBoard(boardId: string): Promise<any> {
    let data = await this.query(
      `mutation($boardId: ID!) { delete_board(board_id: $boardId) { id } }`,
      { boardId },
      'delete board'
    );
    return data.delete_board;
  }

  async duplicateBoard(params: {
    boardId: string;
    duplicateType: string;
    boardName?: string;
    workspaceId?: string;
    folderId?: string;
    keepSubscribers?: boolean;
  }): Promise<any> {
    let varDefs = ['$boardId: ID!'];
    let args = ['board_id: $boardId', `duplicate_type: ${params.duplicateType}`];
    let variables: Record<string, any> = {
      boardId: params.boardId
    };

    if (params.boardName) {
      variables.boardName = params.boardName;
      varDefs.push('$boardName: String');
      args.push('board_name: $boardName');
    }
    if (params.workspaceId) {
      variables.workspaceId = params.workspaceId;
      varDefs.push('$workspaceId: ID');
      args.push('workspace_id: $workspaceId');
    }
    if (params.folderId) {
      variables.folderId = params.folderId;
      varDefs.push('$folderId: ID');
      args.push('folder_id: $folderId');
    }
    if (params.keepSubscribers !== undefined) {
      variables.keepSubscribers = params.keepSubscribers;
      varDefs.push('$keepSubscribers: Boolean');
      args.push('keep_subscribers: $keepSubscribers');
    }

    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { duplicate_board(${args.join(', ')}) { board { id name description state board_kind workspace_id } } }`,
      variables,
      'duplicate board'
    );
    return data.duplicate_board?.board;
  }

  async updateBoardHierarchy(
    boardId: string,
    attributes: {
      workspace_id?: string;
      folder_id?: string;
      account_product_id?: string;
      position?: DynamicPosition;
    }
  ): Promise<any> {
    let data = await this.query(
      `mutation($boardId: ID!, $attributes: UpdateBoardHierarchyAttributesInput!) { update_board_hierarchy(board_id: $boardId, attributes: $attributes) { success } }`,
      { boardId, attributes },
      'update board hierarchy'
    );
    return data.update_board_hierarchy;
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
      queryParams?: {
        rules?: ItemFilterRule[];
        operator?: string;
        order_by?: ItemOrderBy[];
      };
      hierarchyScopeConfig?: string;
    }
  ): Promise<{ items: any[]; cursor: string | null }> {
    let itemsPageArgs: string[] = [];
    let variables: Record<string, any> = {
      boardId
    };
    let varDefs = ['$boardId: ID!'];

    if (options?.limit) {
      variables.limit = options.limit;
      varDefs.push('$limit: Int');
      itemsPageArgs.push('limit: $limit');
    }
    if (options?.cursor) {
      variables.cursor = options.cursor;
      varDefs.push('$cursor: String');
      itemsPageArgs.push('cursor: $cursor');
    }
    if (options?.queryParams) {
      variables.queryParams = options.queryParams;
      varDefs.push('$queryParams: ItemsQuery');
      itemsPageArgs.push('query_params: $queryParams');
    }
    if (options?.hierarchyScopeConfig) {
      variables.hierarchyScopeConfig = options.hierarchyScopeConfig;
      varDefs.push('$hierarchyScopeConfig: String');
      itemsPageArgs.push('hierarchy_scope_config: $hierarchyScopeConfig');
    }

    let itemsPageArgsStr = itemsPageArgs.length > 0 ? `(${itemsPageArgs.join(', ')})` : '';

    if (options?.groupId) {
      variables.groupId = options.groupId;
      varDefs.push('$groupId: String!');
      let data = await this.query(
        `query(${varDefs.join(', ')}) { boards(ids: [$boardId]) { groups(ids: [$groupId]) { items_page${itemsPageArgsStr} { cursor items { id name state created_at updated_at group { id title } column_values { id type text value } subitems { id name } } } } } }`,
        variables,
        'get board group items'
      );
      let group = data.boards?.[0]?.groups?.[0];
      return {
        items: group?.items_page?.items || [],
        cursor: group?.items_page?.cursor || null
      };
    }

    let data = await this.query(
      `query(${varDefs.join(', ')}) { boards(ids: [$boardId]) { items_page${itemsPageArgsStr} { cursor items { id name state created_at updated_at group { id title } column_values { id type text value } subitems { id name } } } } }`,
      variables,
      'get board items'
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
      variables,
      'create item'
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
      variables,
      'update item column values'
    );
    return data.change_multiple_column_values;
  }

  async moveItemToGroup(itemId: string, groupId: string): Promise<any> {
    let data = await this.query(
      `mutation($itemId: ID!, $groupId: String!) { move_item_to_group(item_id: $itemId, group_id: $groupId) { id name group { id title } } }`,
      { itemId, groupId },
      'move item to group'
    );
    return data.move_item_to_group;
  }

  async duplicateItem(
    boardId: string,
    itemId: string,
    options?: { withUpdates?: boolean }
  ): Promise<any> {
    let data = await this.query(
      `mutation($boardId: ID!, $itemId: ID!, $withUpdates: Boolean) { duplicate_item(board_id: $boardId, item_id: $itemId, with_updates: $withUpdates) { id name state group { id title } column_values { id type text value } } }`,
      { boardId, itemId, withUpdates: options?.withUpdates },
      'duplicate item'
    );
    return data.duplicate_item;
  }

  async changeItemPosition(
    itemId: string,
    options:
      | {
          relativeTo: string;
          positionRelativeMethod: string;
        }
      | {
          groupId: string;
          groupTop: boolean;
        }
  ): Promise<any> {
    if ('relativeTo' in options) {
      let data = await this.query(
        `mutation($itemId: ID!, $relativeTo: ID!) { change_item_position(item_id: $itemId, relative_to: $relativeTo, position_relative_method: ${options.positionRelativeMethod}) { id name group { id title } } }`,
        { itemId, relativeTo: options.relativeTo },
        'change item position'
      );
      return data.change_item_position;
    }

    let data = await this.query(
      `mutation($itemId: ID!, $groupId: ID!, $groupTop: Boolean!) { change_item_position(item_id: $itemId, group_id: $groupId, group_top: $groupTop) { id name group { id title } } }`,
      { itemId, groupId: options.groupId, groupTop: options.groupTop },
      'change item position'
    );
    return data.change_item_position;
  }

  async moveItemToBoard(params: {
    itemId: string;
    boardId: string;
    groupId: string;
    columnsMapping?: ColumnMapping[];
    subitemsColumnsMapping?: ColumnMapping[];
  }): Promise<any> {
    let varDefs = ['$itemId: ID!', '$boardId: ID!', '$groupId: ID!'];
    let args = ['item_id: $itemId', 'board_id: $boardId', 'group_id: $groupId'];
    let variables: Record<string, any> = {
      itemId: params.itemId,
      boardId: params.boardId,
      groupId: params.groupId
    };

    if (params.columnsMapping) {
      variables.columnsMapping = params.columnsMapping;
      varDefs.push('$columnsMapping: [ColumnMappingInput!]');
      args.push('columns_mapping: $columnsMapping');
    }
    if (params.subitemsColumnsMapping) {
      variables.subitemsColumnsMapping = params.subitemsColumnsMapping;
      varDefs.push('$subitemsColumnsMapping: [ColumnMappingInput!]');
      args.push('subitems_columns_mapping: $subitemsColumnsMapping');
    }

    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { move_item_to_board(${args.join(', ')}) { id name board { id name } group { id title } } }`,
      variables,
      'move item to board'
    );
    return data.move_item_to_board;
  }

  async setItemDescriptionContent(itemId: string, markdown: string): Promise<any> {
    let data = await this.query(
      `mutation($itemId: ID!, $markdown: String!) { set_item_description_content(item_id: $itemId, markdown: $markdown) { success error block_ids } }`,
      { itemId, markdown },
      'set item description content'
    );
    return data.set_item_description_content;
  }

  async archiveItem(itemId: string): Promise<any> {
    let data = await this.query(
      `mutation($itemId: ID!) { archive_item(item_id: $itemId) { id name state } }`,
      { itemId },
      'archive item'
    );
    return data.archive_item;
  }

  async deleteItem(itemId: string): Promise<any> {
    let data = await this.query(
      `mutation($itemId: ID!) { delete_item(item_id: $itemId) { id } }`,
      { itemId },
      'delete item'
    );
    return data.delete_item;
  }

  async clearItemUpdates(itemId: string): Promise<any> {
    let data = await this.query(
      `mutation($itemId: ID!) { clear_item_updates(item_id: $itemId) { id } }`,
      { itemId },
      'clear item updates'
    );
    return data.clear_item_updates;
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
      variables,
      'create subitem'
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
      `query($boardId: ID!) { boards(ids: [$boardId]) { columns { id title type description settings revision width archived } } }`,
      { boardId },
      'get columns'
    );
    return data.boards?.[0]?.columns || [];
  }

  async createColumn(
    boardId: string,
    title: string,
    columnType: string,
    options?: {
      description?: string;
      defaults?: unknown;
      afterColumnId?: string;
      customColumnId?: string;
    }
  ): Promise<any> {
    let variables: Record<string, any> = {
      boardId,
      title
    };
    let varDefs = ['$boardId: ID!', '$title: String!'];
    let args = ['board_id: $boardId', 'title: $title', `column_type: ${columnType}`];

    if (options?.description) {
      variables.description = options.description;
      varDefs.push('$description: String');
      args.push('description: $description');
    }
    if (options?.defaults !== undefined) {
      variables.defaults =
        typeof options.defaults === 'string'
          ? options.defaults
          : JSON.stringify(options.defaults);
      varDefs.push('$defaults: JSON');
      args.push('defaults: $defaults');
    }
    if (options?.afterColumnId) {
      variables.afterColumnId = options.afterColumnId;
      varDefs.push('$afterColumnId: ID');
      args.push('after_column_id: $afterColumnId');
    }
    if (options?.customColumnId) {
      variables.customColumnId = options.customColumnId;
      varDefs.push('$customColumnId: String');
      args.push('id: $customColumnId');
    }

    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { create_column(${args.join(', ')}) { id title type description settings revision width archived } }`,
      variables,
      'create column'
    );
    return data.create_column;
  }

  async changeColumnMetadata(
    boardId: string,
    columnId: string,
    property: string,
    value: string
  ): Promise<any> {
    let data = await this.query(
      `mutation($boardId: ID!, $columnId: String!, $value: String!) { change_column_metadata(board_id: $boardId, column_id: $columnId, column_property: ${property}, value: $value) { id title type description settings revision width archived } }`,
      { boardId, columnId, value },
      'change column metadata'
    );
    return data.change_column_metadata;
  }

  async deleteColumn(boardId: string, columnId: string): Promise<any> {
    let data = await this.query(
      `mutation($boardId: ID!, $columnId: String!) { delete_column(board_id: $boardId, column_id: $columnId) { id } }`,
      { boardId, columnId },
      'delete column'
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
      `{ updates${argsStr} { id body text_body created_at updated_at creator_id creator { id name } item_id replies { id body text_body created_at creator_id } } }`,
      undefined,
      'get updates'
    );
    return data.updates;
  }

  async getItemUpdates(itemId: string, limit?: number): Promise<any[]> {
    let limitStr = limit ? '(limit: $limit)' : '';
    let variables: Record<string, any> = { itemId };
    if (limit) variables.limit = limit;
    let data = await this.query(
      `query($itemId: ID!${limit ? ', $limit: Int' : ''}) { items(ids: [$itemId]) { updates${limitStr} { id body text_body created_at updated_at creator_id creator { id name } replies { id body text_body created_at creator_id } } } }`,
      variables,
      'get item updates'
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
      variables,
      'create update'
    );
    return data.create_update;
  }

  async editUpdate(updateId: string, body: string): Promise<any> {
    let data = await this.query(
      `mutation($updateId: ID!, $body: String!) { edit_update(id: $updateId, body: $body) { id body text_body created_at updated_at creator_id item_id } }`,
      { updateId, body },
      'edit update'
    );
    return data.edit_update;
  }

  async likeUpdate(updateId: string): Promise<any> {
    let data = await this.query(
      `mutation($updateId: ID!) { like_update(update_id: $updateId) { id body text_body creator_id item_id } }`,
      { updateId },
      'like update'
    );
    return data.like_update;
  }

  async unlikeUpdate(updateId: string): Promise<any> {
    let data = await this.query(
      `mutation($updateId: ID!) { unlike_update(update_id: $updateId) { id body text_body creator_id item_id } }`,
      { updateId },
      'unlike update'
    );
    return data.unlike_update;
  }

  async pinUpdate(updateId: string, itemId?: string): Promise<any> {
    let args = ['id: $updateId'];
    let variables: Record<string, any> = { updateId };
    let varDefs = ['$updateId: ID!'];
    if (itemId) {
      variables.itemId = itemId;
      varDefs.push('$itemId: ID');
      args.push('item_id: $itemId');
    }
    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { pin_to_top(${args.join(', ')}) { id body text_body creator_id item_id } }`,
      variables,
      'pin update'
    );
    return data.pin_to_top;
  }

  async unpinUpdate(updateId: string, itemId?: string): Promise<any> {
    let args = ['id: $updateId'];
    let variables: Record<string, any> = { updateId };
    let varDefs = ['$updateId: ID!'];
    if (itemId) {
      variables.itemId = itemId;
      varDefs.push('$itemId: ID');
      args.push('item_id: $itemId');
    }
    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { unpin_from_top(${args.join(', ')}) { id body text_body creator_id item_id } }`,
      variables,
      'unpin update'
    );
    return data.unpin_from_top;
  }

  async deleteUpdate(updateId: string): Promise<any> {
    let data = await this.query(
      `mutation($updateId: ID!) { delete_update(id: $updateId) { id } }`,
      { updateId },
      'delete update'
    );
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

  // ==================== Folders ====================

  async getFolders(options?: {
    ids?: string[];
    workspaceIds?: (string | null)[];
    limit?: number;
    page?: number;
  }): Promise<any[]> {
    let varDefs: string[] = [];
    let args: string[] = [];
    let variables: Record<string, any> = {};

    if (options?.ids?.length) {
      variables.ids = options.ids;
      varDefs.push('$ids: [ID!]');
      args.push('ids: $ids');
    }
    if (options?.workspaceIds?.length) {
      variables.workspaceIds = options.workspaceIds;
      varDefs.push('$workspaceIds: [ID]');
      args.push('workspace_ids: $workspaceIds');
    }
    if (options?.limit) {
      variables.limit = options.limit;
      varDefs.push('$limit: Int');
      args.push('limit: $limit');
    }
    if (options?.page) {
      variables.page = options.page;
      varDefs.push('$page: Int');
      args.push('page: $page');
    }

    let queryPrefix = varDefs.length ? `query(${varDefs.join(', ')})` : 'query';
    let argsStr = args.length ? `(${args.join(', ')})` : '';
    let data = await this.query(
      `${queryPrefix} { folders${argsStr} { id name color created_at owner_id app_feature_slug workspace { id name } parent { id name } sub_folders { id name } children { id name } } }`,
      variables,
      'get folders'
    );
    return data.folders;
  }

  async createFolder(params: {
    name: string;
    workspaceId?: string;
    parentFolderId?: string;
    color?: string;
  }): Promise<any> {
    let varDefs = ['$name: String!'];
    let args = ['name: $name'];
    let variables: Record<string, any> = {
      name: params.name
    };

    if (params.workspaceId) {
      variables.workspaceId = params.workspaceId;
      varDefs.push('$workspaceId: ID');
      args.push('workspace_id: $workspaceId');
    }
    if (params.parentFolderId) {
      variables.parentFolderId = params.parentFolderId;
      varDefs.push('$parentFolderId: ID');
      args.push('parent_folder_id: $parentFolderId');
    }
    if (params.color) {
      args.push(`color: ${params.color}`);
    }

    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { create_folder(${args.join(', ')}) { id name color workspace { id name } parent { id name } } }`,
      variables,
      'create folder'
    );
    return data.create_folder;
  }

  async updateFolder(params: {
    folderId: string;
    name?: string;
    workspaceId?: string;
    parentFolderId?: string;
    color?: string;
    customIcon?: string;
    fontWeight?: string;
    accountProductId?: string;
    position?: FolderPosition;
  }): Promise<any> {
    let varDefs = ['$folderId: ID!'];
    let args = ['folder_id: $folderId'];
    let variables: Record<string, any> = {
      folderId: params.folderId
    };

    if (params.name) {
      variables.name = params.name;
      varDefs.push('$name: String');
      args.push('name: $name');
    }
    if (params.workspaceId) {
      variables.workspaceId = params.workspaceId;
      varDefs.push('$workspaceId: ID');
      args.push('workspace_id: $workspaceId');
    }
    if (params.parentFolderId) {
      variables.parentFolderId = params.parentFolderId;
      varDefs.push('$parentFolderId: ID');
      args.push('parent_folder_id: $parentFolderId');
    }
    if (params.accountProductId) {
      variables.accountProductId = params.accountProductId;
      varDefs.push('$accountProductId: ID');
      args.push('account_product_id: $accountProductId');
    }
    if (params.position) {
      variables.position = params.position;
      varDefs.push('$position: DynamicPosition');
      args.push('position: $position');
    }
    if (params.color) {
      args.push(`color: ${params.color}`);
    }
    if (params.customIcon) {
      args.push(`custom_icon: ${params.customIcon}`);
    }
    if (params.fontWeight) {
      args.push(`font_weight: ${params.fontWeight}`);
    }

    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { update_folder(${args.join(', ')}) { id name color workspace { id name } parent { id name } } }`,
      variables,
      'update folder'
    );
    return data.update_folder;
  }

  async deleteFolder(folderId: string): Promise<any> {
    let data = await this.query(
      `mutation($folderId: ID!) { delete_folder(folder_id: $folderId) { id name } }`,
      { folderId },
      'delete folder'
    );
    return data.delete_folder;
  }

  // ==================== Tags ====================

  async getTags(): Promise<any[]> {
    let data = await this.query(`{ tags { id name color } }`);
    return data.tags;
  }

  // ==================== Webhooks ====================

  async getWebhooks(boardId: string, options?: { appWebhooksOnly?: boolean }): Promise<any[]> {
    let args = ['board_id: $boardId'];
    let variables: Record<string, any> = { boardId };
    let varDefs = ['$boardId: ID!'];
    if (options?.appWebhooksOnly !== undefined) {
      variables.appWebhooksOnly = options.appWebhooksOnly;
      varDefs.push('$appWebhooksOnly: Boolean');
      args.push('app_webhooks_only: $appWebhooksOnly');
    }
    let data = await this.query(
      `query(${varDefs.join(', ')}) { webhooks(${args.join(', ')}) { id event board_id config } }`,
      variables,
      'get webhooks'
    );
    return data.webhooks;
  }

  async createWebhook(
    boardId: string,
    url: string,
    event: string,
    config?: Record<string, any>
  ): Promise<any> {
    let args = ['board_id: $boardId', 'url: $url', `event: ${event}`];
    let variables: Record<string, any> = {
      boardId,
      url
    };
    let varDefs = ['$boardId: ID!', '$url: String!'];
    if (config) {
      variables.config = JSON.stringify(config);
      varDefs.push('$config: JSON');
      args.push('config: $config');
    }

    let data = await this.query(
      `mutation(${varDefs.join(', ')}) { create_webhook(${args.join(', ')}) { id event board_id config } }`,
      variables,
      'create webhook'
    );
    return data.create_webhook;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let data = await this.query(
      `mutation($webhookId: ID!) { delete_webhook(id: $webhookId) { id board_id } }`,
      { webhookId },
      'delete webhook'
    );
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
