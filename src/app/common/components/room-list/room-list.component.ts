import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RoomDataService } from '../../services/room-data.service';
import { Room } from '../../models/room.model';
import { Router } from '@angular/router';
import { DepartmentService, DepartmentItem } from '../../services/department.service';
import { Department } from '../../models/user.model';

@Component({
  selector: 'app-room-list',
  templateUrl: './room-list.component.html',
  styleUrls: ['./room-list.component.scss'],
})
export class RoomListComponent implements OnInit, AfterViewInit, OnDestroy {
  showRenameModal = false;
  renameRoomOldName = '';
  renameRoomNewName = '';
  renameRoomId: number | null = null;
  initialRenameRoomValues: { name: string; departmentId: number | null } | null = null;
  roomList: Room[] = [];
  // Filters & pagination
  selectedDepartmentId: number | null = null;
  page = 0;
  size = 10;
  sortBy = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  totalRooms = 0;
  totalPages = 0;
  newRoomDepartmentId: number | null = null;
  renameRoomDepartmentId: number | null = null;
  showCreateModal = false;
  newRoomName = '';
  roomMenuIndex: number | null = null;
  department: Department[] = []; // For create/rename modals
  departmentOptions: DepartmentItem[] = []; // For department filter dropdown
  // Confirm dialog state
  showConfirmDialog = false;
  confirmDialogTitle = 'Xác nhận';
  confirmDialogMessage = 'Bạn có chắc muốn xóa nhóm này?';
  confirmDialogType: 'delete' | 'default' = 'delete';
  pendingDeleteRoomId: number | null = null;

  constructor(
    private roomService: RoomDataService,
    private router: Router,
    private departmentService: DepartmentService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadRooms();
    this.loadDepartmentOptions();
  }

  // Load departments for dropdown filter
  loadDepartmentOptions(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (res) => {
        if (res && res.success && res.data && Array.isArray(res.data)) {
          this.departmentOptions = res.data;
        } else {
          this.departmentOptions = [];
        }
      },
      error: () => {
        this.departmentOptions = [];
      }
    });
  }

  loadRooms() {
    this.roomService
      .searchRooms({
        departmentId: this.selectedDepartmentId ?? undefined,
        page: this.page,
        size: this.size,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
      })
      .subscribe((res: any) => {
        if (res && res.data) {
          // Expecting data.content, data.totalElements, data.totalPages
          this.roomList = res.data.content || [];
          this.totalRooms = res.data.totalElements ?? this.roomList.length;
          this.totalPages = res.data.totalPages ?? 1;
        } else {
          this.roomList = [];
          this.totalRooms = 0;
          this.totalPages = 0;
        }
      });
  }

  onDepartmentChange(event: any): void {
    // Handle p-dropdown change event
    // With optionValue="id", event.value is the id directly (number or null)
    if (event.value !== null && event.value !== undefined) {
      this.selectedDepartmentId = Number(event.value);
    } else {
      // Cleared or null
      this.selectedDepartmentId = null;
    }
    this.page = 0;
    this.loadRooms();
  }

  onPageChange(page: number) {
    if (page < 0 || (this.totalPages && page > this.totalPages - 1)) return;
    this.page = page;
    this.loadRooms();
  }

  nextPage() {
    if (this.page < this.totalPages - 1) {
      this.page += 1;
      this.loadRooms();
    }
  }

  previousPage() {
    if (this.page > 0) {
      this.page -= 1;
      this.loadRooms();
    }
  }

  goToRoomDetail(room: Room) {
    // Chỉ cho phép vào room detail nếu joined = true
    this.router.navigate(['/home/roomdetail', room.id.toString()]);
  }

  toggleRoomMenu(index: number) {
    this.roomMenuIndex = this.roomMenuIndex === index ? null : index;
  }

  openRenameRoom(room: Room) {
    this.roomMenuIndex = null;
    this.showRenameModal = true;
    this.renameRoomOldName = room.roomName;
    this.renameRoomNewName = room.roomName;
    this.renameRoomId = room.id;
    
    // Set initial department ID (default to room's current department)
    this.renameRoomDepartmentId = room.departmentId || null;
    
    // Save initial values for comparison
    this.initialRenameRoomValues = {
      name: room.roomName,
      departmentId: room.departmentId || null
    };
    
    this.loadDepartment();
  }

  closeRenameModal() {
    this.showRenameModal = false;
    this.renameRoomOldName = '';
    this.renameRoomNewName = '';
    this.renameRoomId = null;
    this.renameRoomDepartmentId = null;
    this.initialRenameRoomValues = null;
  }

  // Check if rename form has been modified
  hasRenameFormChanged(): boolean {
    if (!this.initialRenameRoomValues) {
      return false;
    }
    
    const currentName = this.renameRoomNewName?.trim() || '';
    const currentDepartmentId = this.renameRoomDepartmentId;
    
    return (
      currentName !== this.initialRenameRoomValues.name ||
      currentDepartmentId !== this.initialRenameRoomValues.departmentId
    );
  }

  submitRenameRoom() {
    if (!this.renameRoomNewName.trim() || this.renameRoomId == null) return;
    const updatedRoom: Partial<Room> = {
      id: this.renameRoomId,
      roomName: this.renameRoomNewName,
      departmentId: this.renameRoomDepartmentId === null ? undefined : this.renameRoomDepartmentId
    };
    this.roomService.update(this.renameRoomId, updatedRoom as Room).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật nhóm thành công' });
        this.loadRooms();
        this.closeRenameModal();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Cập nhật nhóm thất bại' });
        this.closeRenameModal();
      },
    });
  }

  requestDeleteRoom(roomId: number) {
    this.pendingDeleteRoomId = roomId;
    this.confirmDialogTitle = 'Xác nhận xóa';
    this.confirmDialogMessage = 'Bạn có chắc muốn xóa nhóm này?';
    this.confirmDialogType = 'delete';
    this.showConfirmDialog = true;
  }

  onConfirmDialogConfirmed() {
    if (this.pendingDeleteRoomId == null) {
      this.showConfirmDialog = false;
      return;
    }
    const id = this.pendingDeleteRoomId;
    this.roomService.delete(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa nhóm' });
        this.loadRooms();
        this.roomMenuIndex = null;
        this.pendingDeleteRoomId = null;
        this.showConfirmDialog = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Xóa nhóm thất bại' });
        this.roomMenuIndex = null;
        this.pendingDeleteRoomId = null;
        this.showConfirmDialog = false;
      },
    });
  }

  onConfirmDialogCancelled() {
    this.showConfirmDialog = false;
    this.pendingDeleteRoomId = null;
  }

  openCreateModal() {
    this.showCreateModal = true;
    this.loadDepartment();
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.newRoomName = '';
  }

  submitCreateRoom() {
    if (!this.newRoomName.trim() || !this.newRoomDepartmentId) return;
    const newRoom: Partial<Room> = {
      id: 0,
      roomName: this.newRoomName,
      roomCode: '',
      departmentId: this.newRoomDepartmentId
    };
    this.roomService.create(newRoom as Room).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Tạo nhóm thành công' });
        this.loadRooms();
        this.closeCreateModal();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Tạo nhóm thất bại' });
        this.closeCreateModal();
      },
    });
  }

  ngAfterViewInit(): void {
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }

  handleOutsideClick(event: MouseEvent): void {
    const menuElements = document.querySelectorAll('.room-menu-popup');
    let clickedInside = false;
    menuElements.forEach((el) => {
      if (el.contains(event.target as Node)) {
        clickedInside = true;
      }
    });
    if (!clickedInside) {
      this.roomMenuIndex = null;
    }
  }

  loadDepartment(){
    this.departmentService.getAllDepartments().subscribe((res: any) => {
      this.department = res.data;
    });
  }
}
