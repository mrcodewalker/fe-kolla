import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserUpdateService } from '../../services/user-update.service';
import { NotificationService, NotificationItem } from '../../services/notification.service';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  showUserInfo = false;
  showNotifications = false;
  user?: User;
  private subscriptions: Subscription[] = [];

  // Notification properties
  notifications: NotificationItem[] = [];
  loadingNotifications = false;
  notificationPage = 0;
  notificationSize = 10;
  totalNotifications = 0;
  hasMoreNotifications = true;
  unreadNotificationCount = 0;
  private lastTriggeredIndex = -1;

  constructor(
    private authService: AuthService,
    private router: Router,
    private userUpdateService: UserUpdateService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Subscribe to current user from AuthService
    const userSubscription = this.authService.currentUser$.subscribe(user => {
      this.user = user || undefined;
      if (user) {
        this.showUserInfo = false; // Hide user info panel by default
        console.log('User data:', this.user);
      }
    });
    this.subscriptions.push(userSubscription);

    // Subscribe to user updates (không cần gửi request mới)
    const updateSubscription = this.userUpdateService.userUpdated$.subscribe(() => {
      // Dữ liệu sẽ được cập nhật tự động thông qua subscription trên
    });
    this.subscriptions.push(updateSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleUserInfo() {
    this.showUserInfo = !this.showUserInfo;
  }

  closeUserInfo() {
    this.showUserInfo = false;
  }

  logout() {
    this.closeUserInfo(); // Close user info panel first
    if (this.user) {
      this.authService.logout();
    } else {
      // If not logged in, navigate to login page
      this.router.navigate(['/login']);
    }
  }

  // Close user info panel when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-info-container')) {
      this.showUserInfo = false;
    }
    if (!target.closest('.notification-container')) {
      this.showNotifications = false;
    }
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications && this.notifications.length === 0) {
      this.loadNotifications();
    }
  }

  loadNotifications(reset: boolean = false) {
    if (this.loadingNotifications || (!reset && !this.hasMoreNotifications)) {
      return;
    }

    if (reset) {
      this.notificationPage = 0;
      this.notifications = [];
      this.hasMoreNotifications = true;
      this.lastTriggeredIndex = -1;
    }

    this.loadingNotifications = true;
    this.notificationService.getNotificationsByToken({
      page: this.notificationPage,
      size: this.notificationSize
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const newNotifications = response.data.content || [];
          if (reset) {
            this.notifications = newNotifications;
          } else {
            this.notifications = [...this.notifications, ...newNotifications];
          }
          
          this.totalNotifications = response.data.totalElements || 0;
          this.hasMoreNotifications = !response.data.last;
          this.notificationPage++;
          
          // Reset trigger index after loading new data
          this.lastTriggeredIndex = -1;
          
          // Update unread count
          this.updateUnreadCount();
        }
        this.loadingNotifications = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.loadingNotifications = false;
      }
    });
  }

  onNotificationScroll(event: Event) {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    const clientHeight = element.clientHeight;
    
    // Get all notification items
    const notificationItems = element.querySelectorAll('.notification-item');
    if (notificationItems.length === 0) return;
    
    // Calculate which item is at 80% of current loaded items (item 8 in 10 items)
    const currentItemCount = notificationItems.length;
    const triggerIndex = Math.floor(currentItemCount * 0.8); // Item 8 = index 7 in 10 items
    
    // Only trigger once per batch
    if (triggerIndex === this.lastTriggeredIndex) {
      return;
    }
    
    // Get the trigger item (item 8)
    if (triggerIndex < notificationItems.length) {
      const triggerItem = notificationItems[triggerIndex] as HTMLElement;
      const triggerItemTop = triggerItem.offsetTop;
      
      // Check if trigger item (item 8) is visible in viewport
      const viewportBottom = scrollTop + clientHeight;
      
      // Trigger load when item 8 becomes visible
      if (viewportBottom >= triggerItemTop && 
          this.hasMoreNotifications && 
          !this.loadingNotifications) {
        // Mark this index as triggered
        this.lastTriggeredIndex = triggerIndex;
        // Load more notifications
        this.loadNotifications();
      }
    }
  }

  onNotificationClick(notification: NotificationItem) {
    // Mark as read if not already read
    if (!notification.read) {
      notification.read = true;
      this.updateUnreadCount();
      // TODO: Call API to mark notification as read if needed
    }
  }

  updateUnreadCount() {
    this.unreadNotificationCount = this.notifications.filter(n => !n.read).length;
  }

  formatNotificationDate(dateString?: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

}
