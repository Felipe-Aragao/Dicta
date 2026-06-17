const uniqueOptions = (items, getValue) => (
  Array.from(new Set(
    items
      .map(getValue)
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean)
  ))
);

export function buildActivityFilterOptions(items, getters) {
  return {
    professors: uniqueOptions(items, getters.professor),
    disciplines: uniqueOptions(items, getters.discipline),
    statuses: uniqueOptions(items, getters.status),
  };
}

export function matchesActivityFilters(item, filters, getters) {
  const includesFilter = (value, filter) => (
    !String(filter || "").trim() ||
    String(value || "").toLowerCase().includes(String(filter || "").trim().toLowerCase())
  );

  return (
    includesFilter(getters.professor(item), filters.professor) &&
    includesFilter(getters.discipline(item), filters.discipline) &&
    includesFilter(getters.status(item), filters.status)
  );
}
