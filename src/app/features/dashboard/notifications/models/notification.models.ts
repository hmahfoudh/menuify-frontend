export interface NotificationResponse {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string;
  actionUrl: string | null;
  isRead:    boolean;
  readAt:    string | null;
  createdAt: string;
}

export type NotificationType =
  | 'new_order'
  | 'trial_expiring'
  | 'payment_failed'
  | 'plan_changed'
  | 'domain_verified'
  | 'staff_added';

export interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  timestamp: string;
}

// Icon path + accent color per notification type
export interface NotifMeta {
  icon:  string;   // SVG path
  color: string;   // CSS color
}

export const NOTIF_META: Record<NotificationType, NotifMeta> = {
  new_order: {
    icon:  'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    color: '#e8a838',
  },
  trial_expiring: {
    icon:  'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
    color: '#5a9cf5',
  },
  payment_failed: {
    icon:  'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    color: '#e07070',
  },
  plan_changed: {
    icon:  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    color: '#b07be8',
  },
  domain_verified: {
    icon:  'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
    color: '#6dc98a',
  },
  staff_added: {
    icon:  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    color: '#4ecdc4',
  },
};