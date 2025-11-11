import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UserSessionService, UserSessionItem, UserSessionSearchParams } from '../../services/user-session.service';
import { UserDataService } from '../../services/user-data.service';

interface ColumnConfig {
  field: keyof UserSessionItem;
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
  selector: 'app-supervise',
  templateUrl: './supervise.component.html',
  styleUrls: ['./supervise.component.scss']
})
export class SuperviseComponent implements OnInit {
  form: FormGroup;

  loading = false;
  rows: UserSessionItem[] = [];
  totalRecords = 0;
  page = 0; // 0-based
  size = 10;
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  showColumnSelector = false;
  componentInitialized = false;

  // Autocomplete for user name
  userSuggestions: any[] = [];
  private userInputTimeout: any;
  selectedUserId: string | null = null;
  userDropdownHovered = false;

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
      field: 'userName', 
      header: 'Tên người dùng', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'userEmail', 
      header: 'Email', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'createdAt', 
      header: 'Ngày đăng nhập', 
      type: 'date', 
      format: 'dd/MM/yyyy HH:mm', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'updatedAt', 
      header: 'Ngày đăng xuất', 
      type: 'date', 
      format: 'dd/MM/yyyy HH:mm', 
      visible: false, 
      defaultVisible: false 
    },
    { 
      field: 'ipAddress', 
      header: 'Địa chỉ IP', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'deviceInfo', 
      header: 'Thiết bị', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'userAgent', 
      header: 'User Agent', 
      filterType: 'text', 
      visible: false, 
      defaultVisible: false 
    },
    { 
      field: 'location', 
      header: 'Vị trí', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'action', 
      header: 'Hành động', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'active', 
      header: 'Trạng thái', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true,
      sortable: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private userSessionService: UserSessionService,
    private userDataService: UserDataService
  ) {
    this.form = this.fb.group({
      userName: [''],
      startDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
    // Mark component as initialized after a small delay
    setTimeout(() => {
      this.componentInitialized = true;
    }, 100);
  }

  // User Name autocomplete methods
  onUserNameInput(): void {
    const query = this.form.get('userName')?.value?.trim();
    // If user edits the input after selection, clear selectedUserId
    this.selectedUserId = null;
    if (this.userInputTimeout) {
      clearTimeout(this.userInputTimeout);
    }
    if (!query) {
      this.userSuggestions = [];
      return;
    }
    this.userInputTimeout = setTimeout(() => {
      this.userDataService.searchBasic(query).subscribe({
        next: (res: any) => {
          console.log('User search response:', res);
          if (res && res.success && res.data && Array.isArray(res.data)) {
            this.userSuggestions = res.data.map((user: any) => ({
              userId: user.id,
              fullName: user.fullName || user.name || user.displayName,
              email: user.email,
              name: user.name,
              displayName: user.displayName
            }));
            console.log('User suggestions:', this.userSuggestions);
          } else {
            this.userSuggestions = [];
          }
        },
        error: (err) => {
          console.error('Error searching users:', err);
          this.userSuggestions = [];
        }
      });
    }, 2000);
  }

  onUserInputBlur(): void {
    setTimeout(() => {
      if (!this.userDropdownHovered) {
        this.userSuggestions = [];
      }
    }, 200);
  }

  selectUserSuggestion(user: any): void {
    const displayName = user.fullName || user.name || user.displayName || user.email;
    this.form.get('userName')?.setValue(displayName);
    // Store the selected user's userId
    this.selectedUserId = user.userId ? String(user.userId) : null;
    console.log('Selected user:', displayName, 'with userId:', this.selectedUserId);
    this.userSuggestions = [];
  }

  get displayedColumns(): ColumnConfig[] {
    return this.columnConfig.filter(col => col.visible);
  }

  get globalFilterFields(): string[] {
    return this.displayedColumns.map(col => col.field as string);
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

  showAllColumns(): void {
    this.columnConfig.forEach(col => {
      col.visible = true;
    });
  }

  hideAllColumns(): void {
    this.columnConfig.forEach(col => {
      col.visible = col.alwaysVisible ? true : false;
    });
  }

  resetColumnVisibility(): void {
    this.columnConfig.forEach(col => {
      col.visible = col.defaultVisible || col.alwaysVisible || false;
    });
  }

  onSearch(): void {
    this.loading = true; // Show loading state
    this.page = 0; // reset to first page on search
    this.loadData();
  }

  onClear(): void {
    this.form.reset({
      userName: '',
      startDate: ''
    });
    this.selectedUserId = null;
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
    const { startDate } = this.form.value;
    
    const searchParams: UserSessionSearchParams = {
      page: this.page,
      size: this.size,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };

    // If a user is selected from dropdown, use their userId
    if (this.selectedUserId) {
      const userIdNum = Number(this.selectedUserId);
      if (!isNaN(userIdNum)) {
        searchParams.userId = userIdNum;
        console.log('Searching with userId:', userIdNum);
      }
    }
    if (startDate) {
      // Convert to dd/MM/yyyy format
      const date = new Date(startDate);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      searchParams.startDate = `${day}/${month}/${year}`;
    }

    console.log('Search params:', searchParams);
    this.userSessionService.searchUserSessions(searchParams).subscribe({
      next: (res) => {
        console.log('Search results:', res);
        const data = res?.data;
        this.rows = data?.content || [];
        this.totalRecords = data?.totalElements || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching user sessions:', error);
        this.rows = [];
        this.totalRecords = 0;
        this.loading = false;
      }
    });
  }

  // Column Settings Methods
  onColumnToggle(column: ColumnConfig): void {
    // Column visibility is already updated via ngModel binding
    // Ensure at least one visible column (excluding always visible ones)
    const visibleCount = this.columnConfig.filter(col => col.visible).length;
    if (visibleCount === 0) {
      // If no columns are visible, revert the change
      column.visible = true;
    }
  }

  toggleColumnCard(column: ColumnConfig): void {
    if (column.alwaysVisible) {
      return; // Don't allow toggling required columns
    }
    
    column.visible = !column.visible;
    this.onColumnToggle(column);
  }

  resetColumnSettings(): void {
    this.columnConfig.forEach(col => {
      col.visible = col.defaultVisible;
    });
  }

  applyColumnSettings(): void {
    // Settings are already applied via ngModel binding
    // Just close the panel
    this.showColumnSelector = false;
  }

  toggleColumnSettings(event: Event): void {
    this.showColumnSelector = !this.showColumnSelector;
  }
}
