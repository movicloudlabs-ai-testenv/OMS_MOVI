/**
 * Pagination Utilities
 * Extracts page/limit from query params and builds pagination metadata.
 */

export const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 25;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const paginatedResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  },
});
