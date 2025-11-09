import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserUpdateService } from '../../services/user-update.service';
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
  user?: User;
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private userUpdateService: UserUpdateService
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
  }

}
