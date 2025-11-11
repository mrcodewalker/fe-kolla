import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AttendanceLogService, AttendanceLogItem } from '../../services/attendance-log.service';

interface ColumnConfig {
  field: keyof AttendanceLogItem | 'roomName';
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
  selector: 'app-join-history',
  templateUrl: './join-history.component.html',
  styleUrls: ['./join-history.component.scss']
})
export class JoinHistoryComponent implements OnInit {
  form: FormGroup;

  loading = false;
  rows: AttendanceLogItem[] = [];
  totalRecords = 0;
  page = 0; // 0-based
  size = 10;
  sortBy = 'joinAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  showColumnSelector = false;
  componentInitialized = false;

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
      field: 'joinAt', 
      header: 'Thời gian vào', 
      type: 'date', 
      format: 'dd/MM/yyyy HH:mm', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'leaveAt', 
      header: 'Thời gian ra', 
      type: 'date', 
      format: 'dd/MM/yyyy HH:mm', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'roomName', 
      header: 'Tên phòng họp', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true,
      sortable: false
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
      field: 'location', 
      header: 'Vị trí', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    }
  ];

  constructor(
    private fb: FormBuilder,
    private attendanceLogService: AttendanceLogService
  ) {
    this.form = this.fb.group({
      ipAddress: [''],
      joinAt: [''],
      leaveAt: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
    // Mark component as initialized after a small delay
    
    setTimeout(() => {
      this.componentInitialized = true;
    }, 100);
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
      ipAddress: '',
      joinAt: '',
      leaveAt: ''
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
    const { ipAddress, joinAt, leaveAt } = this.form.value;
    
    const searchParams: any = {
      page: this.page,
      size: this.size,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };

    // Add search parameters if they have values
    if (ipAddress && ipAddress.trim()) {
      searchParams.ip = ipAddress.trim();
    }
    if (joinAt) {
      // Convert to dd/MM/yyyy format
      const date = new Date(joinAt);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      searchParams.startDate = `${day}/${month}/${year}`;
    }
    if (leaveAt) {
      // Convert to dd/MM/yyyy format
      const date = new Date(leaveAt);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      searchParams.endDate = `${day}/${month}/${year}`;
    }

    this.attendanceLogService.getMyAttendanceLogs(searchParams).subscribe({
      next: (res) => {
        const data = res?.data;
        // Transform data to include roomName at root level for easier display
        const content = data?.content || [];
        this.rows = content.map((item: any) => ({
          ...item,
          roomName: item.meeting?.roomName || '-'
        }));
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