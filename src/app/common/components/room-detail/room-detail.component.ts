interface MeetingWithHover extends Meeting {
  hover: boolean;
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { RoomDataService } from '../../services/room-data.service';
import { UserDataService } from '../../services/user-data.service';
import { MeetingService } from '../../services/meeting.service';
import { MemberService } from '../../services/member.service';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { Room } from '../../models/room.model';
import { Meeting } from '../../models/meeting.model';
import { MeetingMember, MembershipRequest, Role } from '../../models/member.model';

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

  messages: Array<{ text: string; isMine: boolean }> = [
    { text: 'Xin chào, đây là tin nhắn đầu tiên!', isMine: false },
    { text: 'Chào bạn, mình đã nhận được thông tin.', isMine: true },
    { text: 'Cuộc họp sẽ bắt đầu lúc 9h nhé.', isMine: false }
  ];
  newMessage: string = '';

  sendMessage() {
    if (this.newMessage.trim()) {
      this.messages.push({ text: this.newMessage, isMine: true });
      this.newMessage = '';
      setTimeout(() => {
        const msgList = document.querySelector('.overflow-y-auto');
        if (msgList) msgList.scrollTop = msgList.scrollHeight;
      }, 50);
    }
  }
  showAddMeetingModal: boolean = false;
  showEditMeetingModal: boolean = false;
  showMembershipModal: boolean = false;
  showConfirmDialog: boolean = false;
  confirmDialogTitle: string = '';
  confirmDialogMessage: string = '';
  confirmDialogType: 'join' | 'role' | 'delete' | null = null;
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
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // Check if current user is ADMIN
    const userRole = this.authService.getCurrentUserRole();
    this.isAdmin = userRole === 'ADMIN';

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
  }

  closeAddMemberModal() {
    this.showAddMemberModal = false;
    this.searchUserQuery = '';
    this.searchUserResults = [];
    this.selectedUsersForAdd = [];
    this.isAllSearchedUsersSelected = false;
  }

  onSearchUsers() {
    if (!this.searchUserQuery || this.searchUserQuery.trim().length < 2) {
      this.searchUserResults = [];
      return;
    }

    // Delay 2 seconds before calling API
    setTimeout(() => {
      // Call API to search users
      this.userDataService.searchBasic(this.searchUserQuery.trim()).subscribe({
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
              active: user.active
            }));
          } else {
            this.searchUserResults = [];
          }
        },
        error: (error: any) => {
          console.error('Lỗi tìm kiếm người dùng:', error);
          this.searchUserResults = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Có lỗi xảy ra khi tìm kiếm người dùng'
          });
        }
      });
    }, 2000); // Delay 2 seconds
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
    const userToAdd = {
      ...user,
      selected: true,
      selectedRoleId: this.roles[0].id // Default to first role (ADMIN)
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

  onConfirmDialogConfirmed() {
    if (this.confirmDialogType === 'delete') {
      this.executeDeleteMembers();
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
}
