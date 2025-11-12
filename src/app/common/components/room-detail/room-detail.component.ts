interface MeetingWithHover extends Meeting {
  hover: boolean;
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService as PrimeMessageService } from 'primeng/api';
import { RoomDataService } from '../../services/room-data.service';
import { UserDataService } from '../../services/user-data.service';
import { MeetingService } from '../../services/meeting.service';
import { MemberService } from '../../services/member.service';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { MessageService, MessageItem } from '../../services/message.service';
import { Room } from '../../models/room.model';
import { Meeting } from '../../models/meeting.model';
import { MeetingMember, MembershipRequest, Role } from '../../models/member.model';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-room-detail',
  templateUrl: './room-detail.component.html',
  styleUrls: ['./room-detail.component.scss'],
})
export class RoomDetailComponent implements OnInit {
  meetingMenuId: number | null = null;
  room: Room | null = null;
  isHovered = false;
  showMeetings: boolean = true;
  meetings: MeetingWithHover[] = [];
  selectedMeeting: Meeting | null = null;
  mainTab: 'info' | 'room_members' | 'organizer' | 'messages' | 'documents' = 'info';
  meetingMembers: MeetingMember[] = [];
  joinedCount = 0;
  pendingCount = 0;
  currentPage = 0;
  pageSize = 10;
  totalMembers = 0;
  totalPages = 0;

  // Filter and selection properties for ADMIN
  isAdmin = false;
  selectedMembers: MeetingMember[] = [];
  filterApprovalStatus: 'all' | 'approved' | 'pending' = 'all';
  roles: Role[] = [
    { id: 1, name: 'ADMIN' },
    { id: 2, name: 'USER' },
    { id: 3, name: 'SECRETARY' },
    { id: 4, name: 'CO_ADMIN' }
  ];

  // Add member modal properties
  showAddMemberModal: boolean = false;
  searchUserQuery: string = '';
  searchUserResults: any[] = [];
  selectedUsersForAdd: any[] = [];
  isAllSearchedUsersSelected: boolean = false;
  selectedUserForDropdown: any = null;
  private userFilterTimeout: any;

  documents: Array<{ name: string; url: string }> = [
    { name: 'Biên bản họp.pdf', url: '#' },
    { name: 'Kế hoạch.xlsx', url: '#' }
  ];
  selectedFile: File | null = null;

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  uploadFile() {
    if (this.selectedFile) {
      // Demo: chỉ thêm vào danh sách, chưa upload thực tế
      this.documents.push({ name: this.selectedFile.name, url: '#' });
      this.selectedFile = null;
    }
  }

  messages: Array<MessageItem & { isMine: boolean }> = [];
  newMessage: string = '';
  currentUserId: number | null = null;
  
  // Message loading properties
  loadingMessages = false;
  messagePage = 0;
  messageSize = 10;
  totalMessages = 0;
  hasMoreMessages = true;
  private lastTriggeredMessageIndex = -1;
  
  // User cache to avoid multiple API calls for same user
  private userCache: Map<number, { name: string; email: string }> = new Map();

  sendMessage() {
    if (this.newMessage.trim() && this.selectedMeeting) {
      // TODO: Implement actual send message API call
      // For now, just add to local array
      const newMsg: MessageItem & { isMine: boolean } = {
        id: Date.now(),
        message: this.newMessage,
        sentAt: new Date().toISOString(),
        senderId: this.currentUserId || 0,
        meetingId: this.selectedMeeting.id,
        isMine: true
      };
      this.messages.push(newMsg);
      this.newMessage = '';
      setTimeout(() => {
        this.scrollToBottom();
      }, 50);
    }
  }
  showAddMeetingModal: boolean = false;
  showEditMeetingModal: boolean = false;
  showMembershipModal: boolean = false;
  showConfirmDialog: boolean = false;
  confirmDialogTitle: string = '';
  confirmDialogMessage: string = '';
  confirmDialogType: 'join' | 'role' | 'delete' | 'reject' | null = null;
  meetingToJoin: Meeting | null = null;
  roleChangeMember: MeetingMember | null = null;
  roleChangeRoleId: number | null = null;
  newMeeting: Partial<Meeting> = {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
  };
  editingMeeting: Partial<Meeting> = {
    id: 0,
    title: '',
    description: '',
    startTime: '',
    endTime: '',
  };
  timeValidationError: string = '';
  selectedDuration: string = '1'; // Default 1 hour
  selectedEditDuration: string = '1';

  constructor(
    private route: ActivatedRoute,
    private roomService: RoomDataService,
    private userDataService: UserDataService,
    private meetingService: MeetingService,
    private memberService: MemberService,
    private authService: AuthService,
    private loadingService: LoadingService,
    private messageService: PrimeMessageService,
    private messageDataService: MessageService
  ) {}

  ngOnInit() {
    // Check if current user is ADMIN
    const userRole = this.authService.getCurrentUserRole();
    this.isAdmin = userRole === 'ADMIN';

    // Get current user ID
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.currentUserId = currentUser.id;
    }

    const roomId = this.route.snapshot.paramMap.get('id');
    if (roomId) {
      this.roomService.getById(roomId).subscribe({
        next: (res: any) => {
          this.room = res.data;
          console.log(this.room);
        },
        error: (err) => console.error('Lỗi lấy thông tin phòng:', err),
      });
    }
    // Lấy danh sách meetings
    this.loadMeetings(roomId || undefined);
  }

  onSelectMeeting(meetingId: any) {
    // If clicking on the currently selected meeting, do nothing
    if (this.selectedMeeting?.id === meetingId) {
      return;
    }
    
    const meeting = this.meetings.find(m => m.id === meetingId);
    // Prevent selection if meeting is expired (unless user is ADMIN)
    if (meeting?.isExpired && !this.isAdmin) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Không thể chọn cuộc họp đã hết hạn'
      });
      return;
    }
    this.selectedMeeting = meeting || null;
    if (this.selectedMeeting) {
      this.currentPage = 0; // Reset to first page
      this.loadMeetingMembers(this.selectedMeeting.id);
      // Load messages if messages tab is active
      if (this.mainTab === 'messages') {
        this.loadMessages(true);
      }
    }
  }

  onAddMeeting() {
    this.showAddMeetingModal = true;
    // Get current time and format for datetime-local input
    const now = new Date();
    const currentTime = this.formatDateTimeLocal(now.toISOString());
    // Calculate end time based on default duration (1 hour)
    const endTime = this.calculateEndTime(currentTime, '1');
    
    this.newMeeting = {
      title: '',
      description: '',
      startTime: currentTime,
      endTime: endTime,
    };
    this.selectedDuration = '1'; // Reset to default
    this.timeValidationError = '';
  }

  onDurationChange() {
    if (this.newMeeting.startTime) {
      this.newMeeting.endTime = this.calculateEndTime(this.newMeeting.startTime, this.selectedDuration);
    }
  }

  onEditDurationChange() {
    if (this.editingMeeting.startTime) {
      this.editingMeeting.endTime = this.calculateEndTime(this.editingMeeting.startTime, this.selectedEditDuration);
    }
  }

  onManualEndTimeChange() {
    if (this.newMeeting.startTime && this.newMeeting.endTime) {
      this.selectedDuration = this.calculateDurationFromTimes(this.newMeeting.startTime, this.newMeeting.endTime);
    }
  }

  onManualEditEndTimeChange() {
    if (this.editingMeeting.startTime && this.editingMeeting.endTime) {
      this.selectedEditDuration = this.calculateDurationFromTimes(this.editingMeeting.startTime, this.editingMeeting.endTime);
    }
  }

  calculateEndTime(startTime: string, duration: string): string {
    const start = new Date(startTime);
    let end: Date;
    
    switch(duration) {
      case '3':
        end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3 hours
        break;
      case '5':
        end = new Date(start.getTime() + 5 * 60 * 60 * 1000); // 5 hours
        break;
      case '8':
        end = new Date(start.getTime() + 8 * 60 * 60 * 1000); // 8 hours
        break;
      case '24':
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // 1 day
        break;
      case 'forever':
        end = new Date(start.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
        break;
      default:
        end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default
    }
    
    return this.formatDateTimeLocal(end.toISOString());
  }

  validateTimes(): boolean {
    if (!this.newMeeting.startTime || !this.newMeeting.endTime) {
      this.timeValidationError = 'Vui lòng điền đầy đủ thời gian bắt đầu và kết thúc';
      return false;
    }
    
    const start = new Date(this.newMeeting.startTime!);
    const end = new Date(this.newMeeting.endTime!);
    
    if (start >= end) {
      this.timeValidationError = 'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc';
      return false;
    }
    
    this.timeValidationError = '';
    return true;
  }

  toggleMeetingMenu(id: number) {
    this.meetingMenuId = this.meetingMenuId === id ? null : id;
  }

  editMeeting(meeting: Meeting) {
    this.showEditMeetingModal = true;
    const startTime = this.formatDateTimeLocal(meeting.startTime);
    const endTime = this.formatDateTimeLocal(meeting.endTime);
    
    this.editingMeeting = {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      startTime: startTime,
      endTime: endTime,
    };
    
    // Calculate duration based on existing times
    this.selectedEditDuration = this.calculateDurationFromTimes(startTime, endTime);
    
    this.timeValidationError = '';
    this.meetingMenuId = null;
  }

  calculateDurationFromTimes(startTime: string, endTime: string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours <= 3) return '3';
    if (diffHours <= 5) return '5';
    if (diffHours <= 8) return '8';
    if (diffHours <= 24) return '24';
    if (diffHours > 24 * 365 * 50) return 'forever'; // More than 50 years
    return '1'; // Default
  }

  formatDateTimeLocal(dateTime: string | undefined): string {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  validateEditTimes(): boolean {
    if (!this.editingMeeting.startTime || !this.editingMeeting.endTime) {
      this.timeValidationError = 'Vui lòng điền đầy đủ thời gian bắt đầu và kết thúc';
      return false;
    }
    
    const start = new Date(this.editingMeeting.startTime!);
    const end = new Date(this.editingMeeting.endTime!);
    
    if (start >= end) {
      this.timeValidationError = 'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc';
      return false;
    }
    
    this.timeValidationError = '';
    return true;
  }

  updateMeeting() {
    if (!this.validateEditTimes()) return;
    if (!this.editingMeeting.id) return;
    
    // Format datetime-local to ISO string (without timezone conversion)
    const formatToISO = (datetimeLocal: string) => {
      // datetime-local format: "2025-10-27T22:40"
      // Convert to: "2025-10-27T22:40:00" (just add seconds, no timezone)
      if (!datetimeLocal) return '';
      return datetimeLocal + ':00';
    };
    
    const payload = {
      title: this.editingMeeting.title!,
      description: this.editingMeeting.description || '',
      startTime: formatToISO(this.editingMeeting.startTime!),
      endTime: formatToISO(this.editingMeeting.endTime!),
      roomId: this.room?.id,
    };
    
    this.loadingService.show();
    this.meetingService.update(this.editingMeeting.id, payload as any).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        this.showEditMeetingModal = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Cập nhật cuộc họp thành công'
        });
        this.loadMeetings();
      },
      error: (err: any) => {
        console.error('Lỗi cập nhật cuộc họp:', err);
        this.loadingService.hide();
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Có lỗi xảy ra khi cập nhật cuộc họp'
        });
      },
    });
  }

  deleteMeeting(id: number) {
    this.loadingService.show();
    this.meetingService.delete(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Xóa cuộc họp thành công'
        });
        this.loadMeetings();
      },
      error: (err) => {
        console.error('Error deleting meeting:', err);
        this.loadingService.hide();
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Có lỗi xảy ra khi xóa cuộc họp'
        });
      },
    });
  }

  addMeeting() {
    if (!this.validateTimes()) return;
    if (!this.newMeeting?.title || !this.newMeeting?.startTime || !this.newMeeting?.endTime) return;
    
    // Format datetime-local to ISO string (without timezone conversion)
    const formatToISO = (datetimeLocal: string) => {
      // datetime-local format: "2025-10-27T22:40"
      // Convert to: "2025-10-27T22:40:00" (just add seconds, no timezone)
      if (!datetimeLocal) return '';
      return datetimeLocal + ':00';
    };
    
    const payload = {
      title: this.newMeeting.title!,
      description: this.newMeeting.description || '',
      startTime: formatToISO(this.newMeeting.startTime!),
      endTime: formatToISO(this.newMeeting.endTime!),
      roomId: this.room?.id,
    };
    
    this.loadingService.show();
    this.meetingService.create(payload).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        this.showAddMeetingModal = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Tạo cuộc họp thành công'
        });
        this.loadMeetings();
      },
      error: (err: any) => {
        console.error('Lỗi tạo cuộc họp:', err);
        this.loadingService.hide();
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Có lỗi xảy ra khi tạo cuộc họp'
        });
      },
    });
  }

  now: number = Date.now();
  getMeetingStatus(meeting: Meeting): { text: string; color: string } {
    if (!meeting) return { text: '', color: '' };
    const now = Date.now();
    const start = new Date(meeting.startTime!).getTime();
    const end = new Date(meeting.endTime!).getTime();
    if (now < start) return { text: 'Sẵn sàng', color: 'text-green-600' };
    if (now >= start && now <= end)
      return { text: 'Đang bắt đầu', color: 'text-yellow-600' };
    if (now > end) return { text: 'Đã kết thúc', color: 'text-red-500' };
    return { text: '', color: '' };
  }

  loadMeetings(roomId?: string) {
    const id = roomId || this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadingService.show();
      this.meetingService.getMeetingsByRoom(id).subscribe({
        next: (res: any) => {
          // Handle new response structure: data is now an array
          const meetingsList = Array.isArray(res.data) ? res.data : (res.data.content || []);
          this.meetings = this.sortMeetings(meetingsList.map((m: Meeting) => ({
            ...m,
            hover: false,
          })));
          
          // Update selectedMeeting if it still exists in the list
          if (this.selectedMeeting) {
            const updatedMeeting = this.meetings.find(m => m.id === this.selectedMeeting?.id);
            if (updatedMeeting) {
              this.selectedMeeting = updatedMeeting;
              this.loadMeetingMembers(this.selectedMeeting.id);
            }
          } else if (this.meetings.length > 0) {
            this.onSelectMeeting(this.meetings[0].id);
          }
          
          console.log(res.data);
          this.loadingService.hide();
        },
        error: (err: any) => {
          console.error('Lỗi lấy danh sách cuộc họp:', err);
          this.loadingService.hide();
        },
      });
    }
  }

  sortMeetings(meetings: MeetingWithHover[]): MeetingWithHover[] {
    return meetings.sort((a, b) => {
      // Step 1: Expired meetings go to bottom
      if (a.isExpired && !b.isExpired) return 1;
      if (!a.isExpired && b.isExpired) return -1;
      
      // Step 2: Among non-expired meetings, coming soon + APPROVED go to top
      if (!a.isExpired && !b.isExpired) {
        // Check if a is coming soon with APPROVED status
        const aIsComingSoonApproved = a.isComingSoon && a.membershipStatus === 'APPROVED';
        const bIsComingSoonApproved = b.isComingSoon && b.membershipStatus === 'APPROVED';
        
        if (aIsComingSoonApproved && !bIsComingSoonApproved) return -1;
        if (!aIsComingSoonApproved && bIsComingSoonApproved) return 1;
      }
      
      // Step 3: Among expired meetings, keep original order
      // For other cases, keep original order
      return 0;
    });
  }

  onRefreshMeetings() {
    this.loadMeetings();
  }

  loadMeetingMembers(meetingId: number) {
    // Build search parameters
    const searchParams: any = {
      meetingId,
      page: this.currentPage,
      size: this.pageSize
    };
    
    // Only send isActive parameter if user is not admin
    if (!this.isAdmin) {
      searchParams.isActive = true;
    }

    // Add approval status filter if admin
    if (this.isAdmin && this.filterApprovalStatus !== 'all') {
      searchParams.isActive = this.filterApprovalStatus === 'approved' ? true : false;
    }

    this.loadingService.show();
    this.memberService.searchMembers(searchParams).subscribe({
      next: (res: any) => {
        if (res.success && res.data.content && res.data.content.length > 0) {
          const searchResult = res.data.content[0];
          this.meetingMembers = searchResult.members.map((m: MeetingMember) => ({
            ...m,
            selected: false
          }));
          this.joinedCount = searchResult.joinedCount;
          this.pendingCount = searchResult.pendingCount;
          this.totalMembers = res.data.totalElements;
          this.totalPages = res.data.totalPages;
        } else {
          this.meetingMembers = [];
          this.joinedCount = 0;
          this.pendingCount = 0;
          this.totalMembers = 0;
          this.totalPages = 0;
        }
        this.selectedMembers = [];
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Lỗi lấy danh sách thành viên cuộc họp:', err);
        this.loadingService.hide();
      },
    });
  }

  onTabChange(tab: 'info' | 'room_members' | 'organizer' | 'messages' | 'documents') {
    this.loadingService.show();
    // Small delay to show loading animation
    setTimeout(() => {
      this.mainTab = tab;
      // Load messages when switching to messages tab
      if (tab === 'messages' && this.selectedMeeting) {
        this.loadMessages(true);
      }
      this.loadingService.hide();
    }, 100);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    if (this.selectedMeeting) {
      this.loadMeetingMembers(this.selectedMeeting.id);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.onPageChange(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.onPageChange(this.currentPage - 1);
    }
  }

  goToFirstPage() {
    this.onPageChange(0);
  }

  goToLastPage() {
    this.onPageChange(this.totalPages - 1);
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const totalVisiblePages = 5;
    let startPage = Math.max(0, this.currentPage - Math.floor(totalVisiblePages / 2));
    let endPage = Math.min(this.totalPages - 1, startPage + totalVisiblePages - 1);
    
    if (endPage - startPage < totalVisiblePages - 1) {
      startPage = Math.max(0, endPage - totalVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  requestToJoinMeeting(meetingId: number): void {
    this.showMembershipModal = true;
  }

  onCloseMembershipModal(): void {
    this.showMembershipModal = false;
  }

  onMembershipSuccess(): void {
    this.showMembershipModal = false;
    // Reload meetings to update status
    this.loadMeetings();
  }

  joinMeeting(meeting: Meeting) {
    if (meeting.isExpired) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Không thể tham gia cuộc họp đã hết hạn'
      });
      return;
    }
    
    // Show confirm dialog
    this.meetingToJoin = meeting;
    this.confirmDialogTitle = 'Xác nhận tham gia cuộc họp';
    this.confirmDialogMessage = `Bạn có chắc chắn muốn tham gia cuộc họp "${meeting.title}"?`;
    this.confirmDialogType = 'join';
    this.showConfirmDialog = true;
  }

  executeJoinMeeting() {
    if (!this.meetingToJoin || !this.meetingToJoin.meetingLink) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Không tìm thấy link cuộc họp'
      });
      return;
    }
    
    const token = this.authService.getAuthToken();
    if (!token) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Không tìm thấy token xác thực'
      });
      return;
    }
    
    console.log(`Joining meeting ${this.meetingToJoin.id}`);
    // Navigate to meeting URL with params
    const meetingUrl = `https://36.50.54.109:8081?meetLink=${encodeURIComponent(this.meetingToJoin.meetingLink)}&token=${encodeURIComponent(token)}`;
    window.open(meetingUrl, '_blank');
  }

  // ADMIN-only functions
  toggleMemberSelection(member: MeetingMember) {
    if (!this.isAdmin) return;
    member.selected = !member.selected;
    this.updateSelectedMembers();
  }

  updateSelectedMembers() {
    this.selectedMembers = this.meetingMembers.filter(m => m.selected);
  }

  selectAllMembers() {
    const allSelected = this.isAllSelected;
    
    this.meetingMembers.forEach(m => {
      m.selected = !allSelected;
    });
    this.updateSelectedMembers();
  }

  onApprovalFilterChange() {
    if (this.selectedMeeting) {
      this.currentPage = 0;
      this.loadMeetingMembers(this.selectedMeeting.id);
    }
  }

  translateRole(roleName: string): string {
    const roleMap: { [key: string]: string } = {
      'USER': 'Người dùng',
      'ADMIN': 'Quản trị viên',
      'CO_ADMIN': 'Đồng quản trị',
      'SECRETARY': 'Thư ký'
    };
    return roleMap[roleName] || roleName;
  }

  onRoleChange(member: MeetingMember, roleId: number) {
    // If role is not changed, do nothing
    if (member.roleId === roleId) {
      return;
    }

    // Show confirm dialog
    this.roleChangeMember = member;
    this.roleChangeRoleId = roleId;
    const selectedRole = this.roles.find(r => r.id === roleId);
    const roleName = selectedRole ? this.translateRole(selectedRole.name) : 'vai trò mới';
    
    this.confirmDialogTitle = 'Xác nhận thay đổi vai trò';
    this.confirmDialogMessage = `Bạn có chắc chắn muốn thay đổi vai trò của "${member.name || member.userEmail}" thành "${roleName}"?`;
    this.confirmDialogType = 'role';
    this.showConfirmDialog = true;
  }

  executeRoleChange() {
    if (!this.roleChangeMember || this.roleChangeRoleId === null) {
      return;
    }

    const member = this.roleChangeMember;
    const roleId = this.roleChangeRoleId;

    this.loadingService.show();
    this.memberService.updateMember(member.id, roleId, member.active).subscribe({
      next: (res: any) => {
        this.loadingService.hide();
        // Update the member's role locally
        member.roleId = roleId;
        const selectedRole = this.roles.find(r => r.id === roleId);
        if (selectedRole) {
          member.roleName = selectedRole.name;
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Cập nhật vai trò thành công'
        });
      },
      error: (err) => {
        console.error('Lỗi cập nhật vai trò:', err);
        this.loadingService.hide();
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Có lỗi xảy ra khi cập nhật vai trò'
        });
      },
    });
  }

  addNewMember() {
    if (!this.selectedMeeting) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Vui lòng chọn một cuộc họp trước'
      });
      return;
    }

    // Open add member modal
    this.showAddMemberModal = true;
    this.searchUserQuery = '';
    this.searchUserResults = [];
    this.selectedUsersForAdd = [];
    this.isAllSearchedUsersSelected = false;
    // Load initial 10 random users
    this.loadInitialUsers();
  }

  closeAddMemberModal() {
    this.showAddMemberModal = false;
    this.searchUserQuery = '';
    this.searchUserResults = [];
    this.selectedUsersForAdd = [];
    this.isAllSearchedUsersSelected = false;
    this.selectedUserForDropdown = null;
    if (this.userFilterTimeout) {
      clearTimeout(this.userFilterTimeout);
    }
  }

  loadInitialUsers() {
    // Load with empty query to get first 10 users
    this.userDataService.searchBasic('').subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.searchUserResults = response.data.slice(0, 10).map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            imgUrl: user.imgUrl,
            department: user.department,
            position: user.position,
            role: user.role,
            userCode: user.userCode,
            active: user.active,
            displayLabel: user.email ? `${user.name || 'Không có tên'} (${user.email})` : user.name || 'Không có tên'
          }));
        } else {
          this.searchUserResults = [];
        }
      },
      error: (error: any) => {
        console.error('Lỗi tải danh sách người dùng:', error);
        this.searchUserResults = [];
      }
    });
  }

  onUserDropdownShow() {
    // Only load if suggestions are empty
    if (this.searchUserResults.length === 0) {
      this.loadInitialUsers();
    }
  }

  onUserFilter(event: any) {
    const query = event.filter?.trim() || '';
    this.searchUserQuery = query;
    
    // Clear previous timeout
    if (this.userFilterTimeout) {
      clearTimeout(this.userFilterTimeout);
    }

    // If empty, load initial users
    if (!query) {
      this.loadInitialUsers();
      return;
    }

    // Debounce search with 1 second delay
    this.userFilterTimeout = setTimeout(() => {
      this.userDataService.searchBasic(query).subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.searchUserResults = response.data.map((user: any) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              imgUrl: user.imgUrl,
              department: user.department,
              position: user.position,
              role: user.role,
              userCode: user.userCode,
              active: user.active,
              displayLabel: user.email ? `${user.name || 'Không có tên'} (${user.email})` : user.name || 'Không có tên'
            }));
          } else {
            this.searchUserResults = [];
          }
        },
        error: (error: any) => {
          console.error('Lỗi tìm kiếm người dùng:', error);
          this.searchUserResults = [];
        }
      });
    }, 1000);
  }

  onUserSelect(event: any) {
    if (event.value) {
      // Add user to selection instead of setting dropdown value
      this.addUserToSelection(event.value);
      // Clear dropdown selection after adding
      this.selectedUserForDropdown = null;
    }
  }

  onSearchUsers() {
    // Keep for backward compatibility if needed
    if (!this.searchUserQuery || this.searchUserQuery.trim().length < 2) {
      this.loadInitialUsers();
      return;
    }
  }

  addUserToSelection(user: any) {
    // Check if user is already selected
    const existingUser = this.selectedUsersForAdd.find(u => u.id === user.id);
    if (existingUser) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Người dùng này đã được chọn'
      });
      return;
    }

    // Add user to selection with default role
    const userRole = this.roles.find(role => role.name === 'USER') || this.roles[0];
    const userToAdd = {
      ...user,
      selected: true,
      selectedRoleId: userRole.id // Default to USER role
    };

    this.selectedUsersForAdd.push(userToAdd);
    
    // Clear search
    this.searchUserQuery = '';
    this.searchUserResults = [];
    
    this.updateSelectedUsersSelection();
  }

  toggleUserSelection(user: any) {
    user.selected = !user.selected;
    this.updateSelectedUsersSelection();
  }

  selectAllSearchedUsers() {
    const allSelected = this.isAllSearchedUsersSelected;
    this.selectedUsersForAdd.forEach(user => {
      user.selected = !allSelected;
    });
    this.updateSelectedUsersSelection();
  }

  updateSelectedUsersSelection() {
    this.isAllSearchedUsersSelected = this.selectedUsersForAdd.length > 0 && 
      this.selectedUsersForAdd.every(user => user.selected);
  }

  getSelectedUsersCount(): number {
    return this.selectedUsersForAdd.filter(user => user.selected).length;
  }

  confirmAddMembers() {
    const usersToAdd = this.selectedUsersForAdd.filter(user => user.selected);
    
    if (usersToAdd.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Vui lòng chọn ít nhất một người dùng để thêm'
      });
      return;
    }

    if (!this.selectedMeeting) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Không tìm thấy cuộc họp được chọn'
      });
      return;
    }

    // Prepare invite request data
    const inviteRequest = {
      meetingId: this.selectedMeeting.id,
      members: usersToAdd.map(user => ({
        userId: user.id,
        roleId: user.selectedRoleId
      }))
    };

    // Call API to invite members
    this.loadingService.show();
    this.memberService.inviteMembers(inviteRequest).subscribe({
      next: (response: any) => {
        this.loadingService.hide();
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Đã mời ${usersToAdd.length} thành viên vào cuộc họp thành công`
        });

        // Close modal and reload members
        this.closeAddMemberModal();
        this.loadMeetingMembers(this.selectedMeeting!.id);
      },
      error: (error: any) => {
        this.loadingService.hide();
        console.error('Lỗi mời thành viên:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Có lỗi xảy ra khi mời thành viên vào cuộc họp'
        });
      }
    });
  }

  get isAllSelected(): boolean {
    return this.meetingMembers.length > 0 && this.meetingMembers.every(m => m.selected);
  }



  deleteSelectedMembers() {
    if (!this.selectedMeeting) return;

    if (this.selectedMembers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Vui lòng chọn ít nhất một thành viên để xóa'
      });
      return;
    }

    // Show confirm dialog
    this.confirmDialogTitle = 'Xác nhận xóa thành viên';
    this.confirmDialogMessage = `Bạn có chắc chắn muốn xóa ${this.selectedMembers.length} thành viên đã chọn?`;
    this.confirmDialogType = 'delete';
    this.showConfirmDialog = true;
    return;
  }

  rejectSelectedMembers() {
    if (!this.selectedMeeting) return;

    if (this.selectedMembers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Vui lòng chọn ít nhất một thành viên để từ chối'
      });
      return;
    }

    // Show confirm dialog
    this.confirmDialogTitle = 'Xác nhận từ chối thành viên';
    this.confirmDialogMessage = `Bạn có chắc chắn muốn từ chối ${this.selectedMembers.length} thành viên đã chọn?`;
    this.confirmDialogType = 'reject';
    this.showConfirmDialog = true;
    return;
  }

  executeDeleteMembers() {
    if (!this.selectedMeeting) return;

    if (this.selectedMembers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Vui lòng chọn ít nhất một thành viên để xóa'
      });
      return;
    }

    // TODO: Implement API call to delete members
    // For now, just show success message and remove from local list
    this.selectedMembers = [];
    this.messageService.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Xóa thành viên thành công (chức năng tạm thời)'
    });
    
    // Reload members list
    if (this.selectedMeeting) {
      this.loadMeetingMembers(this.selectedMeeting.id);
    }
  }

  executeRejectMembers() {
    if (!this.selectedMeeting) return;

    if (this.selectedMembers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Vui lòng chọn ít nhất một thành viên để từ chối'
      });
      return;
    }

    // Prepare reject request data
    const rejectRequest = {
      meetingId: this.selectedMeeting.id,
      rejects: this.selectedMembers.map(member => ({
        memberId: member.id
      }))
    };

    // Call API to reject members
    this.memberService.rejectMembers(rejectRequest).subscribe({
      next: (response) => {
        // Clear selected members
        this.selectedMembers = [];
        
        // Show success message
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: response.message || 'Từ chối thành viên thành công'
        });
        
        // Reload members list
        if (this.selectedMeeting) {
          this.loadMeetingMembers(this.selectedMeeting.id);
        }
      },
      error: (error) => {
        // Show error message
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: error.error?.message || 'Có lỗi xảy ra khi từ chối thành viên'
        });
        console.error('Error rejecting members:', error);
      }
    });
  }

  onConfirmDialogConfirmed() {
    if (this.confirmDialogType === 'delete') {
      this.executeDeleteMembers();
    } else if (this.confirmDialogType === 'reject') {
      this.executeRejectMembers();
    } else if (this.confirmDialogType === 'join') {
      this.executeJoinMeeting();
    } else if (this.confirmDialogType === 'role') {
      this.executeRoleChange();
    }
    this.showConfirmDialog = false;
    this.confirmDialogType = null;
    this.meetingToJoin = null;
    this.roleChangeMember = null;
    this.roleChangeRoleId = null;
  }

  onConfirmDialogCancelled() {
    // Store member info before resetting (for role change cancellation)
    const cancelledMember = this.roleChangeMember;
    
    this.showConfirmDialog = false;
    this.confirmDialogType = null;
    this.meetingToJoin = null;
    this.roleChangeMember = null;
    this.roleChangeRoleId = null;
    
    // Reset role dropdown to original value if role change was cancelled
    if (cancelledMember && this.selectedMeeting) {
      // Force reload to reset the dropdown
      this.loadMeetingMembers(this.selectedMeeting.id);
    }
  }

  loadMessages(reset: boolean = false) {
    if (!this.selectedMeeting || this.loadingMessages || (!reset && !this.hasMoreMessages)) {
      return;
    }

    if (reset) {
      this.messagePage = 0;
      this.messages = [];
      this.hasMoreMessages = true;
      this.lastTriggeredMessageIndex = -1;
    }

    this.loadingMessages = true;
    this.messageDataService.searchMessages({
      meetingId: this.selectedMeeting.id,
      page: this.messagePage,
      size: this.messageSize,
      sortBy: 'sentAt',
      sortDirection: 'desc'
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const newMessages = response.data.content || [];
          
          // Update pagination info
          this.totalMessages = response.data.totalElements || 0;
          this.hasMoreMessages = !response.data.last;
          this.messagePage++;
          
          // Get unique sender IDs that we don't have in cache
          const uniqueSenderIds = [...new Set(newMessages.map((msg: MessageItem) => msg.senderId))];
          const senderIdsToFetch = uniqueSenderIds.filter(id => !this.userCache.has(id));
          
          // Load user information for all senders
          if (senderIdsToFetch.length > 0) {
            const userRequests = senderIdsToFetch.map(senderId => 
              this.userDataService.getById(senderId).pipe(
                map((userResponse: any) => {
                  // Handle both direct User object and { success: true, data: User } format
                  const user = userResponse.data || userResponse;
                  return { senderId, user };
                }),
                catchError(error => {
                  console.error(`Error loading user ${senderId}:`, error);
                  return of({ senderId, user: null });
                })
              )
            );
            
            forkJoin(userRequests).subscribe({
              next: (userResults) => {
                // Cache user information
                userResults.forEach(({ senderId, user }) => {
                  if (user) {
                    this.userCache.set(senderId, {
                      name: user.name || 'Người dùng',
                      email: user.email || ''
                    });
                  }
                });
                
                // Map messages with user information
                this.processMessages(newMessages, reset);
              },
              error: (error) => {
                console.error('Error loading user information:', error);
                // Still process messages even if user loading fails
                this.processMessages(newMessages, reset);
              }
            });
          } else {
            // All users are already cached, process messages directly
            this.processMessages(newMessages, reset);
          }
        } else {
          this.loadingMessages = false;
        }
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.loadingMessages = false;
      }
    });
  }

  private processMessages(newMessages: MessageItem[], reset: boolean) {
    const processedMessages = newMessages.map((msg: MessageItem) => {
      const isMine = msg.senderId === this.currentUserId;
      const userInfo = this.userCache.get(msg.senderId);
      
      return {
        ...msg,
        isMine,
        senderName: isMine ? undefined : (userInfo?.name || msg.senderName || 'Người dùng'),
        senderEmail: isMine ? undefined : (userInfo?.email || msg.senderEmail || '')
      };
    });
    
    if (reset) {
      this.messages = processedMessages.reverse(); // Reverse to show oldest first
    } else {
      // Prepend new messages (older messages) to the beginning
      this.messages = [...processedMessages.reverse(), ...this.messages];
    }
    
    this.loadingMessages = false;
    
    // Scroll to bottom after loading initial messages
    if (reset) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  }

  onMessageScroll(event: Event) {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    
    // Get all message items
    const messageItems = element.querySelectorAll('.message-item');
    if (messageItems.length === 0) return;
    
    // Calculate which item is at 80% of current loaded items (item 8 in 10 items)
    const currentItemCount = messageItems.length;
    const triggerIndex = Math.floor(currentItemCount * 0.8); // Item 8 = index 7 in 10 items
    
    // Only trigger once per batch
    if (triggerIndex === this.lastTriggeredMessageIndex) {
      return;
    }
    
    // Get the trigger item (item 8 from top)
    if (triggerIndex < messageItems.length) {
      const triggerItem = messageItems[triggerIndex] as HTMLElement;
      const triggerItemTop = triggerItem.offsetTop;
      
      // Check if trigger item (item 8) is visible in viewport (scrolled past)
      // Since we're loading older messages, trigger when scrolling up (near top)
      if (scrollTop <= triggerItemTop + 100 && 
          this.hasMoreMessages && 
          !this.loadingMessages) {
        // Mark this index as triggered
        this.lastTriggeredMessageIndex = triggerIndex;
        // Load more messages (older messages)
        this.loadMessages();
      }
    }
  }

  scrollToBottom() {
    const msgList = document.querySelector('.message-list-container');
    if (msgList) {
      msgList.scrollTop = msgList.scrollHeight;
    }
  }

  formatMessageDate(dateString?: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
