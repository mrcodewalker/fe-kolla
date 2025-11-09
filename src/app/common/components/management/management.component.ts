import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserManagementService, UserManagementItem, UpdateUserRequest } from '../../services/user-management.service';
import { DepartmentService, DepartmentItem } from '../../services/department.service';
import { RoleService, RoleItem } from '../../services/role.service';

interface ColumnConfig {
  field: keyof UserManagementItem | 'actions';
  header: string;
  filterType?: string;
  type?: string;
  format?: string;
  visible: boolean;
  defaultVisible: boolean;
  alwaysVisible?: boolean;
}

@Component({
  selector: 'app-management',
  templateUrl: './management.component.html',
  styleUrls: ['./management.component.scss']
})
export class ManagementComponent implements OnInit {
  form: FormGroup;
  editForm: FormGroup;

  loading = false;
  rows: UserManagementItem[] = [];
  totalRecords = 0;
  page = 0; // 0-based
  size = 10;
  sortBy = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

  showColumnSelector = false;
  showEditDialog = false;
  editingUser: UserManagementItem | null = null;
  componentInitialized = false;

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
      defaultVisible: true 
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
      defaultVisible: true 
    },
    { 
      field: 'actions', 
      header: 'Thao tác', 
      visible: true, 
      defaultVisible: true, 
      alwaysVisible: true 
    }
  ];

  constructor(
    private fb: FormBuilder,
    private userManagementService: UserManagementService,
    private departmentService: DepartmentService,
    private roleService: RoleService
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
    
    this.editForm.patchValue({
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
    });
    this.showEditDialog = true;
  }

  onSaveEdit(): void {
    if (this.editForm.valid && this.editingUser) {
      const updateData: UpdateUserRequest = {
        ...this.editForm.value
      };

      this.userManagementService.updateUser(this.editingUser.id, updateData).subscribe({
        next: () => {
          this.showEditDialog = false;
          this.editingUser = null;
          this.loadData();
        },
        error: (error) => {
          console.error('Error updating user:', error);
        }
      });
    }
  }

  onCancelEdit(): void {
    this.showEditDialog = false;
    this.editingUser = null;
    this.editForm.reset();
  }

  onDelete(user: UserManagementItem): void {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.name}"?`)) {
      this.userManagementService.deleteUser(user.id).subscribe({
        next: () => {
          this.loadData();
        },
        error: (error) => {
          console.error('Error deleting user:', error);
        }
      });
    }
  }

  getDepartmentName(departmentId: number): string {
    const department = this.departments.find(d => d.id === departmentId);
    return department?.departmentName || '';
  }

  getRoleName(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role?.name || '';
  }
}
