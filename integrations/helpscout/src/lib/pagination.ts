// Help Scout Inbox API list responses carry HAL page metadata.
// https://developer.helpscout.com/mailbox-api/overview/pagination/
export let halPageInfo = (data: any, itemCount: number) => {
  let page = data?.page ?? {};
  return {
    totalCount: typeof page.totalElements === 'number' ? page.totalElements : itemCount,
    currentPage: typeof page.number === 'number' && page.number > 0 ? page.number : 1,
    totalPages: typeof page.totalPages === 'number' ? page.totalPages : 1
  };
};

// Docs API list responses wrap items as { <key>: { page, pages, count, items } }.
// https://developer.helpscout.com/docs-api/collections/list/
export let docsListInfo = (data: any, key: string) => {
  let container = data?.[key] ?? data ?? {};
  let items: any[] = Array.isArray(container.items) ? container.items : [];
  return {
    items,
    totalCount: typeof container.count === 'number' ? container.count : items.length,
    currentPage: typeof container.page === 'number' ? container.page : 1,
    totalPages: typeof container.pages === 'number' ? container.pages : 1
  };
};
