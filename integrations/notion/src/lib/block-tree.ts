type BlockChildrenClient = {
  getBlockChildren: (
    blockId: string,
    startCursor?: string
  ) => Promise<{
    results: any[];
    next_cursor: string | null;
    has_more: boolean;
  }>;
};

export let getNotionBlockTree = async (
  client: BlockChildrenClient,
  blockId: string
): Promise<any[]> => {
  let blocks: any[] = [];
  let startCursor: string | undefined;

  do {
    let page = await client.getBlockChildren(blockId, startCursor);
    blocks.push(...page.results);
    startCursor = page.has_more && page.next_cursor ? page.next_cursor : undefined;
  } while (startCursor);

  let tree: any[] = [];
  for (let block of blocks) {
    if (block?.has_children === true && typeof block.id === 'string') {
      tree.push({
        ...block,
        children: await getNotionBlockTree(client, block.id)
      });
    } else {
      tree.push(block);
    }
  }

  return tree;
};
