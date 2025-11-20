import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Meeting } from '../../models/meeting.model';
import {
  DocumentEditLog,
  DocumentEditLogSearchParams,
  DocumentEditLogService
} from '../../services/document-edit-log.service';
import { MeetingService } from '../../services/meeting.service';
import { UserDataService } from '../../services/user-data.service';

interface ColumnConfig {
  field: string;
  header: string;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  visible: boolean;
  defaultVisible: boolean;
  alwaysVisible?: boolean;
}

interface EditorSuggestion {
  userId: number;
  fullName: string;
  email?: string;
  displayLabel: string;
}

@Component({
  selector: 'app-edit-log-management',
  templateUrl: './edit-log-management.component.html',
  styleUrls: ['./edit-log-management.component.scss']
})
export class EditLogManagementComponent implements OnInit, OnDestroy {
  searchForm: FormGroup;

  loading = false;
  showColumnSelector = false;
  componentInitialized = false;
  rows: DocumentEditLog[] = [];
  totalRecords = 0;
  page = 0;
  size = 10;
  sortBy: string = 'editedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  meetingSuggestions: Meeting[] = [];
  editorSuggestions: EditorSuggestion[] = [];
  private meetingFilterTimeout: ReturnType<typeof setTimeout> | null = null;
  private editorFilterTimeout: ReturnType<typeof setTimeout> | null = null;

  private selectedMeetingId: number | null = null;
  private selectedEditorId: number | null = null;

  columnConfig: ColumnConfig[] = [
    {
      field: 'id',
      header: 'ID',
      sortable: true,
      width: '80px',
      minWidth: '80px',
      visible: true,
      defaultVisible: true,
      alwaysVisible: true
    },
    {
      field: 'editedByName',
      header: 'Người chỉnh sửa',
      sortable: true,
      minWidth: '180px',
      visible: true,
      defaultVisible: true
    },
    {
      field: 'meetingTitle',
      header: 'Cuộc họp',
      sortable: true,
      minWidth: '180px',
      visible: true,
      defaultVisible: true
    },
    {
      field: 'changeSummary',
      header: 'Nội dung',
      sortable: false,
      minWidth: '260px',
      visible: true,
      defaultVisible: true
    },
    {
      field: 'editedAt',
      header: 'Thời gian',
      sortable: true,
      width: '200px',
      minWidth: '180px',
      visible: true,
      defaultVisible: true
    },
    {
      field: 'relativeTime',
      header: 'Thời gian tương đối',
      sortable: false,
      width: '150px',
      minWidth: '150px',
      visible: true,
      defaultVisible: true
    }
  ];

  constructor(
    private fb: FormBuilder,
    private documentEditLogService: DocumentEditLogService,
    private meetingService: MeetingService,
    private userDataService: UserDataService,
    private messageService: MessageService
  ) {
    this.searchForm = this.fb.group({
      meeting: [null],
      editor: [null]
    });
  }

  ngOnInit(): void {
    this.loadInitialMeetings();
    this.loadInitialEditors();
    this.loadLogs();
    setTimeout(() => {
      this.componentInitialized = true;
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.meetingFilterTimeout) {
      clearTimeout(this.meetingFilterTimeout);
    }
    if (this.editorFilterTimeout) {
      clearTimeout(this.editorFilterTimeout);
    }
  }

  get displayedColumns(): ColumnConfig[] {
    return this.columnConfig.filter((col) => col.visible);
  }

  get globalFilterFields(): string[] {
    return this.displayedColumns
      .filter((col) => col.field !== 'id' && col.field !== 'relativeTime')
      .map((col) => col.field);
  }

  getRelativeTime(dateString: string): string {
    if (!dateString) return '-';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 0) return 'Vừa xong';
    if (diffInSeconds < 60) return `${diffInSeconds} giây trước`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} ngày trước`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} tháng trước`;
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} năm trước`;
  }

  onSearch(): void {
    this.page = 0;
    this.loadLogs();
  }

  onClear(): void {
    this.searchForm.reset({
      meeting: null,
      editor: null
    });
    this.selectedMeetingId = null;
    this.selectedEditorId = null;
    this.meetingSuggestions = [];
    this.editorSuggestions = [];
    this.page = 0;
    this.loadInitialMeetings();
    this.loadInitialEditors();
    this.loadLogs();
  }

  onPageChange(event: any): void {
    this.size = event.rows;
    this.page = Math.floor(event.first / event.rows);
    this.loadLogs();
  }

  onSortChange(event: any): void {
    if (!event || !event.field || this.loading || !this.componentInitialized) {
      return;
    }
    const newDirection = event.order === 1 ? 'asc' : 'desc';
    if (event.field !== this.sortBy || newDirection !== this.sortDirection) {
      this.sortBy = event.field;
      this.sortDirection = newDirection;
      this.loadLogs();
    }
  }

  onMeetingDropdownShow(): void {
    if (!this.meetingSuggestions.length) {
      this.loadInitialMeetings();
    }
  }

  toggleColumnVisibility(column: ColumnConfig): void {
    if (column.alwaysVisible) {
      return;
    }
    column.visible = !column.visible;
    if (!this.displayedColumns.length) {
      column.visible = true;
    }
  }

  resetColumnVisibility(): void {
    this.columnConfig.forEach((col) => {
      col.visible = col.defaultVisible || col.alwaysVisible || false;
    });
  }

  onMeetingFilter(event: any): void {
    const title = event.filter?.trim();
    if (this.meetingFilterTimeout) {
      clearTimeout(this.meetingFilterTimeout);
    }
    if (!title) {
      this.loadInitialMeetings();
      return;
    }

    this.meetingFilterTimeout = setTimeout(() => {
      this.meetingService.searchMeeting({ title, size: 10 }).subscribe({
        next: (res: any) => {
          this.meetingSuggestions = res?.data?.content || [];
        },
        error: () => {
          this.meetingSuggestions = [];
        }
      });
    }, 1000);
  }

  onMeetingSelect(event: any): void {
    if (event.value) {
      this.selectedMeetingId = event.value.id ?? null;
    } else {
      this.selectedMeetingId = null;
    }
  }

  onEditorDropdownShow(): void {
    if (!this.editorSuggestions.length) {
      this.loadInitialEditors();
    }
  }

  onEditorFilter(event: any): void {
    const query = event.filter?.trim();
    if (this.editorFilterTimeout) {
      clearTimeout(this.editorFilterTimeout);
    }
    if (!query) {
      this.loadInitialEditors();
      return;
    }

    this.editorFilterTimeout = setTimeout(() => {
      this.userDataService.searchBasic(query).subscribe({
        next: (res: any) => {
          this.editorSuggestions = Array.isArray(res?.data)
            ? res.data.map((user: any) => this.mapUserToSuggestion(user))
            : [];
        },
        error: () => {
          this.editorSuggestions = [];
        }
      });
    }, 1000);
  }

  onEditorSelect(event: any): void {
    if (event.value) {
      this.selectedEditorId = event.value.userId ?? null;
    } else {
      this.selectedEditorId = null;
    }
  }

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

  private loadInitialEditors(): void {
    this.userDataService.searchBasic('').subscribe({
      next: (res: any) => {
        this.editorSuggestions = Array.isArray(res?.data)
          ? res.data.slice(0, 10).map((user: any) => this.mapUserToSuggestion(user))
          : [];
      },
      error: () => {
        this.editorSuggestions = [];
      }
    });
  }

  private mapUserToSuggestion(user: any): EditorSuggestion {
    const fullName = user.fullName || user.name || user.displayName || '';
    const email = user.email || '';
    return {
      userId: user.id,
      fullName,
      email,
      displayLabel: email ? `${fullName} (${email})` : fullName || email
    };
  }

  private loadLogs(): void {
    this.loading = true;
    const params: DocumentEditLogSearchParams = {
      meetingId: this.selectedMeetingId || undefined,
      editedById: this.selectedEditorId || undefined,
      page: this.page,
      size: this.size,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };

    this.documentEditLogService.searchDocumentEditLogs(params).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.rows = res.data.content || [];
          this.totalRecords = res.data.totalElements || 0;
        } else {
          this.rows = [];
          this.totalRecords = 0;
        }
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.totalRecords = 0;
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tải log chỉnh sửa. Vui lòng thử lại.',
          life: 4000
        });
      }
    });
  }
}

