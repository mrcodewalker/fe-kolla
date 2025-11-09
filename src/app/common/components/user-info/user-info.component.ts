import {
  Component,
  OnInit,
  HostListener,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { UserUpdateService } from '../../services/user-update.service';
import { UserDataService } from '../../services/user-data.service';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.scss'],
})
export class UserInfoComponent implements OnInit, OnDestroy {
  isEditMode = false;
  editUser: Partial<User> = {};
  user?: User;
  editField: string | null = null;
  editValue: string = '';
  private subscriptions: Subscription[] = [];
  showConfirmDialog: boolean = false;

  @Output() userUpdated = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private userUpdateService: UserUpdateService,
    private userDataService: UserDataService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    const userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.user = user || undefined;
      this.editUser = { ...user };
    });
    this.subscriptions.push(userSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  startEdit(field: string, value: string) {
    this.editField = field;
    this.editValue = value || '';
  }

  enableEditMode() {
    this.isEditMode = true;
    this.editUser = { ...this.user };
  }

  getChangedFields(): Partial<User> {
    if (!this.user || !this.editUser) {
      return {};
    }

    const changedFields: Partial<User> = {};

    // Check and include only changed fields
    if ((this.editUser.name || '').trim() !== (this.user.name || '').trim()) {
      changedFields.name = this.editUser.name;
    }

    if ((this.editUser.bankName || '').trim() !== (this.user.bankName || '').trim()) {
      changedFields.bankName = this.editUser.bankName;
    }

    if ((this.editUser.bankNumber || '').trim() !== (this.user.bankNumber || '').trim()) {
      changedFields.bankNumber = this.editUser.bankNumber;
    }

    return changedFields;
  }

  updateUserData() {
    if (!this.user || !this.editUser) {
      return;
    }

    // Get only changed fields
    const profileData = this.getChangedFields();

    // Check if there are any changes
    if (Object.keys(profileData).length === 0) {
      return;
    }

    // Call service method
    this.userDataService.updateProfile(profileData).subscribe({
      next: (res: any) => {
        // CHỈ update local user khi API call THÀNH CÔNG
        if (this.user) {
          // Update chỉ những field đã thay đổi
          if (profileData.name !== undefined) {
            this.user.name = profileData.name;
          }
          if (profileData.bankName !== undefined) {
            this.user.bankName = profileData.bankName;
          }
          if (profileData.bankNumber !== undefined) {
            this.user.bankNumber = profileData.bankNumber;
          }
          
          this.userUpdateService.notifyUpdate();
          this.isEditMode = false;
        }
        
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Cập nhật thông tin cá nhân thành công'
        });
        
        this.showConfirmDialog = false;
      },
      error: (err: any) => {
        console.error('Lỗi khi cập nhật thông tin user:', err);
        
        // KHÔNG update user khi có lỗi - giữ nguyên giá trị cũ
        // editUser vẫn giữ giá trị mới để người dùng có thể sửa lại
        // nhưng user thì giữ nguyên giá trị ban đầu
        
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: err.error?.message || 'Có lỗi xảy ra khi cập nhật thông tin cá nhân'
        });
        
        this.showConfirmDialog = false;
        // Không đóng edit mode để người dùng có thể sửa lại
      }
    });
  }

  saveChanges() {
    // Show confirm dialog
    this.showConfirmDialog = true;
  }

  executeSaveChanges() {
    this.updateUserData();
  }

  onConfirmDialogCancelled() {
    this.showConfirmDialog = false;
  }

  cancelEdit() {
    this.isEditMode = false;
    this.editUser = { ...this.user };
  }

  hasChanges(): boolean {
    if (!this.user || !this.editUser) {
      return false;
    }
    
    // Check if any editable field has changed
    const nameChanged = (this.editUser.name || '').trim() !== (this.user.name || '').trim();
    const bankNameChanged = (this.editUser.bankName || '').trim() !== (this.user.bankName || '').trim();
    const bankNumberChanged = (this.editUser.bankNumber || '').trim() !== (this.user.bankNumber || '').trim();
    
    return nameChanged || bankNameChanged || bankNumberChanged;
  }
}
