interface MeetingWithHover extends Meeting {
  hover: boolean;
}
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MessageService as PrimeMessageService } from 'primeng/api';
import { RoomDataService } from '../../services/room-data.service';
import { UserDataService } from '../../services/user-data.service';
import { MeetingService } from '../../services/meeting.service';
import { MemberService } from '../../services/member.service';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { MessageService, MessageItem } from '../../services/message.service';
import { DocumentEditLogService } from '../../services/document-edit-log.service';
import { Room } from '../../models/room.model';
import { Meeting } from '../../models/meeting.model';
import { MeetingMember, MembershipRequest, Role } from '../../models/member.model';
import { forkJoin, of, firstValueFrom } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
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
  canManageMembers = false;
  currentUserMeetingRole: string | null = null; // Role of current user in the selected meeting
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

  documents: Array<{ name: string; url: string }> = [];
  selectedFile: File | null = null;
  fileType: 'final' | 'chunks' = 'final';
  meetingFiles: Array<{
    date: string;
    filename: string;
    size: number;
    url: string;
  }> = [];
  loadingFiles = false;
  isLoadingFiles = false; // Flag to prevent concurrent requests
  showFileViewerModal = false;
  currentViewingFile: { filename: string; url: string } | null = null;
  pdfBlobUrl: string | null = null;
  loadingPdf = false;
  @ViewChild('docxViewerIframe') docxViewerIframe?: ElementRef<HTMLIFrameElement>;
  isConvertingPdf = false;
  isMergingAudio = false;
  hasPdfInFinal = false;
  hasDocxInFinal = false;
  hasAudioInChunks = false;
  isCheckingPdf = false; // Flag to prevent concurrent PDF check requests
  showAudioPlayerModal = false;
  currentPlayingAudio: { filename: string; url: string } | null = null;
  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;
  showPdfPipelineLoader = false;
  pdfPipelineStep: 'create_key' | 'convert_pdf' | 'sign_pdf' | 'update_status' | null = null;
  
  // Document editor properties
  showDocumentEditorModal = false;
  documentContent: string = '';
  originalDocumentContent: string = '';
  isDocumentContentLoading = false;
  isSavingDocument = false;
  currentEditingFile: { filename: string; url: string } | null = null;
  protectedRanges: Array<{ start: number; end: number; type: 'header' | 'timestamp' }> = [];
  
  // Document segments for display
  documentSegments: Array<{ 
    type: 'protected' | 'editable'; 
    content: string; 
    originalIndex: number;
    segmentType?: 'header' | 'timestamp';
    hasNewlineAfter?: boolean; // Track if this segment should have \n after it
  }> = [];
  editableSegments: Array<{ index: number; content: string }> = [];

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
  currentUserName: string = '';
  currentUserEmail: string = '';
  
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
  confirmDialogType: 'join' | 'role' | 'delete' | 'reject' | 'deleteMeeting' | 'saveDocument' | 'closeDocumentEditor' | null = null;
  meetingToJoin: Meeting | null = null;
  meetingToDelete: number | null = null;
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
    private messageDataService: MessageService,
    private documentEditLogService: DocumentEditLogService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Get current user ID and info first
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.currentUserId = currentUser.id;
      this.currentUserName = currentUser.name || '';
      this.currentUserEmail = currentUser.email || '';
    }

    // Check if current user is ADMIN (global role)
    const userRole = this.authService.getCurrentUserRole();
    this.isAdmin = userRole === 'ADMIN';
    // canManageMembers will be updated when meeting members are loaded
    this.canManageMembers = userRole === 'ADMIN' || userRole === 'SECRETARY';

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
    // Allow all meetings to be selected (no disable logic)
    this.selectedMeeting = meeting || null;
    // Reset meeting role when selecting new meeting
    this.currentUserMeetingRole = null;
    if (this.selectedMeeting) {
      this.currentPage = 0; // Reset to first page
      this.loadMeetingMembers(this.selectedMeeting.id);
      // Load messages if messages tab is active
      if (this.mainTab === 'messages') {
        this.loadMessages(true);
      }
      // Load files if documents tab is active
      if (this.mainTab === 'documents') {
        // Ensure USER role can only see 'final' files, not 'chunks'
        if (!this.canManageMembers && this.fileType === 'chunks') {
          this.fileType = 'final';
        }
        this.loadMeetingFiles();
        // checkPdfInFinal() will be called inside loadMeetingFiles() if fileType is 'final'
      }
      // If user doesn't have access to current tab (and not ADMIN/SECRETARY), switch to info tab
      const globalRole = this.authService.getCurrentUserRole();
      const isAdminOrSecretary = globalRole === 'ADMIN' || globalRole === 'SECRETARY';
      if ((this.mainTab === 'room_members' || this.mainTab === 'documents') && !this.canAccessMeetingTabs() && !isAdminOrSecretary) {
        this.mainTab = 'info';
      }
    }
  }

  onAddMeeting() {
    if (!this.canManageMeetings()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Bạn không có quyền thêm cuộc họp'
      });
      return;
    }
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
    if (!this.canManageMeetings()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Bạn không có quyền chỉnh sửa cuộc họp'
      });
      return;
    }
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
    if (!this.canManageMeetings()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Bạn không có quyền cập nhật cuộc họp'
      });
      return;
    }
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
    if (!this.canManageMeetings()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Bạn không có quyền xóa cuộc họp'
      });
      return;
    }
    
    // Find meeting to get title for confirmation message
    const meeting = this.meetings.find(m => m.id === id);
    const meetingTitle = meeting?.title || 'cuộc họp này';
    
    // Show confirm dialog
    this.meetingToDelete = id;
    this.confirmDialogTitle = 'Xác nhận xóa cuộc họp';
    this.confirmDialogMessage = `Bạn có chắc chắn muốn xóa cuộc họp "${meetingTitle}"? Hành động này không thể hoàn tác.`;
    this.confirmDialogType = 'deleteMeeting';
    this.showConfirmDialog = true;
    this.meetingMenuId = null; // Close the menu
  }

  executeDeleteMeeting() {
    if (!this.meetingToDelete) {
      return;
    }
    
    const id = this.meetingToDelete;
    this.loadingService.show();
    this.meetingService.delete(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Xóa cuộc họp thành công'
        });
        // Clear selected meeting if it was deleted
        if (this.selectedMeeting?.id === id) {
          this.selectedMeeting = null;
        }
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
    if (!this.canManageMeetings()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Bạn không có quyền tạo cuộc họp'
      });
      return;
    }
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
    
    // Only send isActive parameter if user is not admin (global or in meeting)
    if (!this.hasAdminAccess()) {
      searchParams.isActive = true;
    }

    // Add approval status filter if admin (global or in meeting)
    if (this.hasAdminAccess() && this.filterApprovalStatus !== 'all') {
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
          
          // Find current user's role in this meeting
          const currentUserMember = this.meetingMembers.find(m => m.userId === this.currentUserId);
          if (currentUserMember) {
            this.currentUserMeetingRole = currentUserMember.roleName || null;
          } else {
            this.currentUserMeetingRole = null;
          }
          
          // Update permissions based on both global role and meeting role
          this.updateUserPermissions();
        } else {
          this.meetingMembers = [];
          this.joinedCount = 0;
          this.pendingCount = 0;
          this.totalMembers = 0;
          this.totalPages = 0;
          this.currentUserMeetingRole = null;
          this.updateUserPermissions();
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
    // Avoid re-triggering data loads when clicking on the already active tab
    if (this.mainTab === tab) {
      return;
    }
    this.loadingService.show();
    // Small delay to show loading animation
    setTimeout(() => {
      this.mainTab = tab;
      // Load messages when switching to messages tab
      if (tab === 'messages' && this.selectedMeeting) {
        this.loadMessages(true);
      }
      // Load files when switching to documents tab
      if (tab === 'documents' && this.selectedMeeting) {
        // Ensure USER role can only see 'final' files, not 'chunks'
        if (!this.canManageMembers && this.fileType === 'chunks') {
          this.fileType = 'final';
        }
        this.loadMeetingFiles();
        // checkPdfInFinal() will be called inside loadMeetingFiles() if fileType is 'final'
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
    if (meeting.isExpired || meeting.isMeeting) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: meeting.isMeeting ? 'Cuộc họp đang diễn ra' : 'Không thể tham gia cuộc họp đã hết hạn'
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

  // ADMIN/SECRETARY functions (global or in meeting)
  toggleMemberSelection(member: MeetingMember) {
    if (!this.canManageMembers) return;
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
    if (!this.canManageMembers) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Bạn không có quyền thay đổi vai trò'
      });
      return;
    }

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
    // Store original role to revert if error occurs
    const originalRoleId = member.roleId;
    const originalRoleName = member.roleName;

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
        
        // Revert role to original value
        member.roleId = originalRoleId;
        member.roleName = originalRoleName;
        
        // Reload members to ensure UI is in sync
        if (this.selectedMeeting) {
          this.loadMeetingMembers(this.selectedMeeting.id);
        }
        
        // Extract error message from API response
        const errorMessage = err?.error?.message || err?.message || 'Có lỗi xảy ra khi cập nhật vai trò';
        
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: errorMessage
        });
      },
    });
  }

  addNewMember() {
    if (!this.canManageMembers) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Bạn không có quyền thêm thành viên'
      });
      return;
    }

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
        
        // Extract error message from API response
        const errorMessage = error?.error?.message || error?.message || 'Có lỗi xảy ra khi mời thành viên vào cuộc họp';
        
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: errorMessage
        });
      }
    });
  }

  get isAllSelected(): boolean {
    return this.meetingMembers.length > 0 && this.meetingMembers.every(m => m.selected);
  }

  updateUserPermissions() {
    // Check permissions based on both global role and meeting role
    const globalRole = this.authService.getCurrentUserRole();
    const meetingRole = this.currentUserMeetingRole;
    
    // User can manage members if they are global ADMIN/SECRETARY or have ADMIN/SECRETARY role in meeting
    const canManage = globalRole === 'ADMIN' || globalRole === 'SECRETARY' || 
                      meetingRole === 'ADMIN' || meetingRole === 'SECRETARY';
    
    this.canManageMembers = canManage;
  }

  // Helper method to check if user has admin access (global or in meeting)
  hasAdminAccess(): boolean {
    const globalRole = this.authService.getCurrentUserRole();
    return globalRole === 'ADMIN' || this.currentUserMeetingRole === 'ADMIN';
  }

  // Getter for template to check admin access
  get hasAdminAccessInMeeting(): boolean {
    return this.hasAdminAccess();
  }

  // Check if user can manage meetings (add/edit/delete) - only ADMIN/SECRETARY global role
  canManageMeetings(): boolean {
    const globalRole = this.authService.getCurrentUserRole();
    return globalRole === 'ADMIN' || globalRole === 'SECRETARY';
  }

  // Check if user can access meeting tabs (documents, members) - must have meetingRole or be ADMIN/SECRETARY
  // USER role and other roles can view members and documents tabs (read-only)
  canAccessMeetingTabs(): boolean {
    const globalRole = this.authService.getCurrentUserRole();
    // ADMIN/SECRETARY can access all tabs
    if (globalRole === 'ADMIN' || globalRole === 'SECRETARY') {
      return true;
    }
    // Other users (including USER role) can access if they have a role in the selected meeting
    // They will have read-only access (view only, no management actions)
    return this.currentUserMeetingRole !== null;
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
    } else if (this.confirmDialogType === 'deleteMeeting') {
      this.executeDeleteMeeting();
    } else if (this.confirmDialogType === 'saveDocument') {
      this.executeSaveDocument();
    } else if (this.confirmDialogType === 'closeDocumentEditor') {
      this.doCloseDocumentEditor();
    }
    this.showConfirmDialog = false;
    this.confirmDialogType = null;
    this.meetingToJoin = null;
    this.meetingToDelete = null;
    this.roleChangeMember = null;
    this.roleChangeRoleId = null;
  }

  onConfirmDialogCancelled() {
    // Store member info before resetting (for role change cancellation)
    const cancelledMember = this.roleChangeMember;
    
    this.showConfirmDialog = false;
    this.confirmDialogType = null;
    this.meetingToJoin = null;
    this.meetingToDelete = null;
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

  onFileTypeChange() {
    // If user is not ADMIN or SECRETARY and tries to access chunks, switch back to final
    if (this.fileType === 'chunks' && !this.canManageMembers) {
      this.fileType = 'final';
    }
    
    if (this.selectedMeeting) {
      this.loadMeetingFiles();
    }
  }

  loadMeetingFiles() {
    if (!this.selectedMeeting) {
      this.meetingFiles = [];
      return;
    }

    // Prevent concurrent requests
    if (this.isLoadingFiles) {
      return;
    }

    // Ensure USER role can only access 'final' files, not 'chunks'
    if (!this.canManageMembers && this.fileType === 'chunks') {
      this.fileType = 'final';
    }

    this.isLoadingFiles = true;
    this.loadingFiles = true;
    const meetingId = this.selectedMeeting.id;
    const apiUrl = `https://api.kma-legend.fun/api/meeting_files/${meetingId}?type=${this.fileType}`;

    this.http.get<any>(apiUrl).subscribe({
      next: (response) => {
        this.meetingFiles = response.files || [];
        this.loadingFiles = false;
        this.isLoadingFiles = false;

        if (this.meetingFiles.length === 0) {
          this.showNoFilesToast();
        }
        
        // Check if PDF exists in final files directly from response (no need for separate request)
        if (this.fileType === 'final') {
          const finalFiles = response.files || [];
          this.hasPdfInFinal = finalFiles.some((file: any) => 
            file.filename && file.filename.toLowerCase().endsWith('.pdf')
          );
          this.hasDocxInFinal = finalFiles.some((file: any) => {
            const filename = file.filename?.toLowerCase() || '';
            return filename.endsWith('.docx') || filename.endsWith('.doc');
          });
          this.hasAudioInChunks = false;
        } else {
          // Reset final flags when not in final tab
          this.hasPdfInFinal = false;
          this.hasDocxInFinal = false;
          const chunkFiles = response.files || [];
          this.hasAudioInChunks = chunkFiles.some((file: any) => {
            const ext = file.filename?.split('.').pop()?.toLowerCase() || '';
            return ['ogg', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'webm'].includes(ext);
          });
        }
      },
      error: (error) => {
        const backendMessage = error?.error?.error || error?.error?.message || '';
        const normalizedMessage = backendMessage.toLowerCase();
        const allowEmptyMessage =
          normalizedMessage.includes('folder does not exist') ||
          normalizedMessage.includes('meeting_id not found');

        console.warn('Lỗi tải danh sách file:', error);

        if (!allowEmptyMessage) {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Có lỗi xảy ra khi tải danh sách file'
          });
        } else {
          this.showNoFilesToast();
        }

        this.meetingFiles = [];
        this.loadingFiles = false;
        this.isLoadingFiles = false;
        this.hasPdfInFinal = false;
        this.hasDocxInFinal = false;
        this.hasAudioInChunks = false;
      }
    });
  }

  checkPdfInFinal() {
    if (!this.selectedMeeting) {
      this.hasPdfInFinal = false;
      return;
    }

    // Prevent concurrent requests
    if (this.isCheckingPdf) {
      return;
    }

    this.isCheckingPdf = true;
    const meetingId = this.selectedMeeting.id;
    const apiUrl = `https://api.kma-legend.fun/api/meeting_files/${meetingId}?type=final`;

    this.http.get<any>(apiUrl).subscribe({
      next: (response) => {
        const finalFiles = response.files || [];
        this.hasPdfInFinal = finalFiles.some((file: any) => 
          file.filename && file.filename.toLowerCase().endsWith('.pdf')
        );
        this.isCheckingPdf = false;
      },
      error: (error) => {
        console.error('Lỗi kiểm tra PDF trong final:', error);
        this.hasPdfInFinal = false;
        this.isCheckingPdf = false;
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async convertPdf() {
    if (!this.selectedMeeting || this.isConvertingPdf || this.hasPdfInFinal) {
      return;
    }

    if (!this.hasDocxInFinal) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Thiếu tài liệu',
        detail: 'Cần có ít nhất một file DOC/DOCX trong Final trước khi chuyển đổi PDF.'
      });
      return;
    }

    this.isConvertingPdf = true;
    this.showPdfPipelineLoader = true;
    this.pdfPipelineStep = 'create_key';
    const meetingId = this.selectedMeeting.id;
    const meetingIdStr = meetingId.toString();
    const userId = this.currentUserId ? this.currentUserId.toString() : '';
    const userEmail = this.currentUserEmail || '';

    const createKeyUrl = 'https://api.kma-legend.fun/api/create_key';
    const convertPdfUrl = 'https://api.kma-legend.fun/api/convert_pdf';
    const signPdfUrl = 'https://api.kma-legend.fun/api/sign_pdf';

    try {
      await this.executePdfStep(
        'create_key',
        () =>
          firstValueFrom(
            this.http.post<any>(createKeyUrl, {
              user_id: userId,
              user_name: userEmail
            })
          )
      );

      await this.executePdfStep(
        'convert_pdf',
        () =>
          firstValueFrom(
            this.http.post<any>(convertPdfUrl, {
              meeting_id: meetingIdStr
            })
          )
      );

      await this.delay(2000);

      await this.executePdfStep(
        'sign_pdf',
        () =>
          firstValueFrom(
            this.http.post<any>(signPdfUrl, {
              meeting_id: meetingIdStr,
              user_id: userId,
              user_name: userEmail
            })
          )
      );

      await this.delay(2000);

      await this.executePdfStep('update_status', () =>
        firstValueFrom(this.meetingService.updateIsMeeting(meetingId))
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Thành công',
        detail: 'Đã hoàn tất quy trình chuyển đổi & ký PDF'
      });

      this.loadMeetings();

      setTimeout(() => {
        this.checkPdfInFinal();
        // Luôn refresh list file type=final sau khi sign xong
        const previousFileType = this.fileType;
        this.fileType = 'final';
        this.loadMeetingFiles();
        // Khôi phục lại fileType nếu đang ở tab chunks
        if (previousFileType === 'chunks' && this.mainTab === 'documents') {
          setTimeout(() => {
            this.fileType = 'chunks';
          }, 100);
        }
      }, 2000);
    } catch (error) {
      // executePdfStep đã hiển thị thông báo lỗi cụ thể
      console.error('Lỗi quy trình PDF:', error);
    } finally {
      this.isConvertingPdf = false;
      this.showPdfPipelineLoader = false;
      this.pdfPipelineStep = null;
    }
  }

  private async executePdfStep(
    step: 'create_key' | 'convert_pdf' | 'sign_pdf' | 'update_status',
    action: () => Promise<any>
  ) {
    this.pdfPipelineStep = step;
    try {
      await action();
    } catch (error: any) {
      const backendMessage =
        error?.error?.message ||
        error?.error?.error ||
        error?.message ||
        'Không rõ lỗi';
      this.messageService.add({
        severity: 'error',
        summary: this.getPdfStepErrorTitle(step),
        detail: backendMessage
      });
      throw error;
    }
  }

  private getPdfStepErrorTitle(
    step: 'create_key' | 'convert_pdf' | 'sign_pdf' | 'update_status'
  ): string {
    switch (step) {
      case 'create_key':
        return 'Lỗi khởi tạo/sử dụng chữ ký điện tử';
      case 'convert_pdf':
        return 'Lỗi chuyển đổi PDF';
      case 'sign_pdf':
        return 'Lỗi ký tài liệu';
      case 'update_status':
        return 'Lỗi cập nhật trạng thái phòng';
      default:
        return 'Lỗi';
    }
  }

  mergeAudio() {
    if (!this.selectedMeeting || this.isMergingAudio) {
      return;
    }

    this.isMergingAudio = true;
    const meetingId = this.selectedMeeting.id;
    const apiUrl = 'https://api.kma-legend.fun/api/merge_audio';

    this.http.post<any>(apiUrl, { meeting_id: meetingId.toString() }).subscribe({
      next: (response) => {
        // Response format: { "meeting_id": "37", "status": "merge_queued" }
        console.log('Merge audio response:', response);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đã gửi yêu cầu merge audio thành công'
        });
        
        // Fake loading: show loading bar for a period of time, then hide it
        // Reload files after some time to check for merged file
        setTimeout(() => {
          if (this.fileType === 'chunks' || this.fileType === 'final') {
            this.loadMeetingFiles();
          }
        }, 5000);
        
        // Hide loading bar after fake loading period (10 seconds total)
        setTimeout(() => {
          this.isMergingAudio = false;
        }, 10000);
      },
      error: (error) => {
        console.error('Lỗi merge audio:', error);
        this.isMergingAudio = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: error.error?.message || 'Có lỗi xảy ra khi merge audio'
        });
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'docx':
      case 'doc':
        return 'fa-file-word';
      case 'pdf':
        return 'fa-file-pdf';
      case 'xlsx':
      case 'xls':
        return 'fa-file-excel';
      case 'ogg':
      case 'mp3':
      case 'wav':
        return 'fa-file-audio';
      case 'mp4':
      case 'avi':
        return 'fa-file-video';
      default:
        return 'fa-file';
    }
  }

  canViewFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'pdf' || ext === 'docx' || ext === 'doc';
  }

  viewFile(file: { filename: string; url: string }) {
    // Clear iframe cache by removing src first
    if (this.docxViewerIframe?.nativeElement) {
      this.docxViewerIframe.nativeElement.src = 'about:blank';
    }
    
    this.currentViewingFile = file;
    this.showFileViewerModal = true;
    
    // Nếu là PDF, thử fetch file và tạo blob URL để tránh tự động tải xuống
    if (this.isPdfFile(file.filename)) {
      this.loadPdfAsBlob(file.url);
    } else {
      this.pdfBlobUrl = null;
      // Force iframe reload by setting src after modal is shown
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (this.docxViewerIframe?.nativeElement && this.currentViewingFile) {
          const viewerUrl = this.getFileViewerUrl(this.currentViewingFile.url, this.currentViewingFile.filename);
          this.docxViewerIframe.nativeElement.src = viewerUrl;
        }
      }, 200);
    }
  }

  loadPdfAsBlob(url: string) {
    this.loadingPdf = true;
    this.pdfBlobUrl = null;
    
    // Sử dụng HttpClient để có thể tự động thêm token qua interceptor
    this.http.get(url, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    }).subscribe({
      next: (blob: Blob) => {
        // Tạo blob URL
        this.pdfBlobUrl = URL.createObjectURL(blob);
        this.loadingPdf = false;
      },
      error: (error) => {
        console.error('Error loading PDF:', error);
        this.loadingPdf = false;
        // Fallback về URL gốc nếu fetch thất bại
        this.pdfBlobUrl = url;
      }
    });
  }

  closeFileViewer() {
    // Clear iframe src to prevent caching
    if (this.docxViewerIframe?.nativeElement) {
      this.docxViewerIframe.nativeElement.src = '';
    }
    
    // Revoke blob URL để giải phóng memory
    if (this.pdfBlobUrl && this.pdfBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.pdfBlobUrl);
    }
    this.showFileViewerModal = false;
    this.currentViewingFile = null;
    this.pdfBlobUrl = null;
    this.loadingPdf = false;
  }

  getFileViewerUrl(url: string, filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf') {
      // Thử nhiều cách để hiển thị PDF
      // Cách 1: Thêm #toolbar=0 vào URL để browser hiển thị inline
      // Cách 2: Sử dụng Google Docs Viewer (fallback nếu cách 1 không hoạt động)
      // Trước tiên thử với URL gốc + #toolbar=0
      if (url.includes('#')) {
        return url + '&toolbar=0';
      }
      return url + '#toolbar=0';
    } else if (ext === 'docx' || ext === 'doc') {
      // Sử dụng Office Online Viewer với cache busting
      // Thêm timestamp để tránh cache
      const cacheBuster = `&t=${Date.now()}`;
      const separator = url.includes('?') ? '&' : '?';
      const urlWithCacheBuster = url + separator + cacheBuster;
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlWithCacheBuster)}`;
    }
    
    return url;
  }

  getPdfEmbedUrl(url: string): string {
    // Ưu tiên sử dụng blob URL nếu có, nếu không thì dùng URL gốc
    return this.pdfBlobUrl || url;
  }

  isPdfFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'pdf';
  }

  isDocxFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'docx' || ext === 'doc';
  }

  isAudioFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    const audioExtensions = ['ogg', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'webm'];
    return audioExtensions.includes(ext || '');
  }

  getPdfPipelineMessage(): string {
    switch (this.pdfPipelineStep) {
      case 'create_key':
        return 'Đang tạo khóa bảo mật...';
      case 'convert_pdf':
        return 'Đang chuyển đổi file PDF...';
      case 'sign_pdf':
        return 'Đang ký tài liệu...';
      case 'update_status':
        return 'Đang cập nhật trạng thái phòng...';
      default:
        return 'Đang xử lý dữ liệu...';
    }
  }

  getCurrentFileTypeLabel(): string {
    return this.fileType === 'chunks' ? 'Chunks' : 'Final';
  }

  private showNoFilesToast() {
    this.messageService.add({
      severity: 'success',
      summary: 'Không có tài liệu',
      detail: `Không tìm thấy tài liệu nào trong mục ${this.getCurrentFileTypeLabel()}.`
    });
  }

  playAudio(file: { filename: string; url: string }) {
    this.currentPlayingAudio = file;
    this.showAudioPlayerModal = true;
    
    // Auto play audio when modal opens
    setTimeout(() => {
      if (this.audioPlayerRef?.nativeElement) {
        this.audioPlayerRef.nativeElement.play().catch(error => {
          console.error('Error auto-playing audio:', error);
          // Some browsers require user interaction before autoplay
        });
      }
    }, 100);
  }

  closeAudioPlayer() {
    // Stop audio playback when closing modal
    if (this.audioPlayerRef?.nativeElement) {
      this.audioPlayerRef.nativeElement.pause();
      this.audioPlayerRef.nativeElement.currentTime = 0;
    }
    this.showAudioPlayerModal = false;
    this.currentPlayingAudio = null;
  }

  onAudioEnded() {
    // Audio playback ended, you can add any logic here if needed
    console.log('Audio playback ended');
  }

  onAudioError() {
    console.error('Error playing audio');
    this.messageService.add({
      severity: 'error',
      summary: 'Lỗi',
      detail: 'Không thể phát file audio. Vui lòng thử lại hoặc tải xuống để nghe.'
    });
  }

  editDocument(file: { filename: string; url: string }) {
    if (!this.selectedMeeting || !this.currentUserId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Không tìm thấy thông tin cuộc họp hoặc người dùng'
      });
      return;
    }

    this.currentEditingFile = file;
    this.showDocumentEditorModal = true;
    this.documentContent = '';
    this.originalDocumentContent = '';
    this.previousDocumentContent = '';
    this.protectedRanges = [];
    this.lastCursorPosition = 0;
    this.isDocumentContentLoading = true;

    // Fetch document content
    const apiUrl = 'https://api.kma-legend.fun/api/get_document';
    const payload = {
      meeting_id: this.selectedMeeting.id.toString(),
      user_id: this.currentUserId.toString()
    };

    this.http.post<any>(apiUrl, payload).subscribe({
      next: (response) => {
        const content = response.content || '';
        this.documentContent = content;
        this.originalDocumentContent = content;
        this.previousDocumentContent = content;
        this.lastCursorPosition = 0;
        this.parseDocumentSegments(content);
        this.parseProtectedRanges(content); // Keep for compatibility
        this.isDocumentContentLoading = false;
      },
      error: (error) => {
        console.error('Error loading document content:', error);
        this.isDocumentContentLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: error.error?.message || 'Không thể tải nội dung tài liệu. Vui lòng thử lại.'
        });
        // Close modal on error
        this.closeDocumentEditor();
      }
    });
  }

  closeDocumentEditor() {
    // Check if content has changed
    if (this.hasDocumentChanges()) {
      // Show warning dialog
      this.confirmDialogTitle = 'Xác nhận đóng';
      this.confirmDialogMessage = 'Nội dung đã được chỉnh sửa. Nếu đóng bây giờ, các thay đổi sẽ không được lưu. Bạn có chắc chắn muốn đóng?';
      this.confirmDialogType = 'closeDocumentEditor';
      this.showConfirmDialog = true;
      return;
    }
    
    // If no changes, close directly
    this.doCloseDocumentEditor();
  }

  doCloseDocumentEditor() {
    this.showDocumentEditorModal = false;
    this.currentEditingFile = null;
    this.documentContent = '';
    this.originalDocumentContent = '';
    this.previousDocumentContent = '';
    this.protectedRanges = [];
    this.documentSegments = [];
    this.editableSegments = [];
    this.lastCursorPosition = 0;
    this.isDocumentContentLoading = false;
    this.isSavingDocument = false;
  }

  hasDocumentChanges(): boolean {
    // Reconstruct document from segments and compare
    const reconstructedContent = this.reconstructDocumentFromSegments();
    return reconstructedContent !== this.originalDocumentContent;
  }

  /**
   * Reconstruct full document content from segments
   */
  reconstructDocumentFromSegments(): string {
    let result = '';
    for (let i = 0; i < this.documentSegments.length; i++) {
      const segment = this.documentSegments[i];
      let segmentContent = segment.content;
      
      // Add newline after segment if needed
      if (segment.hasNewlineAfter) {
        segmentContent = segmentContent + '\n';
      }
      
      result += segmentContent;
    }
    return result;
  }

  /**
   * Update editable segment content
   */
  updateEditableSegment(segmentIndex: number, newContent: string): void {
    const segment = this.documentSegments.find(s => s.originalIndex === segmentIndex);
    if (segment && segment.type === 'editable') {
      // Preserve newline if segment should have one
      // Don't force add/remove newline here, let reconstruct handle it
      segment.content = newContent;
      // Update editableSegments array
      const editableIndex = this.editableSegments.findIndex(e => e.index === segmentIndex);
      if (editableIndex >= 0) {
        this.editableSegments[editableIndex].content = newContent;
      }
    }
  }

  /**
   * Handle input event for editable segment
   */
  onEditableSegmentInput(segmentIndex: number, event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) {
      this.updateEditableSegment(segmentIndex, textarea.value);
    }
  }

  /**
   * Handle click on protected segment (header or timestamp)
   */
  onProtectedSegmentClick(segmentType: 'header' | 'timestamp' | undefined): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Không được phép',
      detail: 'Không chỉnh sửa được thời gian và tiêu đề gốc của biên bản'
    });
  }

  /**
   * Parse document into segments (protected and editable)
   */
  parseDocumentSegments(content: string): void {
    this.documentSegments = [];
    this.editableSegments = [];
    if (!content) return;

    const lines = content.split('\n');
    let currentIndex = 0;
    let segmentIndex = 0;

    // Process first two lines (header)
    if (lines.length >= 2) {
      const line1 = lines[0];
      const line2 = lines[1];
      
      // Check if line 1 matches "Bien ban cuoc hop: [number]"
      const headerMatch = line1.match(/^Bien ban cuoc hop:\s*\d+/i);
      if (headerMatch) {
        this.documentSegments.push({
          type: 'protected',
          content: line1, // Don't include \n in content
          originalIndex: segmentIndex++,
          segmentType: 'header',
          hasNewlineAfter: true
        });
        currentIndex += line1.length + 1;
      } else {
        // If not header, it's editable
        this.documentSegments.push({
          type: 'editable',
          content: line1, // Don't include \n in content
          originalIndex: segmentIndex++,
          hasNewlineAfter: true
        });
        this.editableSegments.push({ index: segmentIndex - 1, content: line1 });
        currentIndex += line1.length + 1;
      }
      
      // Check if line 2 matches "Created: [date]"
      const createdMatch = line2.match(/^Created:\s*[\d\/\s:]+UTC/i);
      if (createdMatch) {
        this.documentSegments.push({
          type: 'protected',
          content: line2, // Don't include \n in content
          originalIndex: segmentIndex++,
          segmentType: 'header',
          hasNewlineAfter: true
        });
        currentIndex += line2.length + 1;
      } else {
        // If not header, it's editable
        this.documentSegments.push({
          type: 'editable',
          content: line2, // Don't include \n in content
          originalIndex: segmentIndex++,
          hasNewlineAfter: true
        });
        this.editableSegments.push({ index: segmentIndex - 1, content: line2 });
        currentIndex += line2.length + 1;
      }
    }

    // Process remaining lines
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      // Match timestamp pattern: (dd-MM-yyyy_HH-mm-ss)
      const timestampMatch = line.match(/^(\((\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2})\))(.*)$/);
      
      if (timestampMatch) {
        const timestamp = timestampMatch[1]; // Full timestamp with parentheses
        let contentAfterTimestamp = timestampMatch[3] || ''; // Content after timestamp
        const isLastLine = i === lines.length - 1;
        
        // Trim leading whitespace from content after timestamp
        contentAfterTimestamp = contentAfterTimestamp.trimStart();
        
        // Add timestamp as protected segment (no newline, it's on same line as content)
        this.documentSegments.push({
          type: 'protected',
          content: timestamp,
          originalIndex: segmentIndex++,
          segmentType: 'timestamp',
          hasNewlineAfter: false
        });
        
        // Add content after timestamp as editable segment (without \n in content)
        const hasNewline = !isLastLine;
        this.documentSegments.push({
          type: 'editable',
          content: contentAfterTimestamp, // Don't include \n in content
          originalIndex: segmentIndex++,
          hasNewlineAfter: hasNewline
        });
        this.editableSegments.push({ index: segmentIndex - 1, content: contentAfterTimestamp });
      } else {
        // No timestamp, entire line is editable
        const isLastLine = i === lines.length - 1;
        const hasNewline = !isLastLine;
        this.documentSegments.push({
          type: 'editable',
          content: line, // Don't include \n in content
          originalIndex: segmentIndex++,
          hasNewlineAfter: hasNewline
        });
        this.editableSegments.push({ index: segmentIndex - 1, content: line });
      }
    }
  }

  /**
   * Parse protected ranges from document content (legacy method, kept for compatibility)
   */
  parseProtectedRanges(content: string): void {
    this.protectedRanges = [];
    if (!content) return;

    const lines = content.split('\n');
    let currentIndex = 0;

    // Check first two lines for header
    if (lines.length >= 2) {
      const line1 = lines[0];
      const line2 = lines[1];
      
      // Check if line 1 matches "Bien ban cuoc hop: [number]"
      const headerMatch = line1.match(/^Bien ban cuoc hop:\s*\d+/i);
      if (headerMatch) {
        this.protectedRanges.push({
          start: currentIndex,
          end: currentIndex + line1.length,
          type: 'header'
        });
      }
      
      currentIndex += line1.length + 1; // +1 for newline
      
      // Check if line 2 matches "Created: [date]"
      const createdMatch = line2.match(/^Created:\s*[\d\/\s:]+UTC/i);
      if (createdMatch) {
        this.protectedRanges.push({
          start: currentIndex,
          end: currentIndex + line2.length,
          type: 'header'
        });
      }
      
      currentIndex += line2.length + 1; // +1 for newline
    }

    // Check remaining lines for timestamps
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      // Match timestamp pattern: (dd-MM-yyyy_HH-mm-ss)
      const timestampMatch = line.match(/^\((\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2})\)/);
      if (timestampMatch) {
        const timestampLength = timestampMatch[0].length;
        this.protectedRanges.push({
          start: currentIndex,
          end: currentIndex + timestampLength,
          type: 'timestamp'
        });
      }
      currentIndex += line.length + 1; // +1 for newline
    }
  }

  /**
   * Check if a position is within a protected range
   */
  isPositionProtected(position: number): boolean {
    return this.protectedRanges.some(range => 
      position >= range.start && position <= range.end
    );
  }

  /**
   * Check if a selection range overlaps with protected ranges
   */
  isSelectionProtected(selectionStart: number, selectionEnd: number): boolean {
    return this.protectedRanges.some(range => {
      // Check if selection overlaps with protected range
      return (selectionStart <= range.end && selectionEnd >= range.start);
    });
  }

  /**
   * Handle click event on document editor
   */
  onDocumentEditorClick(event: MouseEvent): void {
    const textarea = event.target as HTMLTextAreaElement;
    const cursorPosition = textarea.selectionStart;
    this.lastCursorPosition = cursorPosition;
    
    if (this.isPositionProtected(cursorPosition)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Không được phép',
        detail: 'Không cho sửa ngày tháng năm và tiêu đề gốc văn bản'
      });
      // Move cursor to a safe position (after protected range)
      const protectedRange = this.protectedRanges.find(range => 
        cursorPosition >= range.start && cursorPosition <= range.end
      );
      if (protectedRange) {
        setTimeout(() => {
          const safePosition = Math.min(protectedRange.end + 1, this.documentContent.length);
          textarea.setSelectionRange(safePosition, safePosition);
          this.lastCursorPosition = safePosition;
        }, 0);
      }
    }
  }

  private previousDocumentContent: string = '';
  private lastCursorPosition: number = 0;

  /**
   * Handle keyup event to track cursor position
   */
  onDocumentEditorKeyUp(event: KeyboardEvent): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.lastCursorPosition = textarea.selectionStart;
  }

  /**
   * Handle input event on document editor to prevent editing protected ranges
   */
  onDocumentEditorInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const newContent = textarea.value;
    const oldContent = this.previousDocumentContent || this.documentContent;
    
    // Get current cursor position
    const currentCursorPos = textarea.selectionStart;
    
    // Find where the change actually occurred by comparing content
    let changeStart = 0;
    let changeEnd = oldContent.length;
    
    // Find start of change (first difference from beginning)
    for (let i = 0; i < Math.min(oldContent.length, newContent.length); i++) {
      if (oldContent[i] !== newContent[i]) {
        changeStart = i;
        break;
      }
    }
    
    // Find end of change (first difference from end)
    let oldEnd = oldContent.length - 1;
    let newEnd = newContent.length - 1;
    while (oldEnd >= changeStart && newEnd >= changeStart && 
           oldContent[oldEnd] === newContent[newEnd]) {
      oldEnd--;
      newEnd--;
    }
    changeEnd = oldEnd + 1;
    
    // If no change detected, just update and return
    if (changeStart === 0 && changeEnd === oldContent.length && oldContent.length === newContent.length) {
      this.previousDocumentContent = newContent;
      this.lastCursorPosition = currentCursorPos;
      return;
    }
    
    // Check if the change overlaps with any protected range
    const changeOverlapsProtected = this.protectedRanges.some(range => {
      // Check if change start is within protected range
      if (changeStart >= range.start && changeStart < range.end) return true;
      // Check if change end is within protected range
      if (changeEnd > range.start && changeEnd <= range.end) return true;
      // Check if change completely covers protected range
      if (changeStart <= range.start && changeEnd >= range.end) return true;
      // Check if protected range completely covers change
      if (range.start <= changeStart && range.end >= changeEnd) return true;
      return false;
    });
    
    if (changeOverlapsProtected) {
      // Revert to previous content
      this.documentContent = oldContent;
      textarea.value = oldContent;
      
      // Show error message
      this.messageService.add({
        severity: 'error',
        summary: 'Không được phép',
        detail: 'Không cho sửa ngày tháng năm và tiêu đề gốc văn bản'
      });
      
      // Restore cursor position after a short delay
      setTimeout(() => {
        // Find a safe position after the protected range
        const affectedRange = this.protectedRanges.find(range => {
          if (changeStart >= range.start && changeStart < range.end) return true;
          if (changeEnd > range.start && changeEnd <= range.end) return true;
          if (changeStart <= range.start && changeEnd >= range.end) return true;
          if (range.start <= changeStart && range.end >= changeEnd) return true;
          return false;
        });
        
        if (affectedRange) {
          const safePosition = Math.min(affectedRange.end + 1, oldContent.length);
          textarea.setSelectionRange(safePosition, safePosition);
          this.lastCursorPosition = safePosition;
        } else {
          // If no specific range found, try to place cursor at a safe position
          const safePosition = Math.min(changeStart, oldContent.length);
          textarea.setSelectionRange(safePosition, safePosition);
          this.lastCursorPosition = safePosition;
        }
      }, 0);
    } else {
      // Update previous content and re-parse protected ranges
      this.previousDocumentContent = newContent;
      this.lastCursorPosition = currentCursorPos;
      this.parseProtectedRanges(newContent);
    }
  }

  /**
   * Handle keydown event to prevent deletion of protected content
   */
  onDocumentEditorKeyDown(event: KeyboardEvent): void {
    const textarea = event.target as HTMLTextAreaElement;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    
    // Check if user is trying to delete protected content
    if (this.isSelectionProtected(selectionStart, selectionEnd)) {
      // Prevent deletion
      event.preventDefault();
      this.messageService.add({
        severity: 'error',
        summary: 'Không được phép',
        detail: 'Không cho sửa ngày tháng năm và tiêu đề gốc văn bản'
      });
      return;
    }
    
    // Check if cursor is at the start of a protected range and user presses backspace
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const cursorPos = textarea.selectionStart;
      const isAtProtectedStart = this.protectedRanges.some(range => 
        cursorPos === range.start || cursorPos === range.end
      );
      
      if (isAtProtectedStart) {
        // Check if deletion would affect protected content
        const deleteEnd = event.key === 'Backspace' ? selectionStart - 1 : selectionEnd + 1;
        if (this.isPositionProtected(deleteEnd)) {
          event.preventDefault();
          this.messageService.add({
            severity: 'error',
            summary: 'Không được phép',
            detail: 'Không cho sửa ngày tháng năm và tiêu đề gốc văn bản'
          });
        }
      }
    }
  }

  saveDocument() {
    if (!this.selectedMeeting || !this.currentUserId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Không tìm thấy thông tin cuộc họp hoặc người dùng'
      });
      return;
    }

    // Check if content has changed
    if (!this.hasDocumentChanges()) {
      this.messageService.add({
        severity: 'info',
        summary: 'Thông báo',
        detail: 'Nội dung không có thay đổi nào'
      });
      return;
    }

    // Show confirm dialog
    this.confirmDialogTitle = 'Xác nhận lưu';
    this.confirmDialogMessage = 'Bạn có muốn lưu các thay đổi vào tài liệu không?';
    this.confirmDialogType = 'saveDocument';
    this.showConfirmDialog = true;
  }

  executeSaveDocument() {
    if (!this.selectedMeeting || !this.currentUserId) {
      return;
    }

    this.isSavingDocument = true;

    // Reconstruct document from segments
    const contentToSave = this.reconstructDocumentFromSegments();

    // Save document content
    const apiUrl = 'https://api.kma-legend.fun/api/push_document';
    const payload = {
      content: contentToSave,
      meeting_id: this.selectedMeeting.id.toString(),
      user_id: this.currentUserId.toString()
    };

    this.http.post<any>(apiUrl, payload).subscribe({
      next: (response) => {
        this.isSavingDocument = false;
        const savedContent = this.reconstructDocumentFromSegments();
        this.originalDocumentContent = savedContent; // Update original content
        this.documentContent = savedContent;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đã lưu tài liệu thành công'
        });
        
        // Create document edit log
        if (this.selectedMeeting && this.currentUserId) {
          const changeSummary = `${this.currentUserName || 'Người dùng'} đã chỉnh sửa tài liệu của cuộc họp ${this.selectedMeeting.title}`;
          this.documentEditLogService.createDocumentEditLog({
            meetingId: this.selectedMeeting.id,
            changeSummary: changeSummary
          }).subscribe({
            next: (logResponse) => {
              // Log created successfully, no need to show message
              console.log('Document edit log created:', logResponse);
            },
            error: (logError) => {
              // Log error but don't show to user as document save was successful
              console.error('Error creating document edit log:', logError);
            }
          });
        }
        
        // Close modal and reload files
        this.doCloseDocumentEditor();
        // Reload files with type = final
        if (this.selectedMeeting) {
          const previousFileType = this.fileType;
          this.fileType = 'final';
          this.loadMeetingFiles();
        }
      },
      error: (error) => {
        console.error('Error saving document:', error);
        this.isSavingDocument = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: error.error?.message || 'Không thể lưu tài liệu. Vui lòng thử lại.'
        });
      }
    });
  }
}
