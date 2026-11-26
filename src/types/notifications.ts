export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListDTO {
  items: NotificationDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}

export interface NotificationQuery {
  page: number;
  pageSize: number;
  unread: boolean;
}
