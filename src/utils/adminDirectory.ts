import type { AdminNotification, Restaurant } from '../types';

/**
 * Pure filtering helper for Super Admin restaurant directory search.
 */
export function filterRestaurantsForAdmin(
  restaurants: Restaurant[],
  searchQuery: string
): Restaurant[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return restaurants;

  return restaurants.filter(r => {
    return (
      r.name.toLowerCase().includes(q) ||
      r.ownerName.toLowerCase().includes(q) ||
      r.mobile.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q)
    );
  });
}

/**
 * Masks cryptographic hash strings unless explicitly revealed by Super Admin.
 */
export function maskDigestForDisplay(digest: string | undefined | null, revealed: boolean): string {
  const trimmed = (digest || '').trim();
  if (!trimmed) return 'সেট করা নেই';
  if (revealed) return trimmed;
  const tail = trimmed.length > 6 ? trimmed.slice(-6) : '';
  return `••••••••••••••••••••${tail ? ` (${tail})` : ''}`;
}

/**
 * Generates an unambiguous temporary password for Super Admin emergency resets.
 */
export function generateTemporaryPassword(length = 8): string {
  const safeLength = Math.max(6, Math.min(20, length));
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  let result = '';
  for (let i = 0; i < safeLength; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    result += chars[idx];
  }
  return result;
}

export function countUnreadNotifications(notifications: AdminNotification[]): number {
  return notifications.filter(n => !n.isRead).length;
}

export function removeNotificationFromList(
  notifications: AdminNotification[],
  targetId: string
): AdminNotification[] {
  return notifications.filter(n => n.id !== targetId);
}

export function removeRestaurantFromList(
  restaurants: Restaurant[],
  targetId: string
): Restaurant[] {
  return restaurants.filter(r => r.id !== targetId);
}
