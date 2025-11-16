import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {
  changePasswordForm: FormGroup;
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.changePasswordForm = this.fb.group({
      oldPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (!newPassword || !confirmPassword) {
      return null;
    }
    
    if (newPassword.value && confirmPassword.value && newPassword.value !== confirmPassword.value) {
      const errors = confirmPassword.errors || {};
      errors['passwordMismatch'] = true;
      confirmPassword.setErrors(errors);
      return { passwordMismatch: true };
    }
    
    // Clear passwordMismatch error if passwords match
    if (confirmPassword.hasError('passwordMismatch')) {
      const errors = { ...confirmPassword.errors };
      delete errors['passwordMismatch'];
      const hasOtherErrors = Object.keys(errors).length > 0;
      confirmPassword.setErrors(hasOtherErrors ? errors : null);
    }
    
    return null;
  }

  toggleOldPasswordVisibility() {
    this.showOldPassword = !this.showOldPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.changePasswordForm.invalid) {
      this.markFormGroupTouched(this.changePasswordForm);
      return;
    }

    const { oldPassword, newPassword } = this.changePasswordForm.value;

    if (oldPassword === newPassword) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Mật khẩu mới phải khác mật khẩu cũ'
      });
      return;
    }

    this.isLoading = true;
    this.authService.changePassword(oldPassword, newPassword).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đổi mật khẩu thành công'
        });
        // Reset form
        this.changePasswordForm.reset();
        // Navigate back after 1.5 seconds
        setTimeout(() => {
          this.router.navigate(['/home/roomlist']);
        }, 1500);
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error?.error?.message || error?.error?.error || 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
        const errorMessageLower = errorMessage.toLowerCase();
        
        // Kiểm tra nếu lỗi liên quan đến mật khẩu cũ không đúng
        const isInvalidOldPassword = 
          errorMessageLower.includes('old password') ||
          errorMessageLower.includes('mật khẩu cũ') ||
          errorMessageLower.includes('invalid password') ||
          errorMessageLower.includes('password incorrect') ||
          errorMessageLower.includes('sai mật khẩu') ||
          error?.status === 401 ||
          error?.status === 403;
        
        // Nếu là lỗi mật khẩu cũ không đúng, xóa trường mật khẩu cũ để người dùng nhập lại
        if (isInvalidOldPassword) {
          this.changePasswordForm.patchValue({
            oldPassword: ''
          });
          // Reset validation state
          this.oldPassword?.setErrors(null);
          this.oldPassword?.markAsUntouched();
          // Focus vào trường oldPassword
          setTimeout(() => {
            const oldPasswordInput = document.querySelector('input[formControlName="oldPassword"]') as HTMLInputElement;
            if (oldPasswordInput) {
              oldPasswordInput.focus();
            }
          }, 100);
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: errorMessage
        });
      }
    });
  }

  onCancel() {
    this.router.navigate(['/home/roomlist']);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get oldPassword() {
    return this.changePasswordForm.get('oldPassword');
  }

  get newPassword() {
    return this.changePasswordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.changePasswordForm.get('confirmPassword');
  }
}

