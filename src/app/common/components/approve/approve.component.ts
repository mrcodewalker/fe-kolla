import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RoomDataService } from '../../services/room-data.service';
import { MemberService } from '../../services/member.service';
import { MeetingService } from '../../services/meeting.service';
import { UserDataService } from '../../services/user-data.service';
import { ApproveService, MemberItem, MemberSearchParams } from '../../services/approve.service';
import { Member, ApprovalRequest, RejectRequest } from '../../models/member.model';
import { Meeting } from '../../models/meeting.model';

interface ColumnConfig {
  field: keyof MemberItem | 'actions';
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
  selector: 'app-approve',
  templateUrl: './approve.component.html',
  styleUrls: ['./approve.component.scss'],
})
export class ApproveComponent implements OnInit {
  form: FormGroup;
  approveTab: 'pending' | 'joined' = 'pending';
  
  // Datatable properties
  loading = false;
  rows: MemberItem[] = [];
  totalRecords = 0;
  page = 0; // 0-based
  size = 10;
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  showColumnSelector = false;
  componentInitialized = false;

  // Autocomplete for meeting name
  meetingSuggestions: Meeting[] = [];
  showMeetingDropdown = false;
  private meetingInputTimeout: any;
  selectedMeetingIdFromSearch: number | null = null;

  // Autocomplete for member name
  memberSuggestions: any[] = [];
  private memberInputTimeout: any;
  selectedUserIdFromSearch: string | null = null;
  memberDropdownHovered = false;

  // Legacy properties (keeping for compatibility)
  roomList: any[] = [];
  selectedRoom: any = null;
  selectedMeetingId: number | null = null;
  joinedRequest: Member[] = [];
  joinedMembers: Member[] = [];

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
      header: 'Tên người dùng', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true,
      sortable: false
    },
    { 
      field: 'userEmail', 
      header: 'Email', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'meetingTitle', 
      header: 'Tiêu đề cuộc họp', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'meetingCode', 
      header: 'Mã cuộc họp', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true,
      sortable: false
    },
    { 
      field: 'roleName', 
      header: 'Vai trò', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'createdAt', 
      header: 'Thời gian tạo', 
      type: 'date', 
      format: 'dd/MM/yyyy HH:mm', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'active', 
      header: 'Trạng thái', 
      type: 'boolean', 
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

  actionsColumn = {
    field: 'actions',
    header: 'Hành động',
    visible: true,
    alwaysVisible: true,
    sortable: false,
    template: 'actionsTemplate'
  };

  constructor(
    private fb: FormBuilder,
    private roomDataService: RoomDataService,
    private memberService: MemberService,
    private meetingService: MeetingService,
    private approveService: ApproveService,
    private userDataService: UserDataService
  ) {
    this.form = this.fb.group({
      meetingName: [''],
      memberName: [''],
      userId: [''],
      meetingId: [''],
      roleId: [''],
      isActive: [null]
    });
  }

  ngOnInit(): void {
    this.loadRooms();
    this.loadData();
    // Mark component as initialized after a small delay
    setTimeout(() => {
      this.componentInitialized = true;
    }, 100);
  }

  // Meeting Name autocomplete methods
  onMeetingNameInput(): void {
    const keyword = this.form.get('meetingName')?.value?.trim();
    // If user edits the input after selection, clear selectedMeetingIdFromSearch
    this.selectedMeetingIdFromSearch = null;
    if (this.meetingInputTimeout) {
      clearTimeout(this.meetingInputTimeout);
    }
    if (!keyword) {
      this.meetingSuggestions = [];
      return;
    }
    this.meetingInputTimeout = setTimeout(() => {
      this.meetingService.searchMeeting({ keyword: keyword, size: 10 }).subscribe({
        next: (res: any) => {
          console.log('Meeting search response:', res);
          // API returns paged response, get content
          this.meetingSuggestions = res?.data?.content || [];
          console.log('Meeting suggestions:', this.meetingSuggestions);
        },
        error: (err) => {
          console.error('Error searching meetings:', err);
          this.meetingSuggestions = [];
        }
      });
    }, 2000);
  }

  onMeetingInputBlur(): void {
    setTimeout(() => {
      this.showMeetingDropdown = false;
      this.meetingSuggestions = [];
    }, 200);
  }

  selectMeetingSuggestion(meeting: Meeting): void {
    this.form.get('meetingName')?.setValue(meeting.title);
    // Store the selected meeting's meetingId
    this.selectedMeetingIdFromSearch = meeting.id || null;
    console.log('Selected meeting:', meeting.title, 'with meetingId:', this.selectedMeetingIdFromSearch);
    this.meetingSuggestions = [];
    this.showMeetingDropdown = false;
  }

  // Member Name autocomplete methods
  onMemberNameInput(): void {
    const query = this.form.get('memberName')?.value?.trim();
    // If user edits the input after selection, clear selectedUserIdFromSearch
    this.selectedUserIdFromSearch = null;
    if (this.memberInputTimeout) {
      clearTimeout(this.memberInputTimeout);
    }
    if (!query) {
      this.memberSuggestions = [];
      return;
    }
    this.memberInputTimeout = setTimeout(() => {
      this.userDataService.searchBasic(query).subscribe({
        next: (res: any) => {
          console.log('User search response:', res);
          if (res && res.success && res.data && Array.isArray(res.data)) {
            this.memberSuggestions = res.data.map((user: any) => ({
              userId: user.id,
              fullName: user.fullName || user.name || user.displayName,
              email: user.email,
              name: user.name,
              displayName: user.displayName
            }));
            console.log('Member suggestions:', this.memberSuggestions);
          } else {
            this.memberSuggestions = [];
          }
        },
        error: (err) => {
          console.error('Error searching users:', err);
          this.memberSuggestions = [];
        }
      });
    }, 2000);
  }

  onMemberInputBlur(): void {
    setTimeout(() => {
      if (!this.memberDropdownHovered) {
        this.memberSuggestions = [];
      }
    }, 200);
  }

  selectMemberSuggestion(user: any): void {
    const displayName = user.fullName || user.name || user.displayName || user.email;
    this.form.get('memberName')?.setValue(displayName);
    // Store the selected user's userId
    this.selectedUserIdFromSearch = user.userId ? String(user.userId) : null;
    console.log('Selected member:', displayName, 'with userId:', this.selectedUserIdFromSearch);
    this.memberSuggestions = [];
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
      meetingName: '',
      memberName: '',
      userId: '',
      meetingId: '',
      roleId: '',
      isActive: null
    });
    this.selectedMeetingIdFromSearch = null;
    this.selectedUserIdFromSearch = null;
    this.page = 0;
    this.loadData();
  }

  onPageChange(event: any): void {
    this.size = event.rows;
    this.page = Math.floor(event.first / event.rows);
    this.loadData();
  }

  onSortChange(event: any): void {
    // Prevent sort during initialization or if already loading
    if (!event || !event.field || this.loading || !this.componentInitialized) {
      return;
    }
    
    const newSortBy = event.field;
    const newSortDirection = event.order === 1 ? 'asc' as const : 'desc' as const;
    
    // Only reload data if sort actually changed
    if (this.sortBy !== newSortBy || this.sortDirection !== newSortDirection) {
      this.sortBy = newSortBy;
      this.sortDirection = newSortDirection;
      this.loadData();
    }
  }

  private loadData(): void {
    this.loading = true;
    const { roleId, isActive } = this.form.value;
    
    const searchParams: MemberSearchParams = {
      page: this.page,
      size: this.size,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };

    // Add search parameters from autocomplete selections
    if (this.selectedMeetingIdFromSearch) {
      searchParams.meetingId = this.selectedMeetingIdFromSearch;
      console.log('Searching with meetingId:', this.selectedMeetingIdFromSearch);
    }
    if (this.selectedUserIdFromSearch) {
      const userIdNum = Number(this.selectedUserIdFromSearch);
      if (!isNaN(userIdNum)) {
        searchParams.userId = userIdNum;
        console.log('Searching with userId:', userIdNum);
      }
    }
    if (roleId !== undefined && roleId !== null && roleId !== '') {
      searchParams.roleId = parseInt(roleId);
    }
    if (isActive !== undefined && isActive !== null) {
      searchParams.isActive = isActive;
    }

    console.log('Search Params:', searchParams);

    this.approveService.searchMembers(searchParams).subscribe({
      next: (res) => {
        console.log('Search results:', res);
        if (res.success && res.data && res.data.content && res.data.content.length > 0) {
          this.rows = res.data.content[0].members || [];
          this.totalRecords = res.data.totalElements || 0;
        } else {
          this.rows = [];
          this.totalRecords = 0;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error searching members:', err);
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

  loadRooms() {
    this.roomDataService.getAll().subscribe((res: any) => {
      this.roomList = res.data || [];
    });
  }

  approveRequest(req: MemberItem | Member) {
    const meetingId = 'meetingId' in req ? req.meetingId : this.selectedMeetingId;
    const roleId = 'roleId' in req ? req.roleId : (req as Member).roleId;
    
    if (!meetingId) {
      console.error('Không tìm thấy meetingId');
      return;
    }
    
    if (!roleId) {
      console.error('Không tìm thấy roleId');
      return;
    }
    
    // Gọi API chấp nhận yêu cầu với URL /members/approve
    const payload = {
      meetingId: meetingId,
      approvals: [{
        memberId: req.id,
        roleId: roleId
      }]
    };
    
    console.log('Approve payload:', payload);
    
    this.memberService.approveMembers(payload).subscribe({
      next: (response) => {
        console.log('Chấp nhận thành công:', response);
        // Refresh datatable
        this.loadData();
        // Legacy compatibility
        this.joinedRequest = this.joinedRequest.filter((r) => r.id !== req.id);
        if (this.selectedRoom?.id) {
          this.loadRequestsForRoom(this.selectedRoom.id);
        }
      },
      error: (err) => {
        console.error('Lỗi chấp nhận yêu cầu:', err);
      }
    });
  }

  rejectRequest(req: MemberItem | Member) {
    const meetingId = 'meetingId' in req ? req.meetingId : this.selectedMeetingId;
    
    if (!meetingId) {
      console.error('Không tìm thấy meetingId');
      return;
    }
    
    // Gọi API từ chối yêu cầu với URL /members/reject
    const payload: RejectRequest = {
      meetingId: meetingId,
      rejects: [{
        memberId: req.id
      }]
    };
    
    console.log('Reject payload:', payload);
    
    this.memberService.rejectMembers(payload).subscribe({
      next: (response) => {
        console.log('Từ chối thành công:', response);
        // Refresh datatable
        this.loadData();
        // Legacy compatibility
        this.joinedRequest = this.joinedRequest.filter((r) => r.id !== req.id);
      },
      error: (err) => {
        console.error('Lỗi từ chối yêu cầu:', err);
      }
    });
  }

  getRequestsForRoom(roomId: number) {
    this.selectedRoom = this.roomList.find(r => r.id === roomId);
    // Lấy meetings của room để có meetingId
    this.meetingService.getMeetingsByRoom(roomId).subscribe({
      next: (res: any) => {
        if (res.success && res.data && res.data.content && res.data.content.length > 0) {
          // Lấy meeting đầu tiên (hoặc có thể để user chọn)
          this.selectedMeetingId = res.data.content[0].id;
          this.loadRequestsForRoom(roomId);
          this.getJoinedMembersForRoom(roomId);
        } else {
          console.warn('Không tìm thấy meeting cho room này');
          this.selectedMeetingId = null;
          this.joinedRequest = [];
          this.joinedMembers = [];
        }
      },
      error: (err) => {
        console.error('Lỗi lấy meetings:', err);
        this.selectedMeetingId = null;
      }
    });
  }

  getJoinedMembersForRoom(roomId: number) {
    if (!this.selectedMeetingId) {
      this.joinedMembers = [];
      return;
    }
    this.memberService.searchMembers({ meetingId: this.selectedMeetingId, isActive: true }).subscribe({
      next: (res: any) => {
        if (res.success && res.data && res.data.content && res.data.content.length > 0) {
          this.joinedMembers = res.data.content[0].members || [];
        } else {
          this.joinedMembers = [];
        }
      },
      error: (err) => {
        console.error('Lỗi lấy danh sách thành viên:', err);
        this.joinedMembers = [];
      }
    });
  }

  loadRequestsForRoom(roomId: number) {
    if (!this.selectedMeetingId) {
      this.joinedRequest = [];
      return;
    }
    this.memberService.searchMembers({ meetingId: this.selectedMeetingId, isActive: false }).subscribe({
      next: (res: any) => {
        if (res.success && res.data && res.data.content && res.data.content.length > 0) {
          this.joinedRequest = res.data.content[0].members || [];
        } else {
          this.joinedRequest = [];
        }
      },
      error: (err) => {
        console.error('Lỗi lấy danh sách yêu cầu:', err);
        this.joinedRequest = [];
      }
    });
  }

  // Helper method to get nested object values
  getValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o && o[p], obj);
  }

  // Method to approve member
  approveMember(member: any): void {
    if (this.loading) return;
    
    this.loading = true;
    console.log('Approving member:', member);
    
    // Call approve API
    // this.approveService.approveMember(member.id).subscribe({
    //   next: (response) => {
    //     console.log('Member approved successfully:', response);
    //     // Refresh data or update member status
    //     this.loading = false;
    //   },
    //   error: (error) => {
    //     console.error('Error approving member:', error);
    //     this.loading = false;
    //   }
    // });
    
    // For now, just simulate API call
    setTimeout(() => {
      this.loading = false;
      console.log('Member approved successfully');
    }, 1000);
  }

  // Method to reject member
  rejectMember(member: any): void {
    if (this.loading) return;
    
    this.loading = true;
    console.log('Rejecting member:', member);
    
    // Call reject API
    // this.approveService.rejectMember(member.id).subscribe({
    //   next: (response) => {
    //     console.log('Member rejected successfully:', response);
    //     // Refresh data or update member status
    //     this.loading = false;
    //   },
    //   error: (error) => {
    //     console.error('Error rejecting member:', error);
    //     this.loading = false;
    //   }
    // });
    
    // For now, just simulate API call
    setTimeout(() => {
      this.loading = false;
      console.log('Member rejected successfully');
    }, 1000);
  }

}
