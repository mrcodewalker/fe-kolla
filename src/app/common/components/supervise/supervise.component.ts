import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UserSessionService, UserSessionItem, UserSessionSearchParams } from '../../services/user-session.service';
import { UserDataService } from '../../services/user-data.service';

interface BadgeMeta {
  label: string;
  textColor: string;
  backgroundColor: string;
  showPulseDot?: boolean;
  dotColor?: string;
}

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
  badgeMap?: Record<string, BadgeMeta>;
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
  private userFilterTimeout: any;
  selectedUserId: string | null = null;
  userDropdownHovered = false;

  actionBadgeMap: Record<string, BadgeMeta> = {
    LOGIN: {
      label: 'Đăng nhập',
      textColor: '#0f766e',
      backgroundColor: '#ccfbf1'
    },
    CREATE_USER: {
      label: 'Tạo người dùng',
      textColor: '#15803d',
      backgroundColor: '#dcfce7'
    },
    CHANGE_PASSWORD: {
      label: 'Đổi mật khẩu',
      textColor: '#b45309',
      backgroundColor: '#fef3c7'
    },
    UPDATE_INFO: {
      label: 'Cập nhật thông tin',
      textColor: '#4c1d95',
      backgroundColor: '#ede9fe'
    },
    NULL: {
      label: 'Không xác định',
      textColor: '#475569',
      backgroundColor: '#e2e8f0'
    },
    default: {
      label: 'Không xác định',
      textColor: '#475569',
      backgroundColor: '#e2e8f0'
    }
  };

  statusBadgeMap: Record<string, BadgeMeta> = {
    TRUE: {
      label: 'Active',
      textColor: '#166534',
      backgroundColor: '#dcfce7',
      showPulseDot: true,
      dotColor: '#22c55e'
    },
    FALSE: {
      label: 'Closed',
      textColor: '#475569',
      backgroundColor: '#e2e8f0',
      dotColor: '#94a3b8'
    },
    NULL: {
      label: 'Không xác định',
      textColor: '#475569',
      backgroundColor: '#e2e8f0',
      dotColor: '#94a3b8'
    },
    default: {
      label: 'Không xác định',
      textColor: '#475569',
      backgroundColor: '#e2e8f0',
      dotColor: '#94a3b8'
    }
  };

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
      type: 'badge',
      visible: true, 
      defaultVisible: true,
      badgeMap: this.actionBadgeMap
    },
    { 
      field: 'active', 
      header: 'Trạng thái', 
      filterType: 'text', 
      type: 'badge',
      visible: true, 
      defaultVisible: true,
      sortable: false,
      badgeMap: this.statusBadgeMap
    }
  ];

  constructor(
    private fb: FormBuilder,
    private userSessionService: UserSessionService,
    private userDataService: UserDataService
  ) {
    this.form = this.fb.group({
      userName: [null],
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

  // Called when dropdown is shown - load initial 10 users
  onUserDropdownShow(): void {
    // Only load if suggestions are empty
    if (this.userSuggestions.length === 0) {
      this.loadInitialUsers();
    }
  }

  // Load initial 10 users
  private loadInitialUsers(): void {
    // Load with empty query to get first 10 users
    this.userDataService.searchBasic('').subscribe({
      next: (res: any) => {
        if (res && res.success && res.data && Array.isArray(res.data)) {
          this.userSuggestions = res.data.slice(0, 10).map((user: any) => {
            const userName = user.fullName || user.name || user.displayName || '';
            const userEmail = user.email || '';
            return {
              userId: user.id,
              fullName: userName,
              email: userEmail,
              name: user.name,
              displayName: user.displayName,
              displayLabel: userEmail ? `${userName} (${userEmail})` : userName || userEmail
            };
          });
        } else {
          this.userSuggestions = [];
        }
      },
      error: () => {
        this.userSuggestions = [];
      }
    });
  }

  // Called when user types in the filter box
  onUserFilter(event: any): void {
    const name = event.filter?.trim();
    
    // Clear previous timeout
    if (this.userFilterTimeout) {
      clearTimeout(this.userFilterTimeout);
    }

    // If empty, load initial users
    if (!name) {
      this.loadInitialUsers();
      return;
    }

    // Debounce search with 1 second delay
    this.userFilterTimeout = setTimeout(() => {
      this.userDataService.searchBasic(name).subscribe({
        next: (res: any) => {
          if (res && res.success && res.data && Array.isArray(res.data)) {
            this.userSuggestions = res.data.map((user: any) => {
              const userName = user.fullName || user.name || user.displayName || '';
              const userEmail = user.email || '';
              return {
                userId: user.id,
                fullName: userName,
                email: userEmail,
                name: user.name,
                displayName: user.displayName,
                displayLabel: userEmail ? `${userName} (${userEmail})` : userName || userEmail
              };
            });
          } else {
            this.userSuggestions = [];
          }
        },
        error: (err) => {
          console.error('Error searching users:', err);
          this.userSuggestions = [];
        }
      });
    }, 1000);
  }

  // Called when a user is selected
  onUserSelect(event: any): void {
    if (event.value) {
      this.selectedUserId = event.value.userId ? String(event.value.userId) : null;
      console.log('Selected user:', event.value.displayLabel, 'with userId:', this.selectedUserId);
    } else {
      // Cleared
      this.selectedUserId = null;
    }
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
      userName: null,
      startDate: ''
    });
    this.selectedUserId = null;
    this.userSuggestions = [];
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
