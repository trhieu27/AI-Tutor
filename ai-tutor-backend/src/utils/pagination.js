function parsePagination(query = {}, options = {}) {
  const defaultLimit = Number.isFinite(options.defaultLimit) ? options.defaultLimit : 20;
  const maxLimit = Number.isFinite(options.maxLimit) ? options.maxLimit : 100;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  
  let sort = null;
  if (query.sort) {
    const parts = String(query.sort).split(',');
    sort = {};
    parts.forEach(part => {
      let field = part.trim();
      let order = -1;
      if (field.includes(':')) {
        const [f, o] = field.split(':');
        field = f.trim();
        order = o.trim().toLowerCase() === 'asc' ? 1 : -1;
      } else if (field.startsWith('-')) {
        field = field.substring(1);
        order = -1;
      } else if (field.startsWith('+')) {
        field = field.substring(1);
        order = 1;
      }
      if (field) sort[field] = order;
    });
  }

  return { page, limit, skip: (page - 1) * limit, sort };
}

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function wantsPaginatedBody(query = {}) {
  return ['1', 'true', 'yes'].includes(String(query.withPagination || query.paginated || '').toLowerCase());
}

function sendPaginated(res, items, pagination, query = {}) {
  res.setHeader('X-Pagination', JSON.stringify(pagination));
  if (wantsPaginatedBody(query)) return res.json({ items, pagination });
  return res.json(items);
}

module.exports = {
  buildPagination,
  parsePagination,
  sendPaginated,
};
