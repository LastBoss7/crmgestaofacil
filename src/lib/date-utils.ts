const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function normalizeDateOnly(value: string): string | null {
  const trimmedValue = value.trim();
  const match = DATE_ONLY_PATTERN.exec(trimmedValue);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const localDate = new Date(year, month - 1, day);

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDateOnly(value: string): string {
  const normalizedDate = normalizeDateOnly(value);
  if (!normalizedDate) return value;

  const [year, month, day] = normalizedDate.split('-');
  return `${day}/${month}/${year}`;
}