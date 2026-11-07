/** localStorage can be missing or throw (private mode, sandboxed frames): never rely on it. */

export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(`learning-is-fun:${key}`);
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(`learning-is-fun:${key}`, value);
  } catch {
    // Saving the setting is a convenience only.
  }
}
