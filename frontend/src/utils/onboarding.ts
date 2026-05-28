const ONBOARDING_KEY_PREFIX = "qolop:onboarding:";
const NEW_USER_KEY = "qolop:new-user-id";

function getOnboardingKey(userId: number) {
  return `${ONBOARDING_KEY_PREFIX}${userId}`;
}

function normalizeUserId(userId?: number | null): string | null {
  if (!userId || !Number.isFinite(userId)) {
    return null;
  }

  return String(userId);
}

export function markNewUserOnboarding(userId?: number | null): void {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return;
  }

  localStorage.setItem(NEW_USER_KEY, normalizedUserId);
}

export function getNewUserOnboardingId(): number | null {
  const storedId = localStorage.getItem(NEW_USER_KEY);

  if (!storedId) {
    return null;
  }

  const parsedId = Number(storedId);

  if (!Number.isFinite(parsedId)) {
    localStorage.removeItem(NEW_USER_KEY);
    return null;
  }

  return parsedId;
}

export function clearNewUserOnboarding(): void {
  localStorage.removeItem(NEW_USER_KEY);
}

export function hasCompletedOnboarding(userId?: number | null): boolean {
  if (!userId) {
    return true;
  }

  return localStorage.getItem(getOnboardingKey(userId)) === "done";
}

export function markOnboardingCompleted(userId: number): void {
  localStorage.setItem(getOnboardingKey(userId), "done");
  clearNewUserOnboarding();
}

export function resetOnboardingState(userId?: number | null): void {
  if (!userId) {
    return;
  }

  localStorage.removeItem(getOnboardingKey(userId));
}
