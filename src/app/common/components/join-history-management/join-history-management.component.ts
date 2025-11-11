  import { UserDataService } from '../../services/user-data.service';
import { Component, OnInit, AfterViewInit, ViewEncapsulation } from '@angular/core';
import { MeetingService } from '../../services/meeting.service';
import { Meeting } from '../../models/meeting.model';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AttendanceLogService, AttendanceLogItem, AttendanceLogsSearchParams } from '../../services/attendance-log.service';

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
  selector: 'app-join-history-management',
  templateUrl: './join-history-management.component.html',
  styleUrls: [
    './join-history-management.component.scss',
    './column-dialog-override.scss'
  ],
  encapsulation: ViewEncapsulation.None
})
export class JoinHistoryManagementComponent implements OnInit, AfterViewInit {
  form: FormGroup;

  loading = false;
  rows: AttendanceLogItem[] = [];
  totalRecords = 0;
  page = 0; // 0-based
  size = 10;
  sortBy = 'joinAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  showColumnSelector = false;

  // Track selected member's userId
  selectedMemberId: string | null = null;
  // Track selected meeting's meetingId
  selectedMeetingId: number | null = null;
  componentInitialized = false;

  // Calendar configuration to prevent duplicate rendering
  calendarConfig = {
    locale: 'vi',
    showIcon: true,
    iconDisplay: 'input' as const,
    icon: 'pi pi-calendar',
    appendTo: 'body',
    touchUI: false,
    readonlyInput: false,
    showClear: false,
    keepInvalid: false,
    hideOnDateTimeSelect: true,
    showButtonBar: false
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

  // Autocomplete for meeting name
  meetingSuggestions: Meeting[] = [];
  showMeetingDropdown = false;
  private meetingInputTimeout: any;
  private meetingFilterTimeout: any;

  // Autocomplete for member name
  memberSuggestions: any[] = [];
  private memberInputTimeout: any;
  private memberFilterTimeout: any;

  constructor(
    private fb: FormBuilder,
    private attendanceLogService: AttendanceLogService,
    private meetingService: MeetingService,
    private userDataService: UserDataService
  ) {
    this.form = this.fb.group({
      keyword: [null],
      memberName: [null],
      startDate: [''],
      endDate: ['']
    });
  }

  // Called when dropdown is shown - load initial 10 members
  onMemberDropdownShow(): void {
    // Only load if suggestions are empty
    if (this.memberSuggestions.length === 0) {
      this.loadInitialMembers();
    }
  }

  // Load initial 10 members
  private loadInitialMembers(): void {
    // Load with empty query to get first 10 users
    this.userDataService.searchBasic('').subscribe({
      next: (res: any) => {
        if (res && res.success && res.data && Array.isArray(res.data)) {
          this.memberSuggestions = res.data.slice(0, 10).map((user: any) => ({
            userId: user.id,
            fullName: user.fullName || user.name || user.displayName,
            email: user.email,
            name: user.name,
            displayName: user.displayName,
            displayLabel: user.fullName || user.name || user.displayName || user.email
          }));
        } else {
          this.memberSuggestions = [];
        }
      },
      error: () => {
        this.memberSuggestions = [];
      }
    });
  }

  // Called when user types in the filter box
  onMemberFilter(event: any): void {
    const name = event.filter?.trim();
    
    // Clear previous timeout
    if (this.memberFilterTimeout) {
      clearTimeout(this.memberFilterTimeout);
    }

    // If empty, load initial members
    if (!name) {
      this.loadInitialMembers();
      return;
    }

    // Debounce search with 1 second delay
    this.memberFilterTimeout = setTimeout(() => {
      this.userDataService.searchBasic(name).subscribe({
        next: (res: any) => {
          if (res && res.success && res.data && Array.isArray(res.data)) {
            this.memberSuggestions = res.data.map((user: any) => ({
              userId: user.id,
              fullName: user.fullName || user.name || user.displayName,
              email: user.email,
              name: user.name,
              displayName: user.displayName,
              displayLabel: user.fullName || user.name || user.displayName || user.email
            }));
          } else {
            this.memberSuggestions = [];
          }
        },
        error: (err) => {
          console.error('Error searching users:', err);
          this.memberSuggestions = [];
        }
      });
    }, 1000);
  }

  // Called when a member is selected
  onMemberSelect(event: any): void {
    if (event.value) {
      this.selectedMemberId = event.value.userId ? String(event.value.userId) : null;
      console.log('Selected member:', event.value.displayLabel, 'with userId:', this.selectedMemberId);
    } else {
      // Cleared
      this.selectedMemberId = null;
    }
  }
  
  // Called when dropdown is shown - load initial 10 random meetings
  onMeetingDropdownShow(): void {
    // Only load if suggestions are empty
    if (this.meetingSuggestions.length === 0) {
      this.loadInitialMeetings();
    }
  }

  // Load initial 10 random meetings
  private loadInitialMeetings(): void {
    this.meetingService.searchMeeting({ size: 10 }).subscribe({
      next: (res: any) => {
        this.meetingSuggestions = res?.data?.content || [];
      },
      error: () => {
        this.meetingSuggestions = [];
      }
    });
  }

  // Called when user types in the filter box
  onMeetingFilter(event: any): void {
    const title = event.filter?.trim();
    
    // Clear previous timeout
    if (this.meetingFilterTimeout) {
      clearTimeout(this.meetingFilterTimeout);
    }

    // If empty, load initial meetings
    if (!title) {
      this.loadInitialMeetings();
      return;
    }

    // Debounce search with 1 second delay
    this.meetingFilterTimeout = setTimeout(() => {
      this.meetingService.searchMeeting({ title: title, size: 10 }).subscribe({
        next: (res: any) => {
          this.meetingSuggestions = res?.data?.content || [];
        },
        error: () => {
          this.meetingSuggestions = [];
        }
      });
    }, 1000);
  }

  // Called when a meeting is selected
  onMeetingSelect(event: any): void {
    if (event.value) {
      this.selectedMeetingId = event.value.id || null;
      console.log('Selected meeting:', event.value.title, 'with id:', this.selectedMeetingId);
    } else {
      // Cleared
      this.selectedMeetingId = null;
    }
  }

  ngOnInit(): void {
    this.loadData();
    // Mark component as initialized after a small delay
    setTimeout(() => {
      this.componentInitialized = true;
    }, 100);
    
    // Fix calendar duplicate issue
    this.fixCalendarDuplicates();
  }

  ngAfterViewInit(): void {
    // Additional fix after view init
    setTimeout(() => {
      this.fixCalendarDuplicates();
    }, 500);
  }

  private fixCalendarDuplicates(): void {
    // Observer to watch for calendar DOM changes
    const observer = new MutationObserver(() => {
      const calendars = document.querySelectorAll('.p-datepicker .p-datepicker-date');
      calendars.forEach(dateElement => {
        // Remove duplicate text nodes
        const textNodes = Array.from(dateElement.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        if (textNodes.length > 1) {
          // Keep only the first text node
          for (let i = 1; i < textNodes.length; i++) {
            dateElement.removeChild(textNodes[i]);
          }
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Clean up observer after 5 seconds
    setTimeout(() => {
      observer.disconnect();
    }, 5000);
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
    this.loading = true;
    this.page = 0; // reset to first page on search
    this.loadData();
  }

  onClear(): void {
    this.form.reset({
      keyword: null,
      memberName: null,
      startDate: '',
      endDate: ''
    });
    this.selectedMemberId = null;
    this.selectedMeetingId = null;
    this.meetingSuggestions = [];
    this.memberSuggestions = [];
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
    const { startDate, endDate } = this.form.value;

    const searchParams: AttendanceLogsSearchParams = {
      page: this.page,
      size: this.size,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };

    // If a meeting is selected from dropdown, use its meetingId
    if (this.selectedMeetingId) {
      searchParams.meetingId = this.selectedMeetingId;
      console.log('Searching with meetingId:', this.selectedMeetingId);
    }
    // If a member is selected from dropdown, use their userId
    if (this.selectedMemberId) {
      const userIdNum = Number(this.selectedMemberId);
      if (!isNaN(userIdNum)) {
        searchParams.userId = userIdNum;
        console.log('Searching with userId:', userIdNum);
      }
    }
    if (startDate) {
      const date = new Date(startDate);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      searchParams.startDate = `${day}/${month}/${year}`;
    }
    if (endDate) {
      const date = new Date(endDate);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      searchParams.endDate = `${day}/${month}/${year}`;
    }

    console.log('Search params:', searchParams);
    this.attendanceLogService.searchAttendanceLogs(searchParams).subscribe({
      next: (res) => {
        console.log('Search results:', res);
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
      error: (err) => {
        console.error('Error searching attendance logs:', err);
        this.rows = [];
        this.totalRecords = 0;
        this.loading = false;
      }
    });
  }

  // Column Settings Methods
  onColumnToggle(column: ColumnConfig): void {
    const visibleCount = this.columnConfig.filter(col => col.visible).length;
    if (visibleCount === 0) {
      column.visible = true;
    }
  }

  toggleColumnCard(column: ColumnConfig): void {
    if (column.alwaysVisible) {
      return;
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
    this.showColumnSelector = false;
  }

  toggleColumnSettings(event: Event): void {
    this.showColumnSelector = !this.showColumnSelector;
  }
}