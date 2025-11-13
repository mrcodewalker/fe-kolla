import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserManagementService, UserManagementItem, UpdateUserRequest } from '../../services/user-management.service';
import { DepartmentService, DepartmentItem } from '../../services/department.service';
import { RoleService, RoleItem } from '../../services/role.service';
import { AuthenticationService, RegisterRequest } from '../../services/authentication.service';
import { MessageService } from 'primeng/api';
import { formatDate } from '@angular/common';

interface ColumnConfig {
  field: keyof UserManagementItem | 'actions';
  header: string;
  filterType?: string;
  type?: string;
  format?: string;
  visible: boolean;
  defaultVisible: boolean;
  alwaysVisible?: boolean;
  sortable?: boolean;
}

@Component({
  selector: 'app-management',
  templateUrl: './management.component.html',
  styleUrls: ['./management.component.scss']
})
export class ManagementComponent implements OnInit {
  form: FormGroup;
  editForm: FormGroup;
  addForm: FormGroup;

  loading = false;
  rows: UserManagementItem[] = [];
  totalRecords = 0;
  page = 0; // 0-based
  size = 10;
  sortBy = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

  showColumnSelector = false;
  showEditDialog = false;
  showAddDialog = false;
  editingUser: UserManagementItem | null = null;
  componentInitialized = false;
  addSubmitting = false;
  initialEditFormValues: any = null;

  // Confirm Dialog
  showConfirmDialog = false;
  confirmDialogTitle = 'Xác nhận';
  confirmDialogMessage = 'Bạn có chắc chắn muốn thực hiện thao tác này?';
  confirmDialogType: 'delete' | 'default' = 'delete';
  pendingDeleteUser: UserManagementItem | null = null;

  departments: DepartmentItem[] = [];
  roles: RoleItem[] = [];

  columnConfig: ColumnConfig[] = [
    { 
      field: 'id', 
      header: 'ID', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true, 
      alwaysVisible: true 
    },
    { 
      field: 'name', 
      header: 'Tên', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'email', 
      header: 'Email', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'userCode', 
      header: 'Mã User', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'phoneNumber', 
      header: 'SĐT', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'department', 
      header: 'Phòng ban', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'position', 
      header: 'Vị trí', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true,
      sortable: false
    },
    { 
      field: 'role', 
      header: 'Vai trò', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'bankName', 
      header: 'Ngân hàng', 
      filterType: 'text', 
      visible: false, 
      defaultVisible: false 
    },
    { 
      field: 'bankNumber', 
      header: 'STK', 
      filterType: 'text', 
      visible: false, 
      defaultVisible: false 
    },
    { 
      field: 'degree', 
      header: 'Bằng cấp', 
      filterType: 'text', 
      visible: false, 
      defaultVisible: false 
    },
    { 
      field: 'active', 
      header: 'Trạng thái', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true,
      sortable: false
    },
    { 
      field: 'actions', 
      header: 'Thao tác', 
      visible: true, 
      defaultVisible: true, 
      alwaysVisible: true,
      sortable: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private userManagementService: UserManagementService,
    private departmentService: DepartmentService,
    private roleService: RoleService,
    private authService: AuthenticationService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      keyword: [''],
      name: [''],
      email: [''],
      userCode: [''],
      phoneNumber: [''],
      identification: [''],
      bankName: [''],
      bankNumber: [''],
      departmentId: [''],
      roleId: ['']
    });

    this.editForm = this.fb.group({
      id: [0],
      email: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      imgUrl: [''],
      position: [''],
      userCode: [''],
      dob: [''],
      bankName: [''],
      bankNumber: [''],
      address: [''],
      phoneNumber: [''],
      departmentId: [null],
      roleId: [null],
      degree: [''],
      active: [true]
    });

    this.addForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      departmentId: [null, Validators.required],
      roleId: [null, Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadRoles();
    this.loadData();
    
    setTimeout(() => {
      this.componentInitialized = true;
    }, 100);
  }

  get displayedColumns(): ColumnConfig[] {
    return this.columnConfig.filter(col => col.visible);
  }

  get globalFilterFields(): string[] {
    return this.displayedColumns.map(col => col.field as string).filter(field => field !== 'actions');
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (res) => {
        this.departments = res?.data || [];
      },
      error: () => {
        this.departments = [];
      }
    });
  }

  loadRoles(): void {
    this.roleService.getAllRoles().subscribe({
      next: (res) => {
        this.roles = res?.data || [];
      },
      error: () => {
        this.roles = [];
      }
    });
  }

  toggleColumnVisibility(column: ColumnConfig): void {
    if (column.alwaysVisible) {
      return;
    }
    column.visible = !column.visible;
    // Ensure at least one column is visible
    if (!this.displayedColumns.length) {
      column.visible = true;
    }
  }

  resetColumnVisibility(): void {
    this.columnConfig.forEach(col => {
      col.visible = col.defaultVisible || col.alwaysVisible || false;
    });
  }

  onSearch(): void {
    this.loading = true;
    this.page = 0;
    this.loadData();
  }

  onClear(): void {
    this.form.reset({
      keyword: '',
      name: '',
      email: '',
      userCode: '',
      phoneNumber: '',
      identification: '',
      bankName: '',
      bankNumber: '',
      departmentId: '',
      roleId: ''
    });
    this.page = 0;
    this.loadData();
  }

  onPageChange(event: any): void {
    this.size = event.rows;
    this.page = Math.floor(event.first / event.rows);
    this.loadData();
  }

  onSortChange(event: any): void {
    if (event && event.field) {
      this.sortBy = event.field;
      this.sortDirection = event.order === 1 ? 'asc' as const : 'desc' as const;
      this.loadData();
    }
  }

  private loadData(): void {
    this.loading = true;
    const formValue = this.form.value;
    
    const searchParams: any = {
      page: this.page,
      size: this.size,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };

    // Add search parameters if they have values
    Object.keys(formValue).forEach(key => {
      if (formValue[key] && formValue[key].toString().trim()) {
        searchParams[key] = formValue[key].toString().trim();
      }
    });

    this.userManagementService.searchUsers(searchParams).subscribe({
      next: (res) => {
        const data = res?.data;
        this.rows = data?.content || [];
        this.totalRecords = data?.totalElements || 0;
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.totalRecords = 0;
        this.loading = false;
      }
    });
  }

  onEdit(user: UserManagementItem): void {
    this.editingUser = user;
    const selectedDepartment = this.departments.find(d => d.departmentName === user.department);
    const selectedRole = this.roles.find(r => r.name === user.role);
    
    const initialValues = {
      id: user.id,
      email: user.email,
      name: user.name,
      imgUrl: user.imgUrl || '',
      position: user.position || '',
      userCode: user.userCode || '',
      dob: user.dob || '',
      bankName: user.bankName || '',
      bankNumber: user.bankNumber || '',
      address: user.address || '',
      phoneNumber: user.phoneNumber || '',
      departmentId: selectedDepartment?.id || null,
      roleId: selectedRole?.id || null,
      degree: user.degree || '',
      active: user.active
    };
    
    this.editForm.patchValue(initialValues);
    if (initialValues.dob) {
      try {
        const parsedDate = new Date(initialValues.dob);
        if (!isNaN(parsedDate.getTime())) {
          this.editForm.patchValue({ dob: parsedDate });
        }
      } catch (e) {
        console.warn('Không thể parse ngày sinh:', initialValues.dob);
      }
    }
    
    // Save initial values for comparison
    this.initialEditFormValues = JSON.parse(JSON.stringify(initialValues));
    
    this.showEditDialog = true;
  }

  onSaveEdit(): void {
    if (this.editForm.valid && this.editingUser) {
      const formValue = this.editForm.value;
      const updateData: UpdateUserRequest = {
        ...formValue,
        dob: formValue.dob
          ? formatDate(formValue.dob, 'yyyy-MM-dd', 'en-US')
          : null
      };

      this.userManagementService.updateUser(this.editingUser.id, updateData).subscribe({
        next: () => {
          this.showEditDialog = false;
          this.editingUser = null;
          this.editForm.reset();
          this.initialEditFormValues = null;
          this.loadData();
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cập nhật tài khoản thành công',
            life: 3000
          });
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Thất bại',
            detail: 'Cập nhật tài khoản thất bại',
            life: 4000
          });
        }
      });
    }
  }

  onCancelEdit(): void {
    this.showEditDialog = false;
    this.editingUser = null;
    this.editForm.reset();
    this.initialEditFormValues = null;
  }

  // Check if form has been modified
  hasFormChanged(): boolean {
    if (!this.initialEditFormValues) {
      return false;
    }
    
    const currentValues = this.editForm.value;
    const initialValues = this.initialEditFormValues;
    
    // Compare all form fields
    return (
      currentValues.email !== initialValues.email ||
      currentValues.name !== initialValues.name ||
      currentValues.imgUrl !== initialValues.imgUrl ||
      currentValues.position !== initialValues.position ||
      currentValues.userCode !== initialValues.userCode ||
      currentValues.dob !== initialValues.dob ||
      currentValues.bankName !== initialValues.bankName ||
      currentValues.bankNumber !== initialValues.bankNumber ||
      currentValues.address !== initialValues.address ||
      currentValues.phoneNumber !== initialValues.phoneNumber ||
      currentValues.departmentId !== initialValues.departmentId ||
      currentValues.roleId !== initialValues.roleId ||
      currentValues.degree !== initialValues.degree ||
      currentValues.active !== initialValues.active
    );
  }

  onDelete(user: UserManagementItem): void {
    // Show confirmation dialog
    this.pendingDeleteUser = user;
    this.confirmDialogTitle = 'Xác nhận xóa';
    this.confirmDialogMessage = `Bạn có chắc chắn muốn xóa tài khoản "${user.name}"?`;
    this.confirmDialogType = 'delete';
    this.showConfirmDialog = true;
  }

  // Confirm Dialog Handlers
  onConfirmDialogConfirmed(): void {
    if (this.pendingDeleteUser == null) {
      this.showConfirmDialog = false;
      return;
    }

    const user = this.pendingDeleteUser;
    this.userManagementService.deleteUser(user.id).subscribe({
      next: () => {
        this.loadData();
        this.pendingDeleteUser = null;
        this.showConfirmDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Đã xóa tài khoản "${user.name}".`,
          life: 3000
        });
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.pendingDeleteUser = null;
        this.showConfirmDialog = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Thất bại',
          detail: 'Xóa tài khoản thất bại. Vui lòng thử lại.',
          life: 4000
        });
      }
    });
  }

  onConfirmDialogCancelled(): void {
    this.showConfirmDialog = false;
    this.pendingDeleteUser = null;
  }

  getDepartmentName(departmentId: number): string {
    const department = this.departments.find(d => d.id === departmentId);
    return department?.departmentName || '';
  }

  getRoleName(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role?.name || '';
  }

  // Password match validator
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword?.hasError('passwordMismatch')) {
        confirmPassword.setErrors(null);
      }
      return null;
    }
  }

  // Add Account methods
  onAddAccount(): void {
    this.showAddDialog = true;
  }

  onSaveAdd(): void {
    if (this.addForm.valid) {
      this.addSubmitting = true;
      
      const registerData: RegisterRequest = {
        email: this.addForm.value.email,
        password: this.addForm.value.password,
        fullName: this.addForm.value.fullName,
        departmentId: this.addForm.value.departmentId,
        roleId: this.addForm.value.roleId
      };

      this.authService.register(registerData).subscribe({
        next: (response) => {
          this.addSubmitting = false;
          
          // Always close dialog and reset form after getting response
          this.showAddDialog = false;
          this.addForm.reset();
          
          if (response && response.success) {
            console.log('Thêm tài khoản thành công:', response.message);
            this.loadData(); // Refresh data table only on success
            // You can add success toast notification here
          } else {
            console.error('Thêm tài khoản thất bại:', response?.message || 'Unknown error');
            // You can add error toast notification here
          }
        },
        error: (error) => {
          this.addSubmitting = false;
          
          // Close dialog even on error
          this.showAddDialog = false;
          this.addForm.reset();
          
          console.error('Lỗi API:', error);
          // You can add error toast notification here
        }
      });
    }
  }

  onCancelAdd(): void {
    this.showAddDialog = false;
    this.addForm.reset();
  }
}
