function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string");
}

export function hasInstructorPermission(value: unknown, requiredPermission: string) {
  return normalizePermissions(value)?.includes(requiredPermission) === true;
}
