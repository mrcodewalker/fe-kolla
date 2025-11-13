import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {
  unreadCount: number | null = null;
  loading = false;
  error?: string;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadUnreadCount();
  }

  loadUnreadCount(): void {
    this.loading = true;
    this.notificationService.getUnreadNotificationCount().subscribe({
      next: (response) => {
        this.unreadCount = response?.data ?? 0;
        this.error = undefined;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching unread notification count:', err);
        this.error = 'Không thể tải số lượng thông báo chưa đọc';
        this.loading = false;
      }
    });
  }
}
