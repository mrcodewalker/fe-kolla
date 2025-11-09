import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { MemberService } from '../../services/member.service';
import { LoadingService } from '../../services/loading.service';
import { MembershipRequest } from '../../models/member.model';

@Component({
  selector: 'app-membership-requirement',
  templateUrl: './membership-requirement.component.html',
  styleUrls: ['./membership-requirement.component.scss']
})
export class MembershipRequirementComponent implements OnInit {
  @Input() meetingId: number | null = null;
  @Input() meetingTitle: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  isLoading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  constructor(
    private memberService: MemberService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    if (this.meetingId && this.meetingTitle) {
      this.message = `Bạn đang yêu cầu tham gia cuộc họp: ${this.meetingTitle}`;
      this.messageType = 'info';
    } else {
      this.message = 'Không tìm thấy thông tin cuộc họp.';
      this.messageType = 'error';
    }
  }

  requestToJoinMeeting(): void {
    if (!this.meetingId) {
      this.message = 'Không tìm thấy thông tin cuộc họp.';
      this.messageType = 'error';
      return;
    }

    this.isLoading = true;
    this.message = 'Đang gửi yêu cầu tham gia cuộc họp...';
    this.messageType = 'info';

    const request: MembershipRequest = {
      meetingId: this.meetingId
    };

    this.memberService.requestToJoinMeeting(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.message = 'Yêu cầu tham gia cuộc họp đã được gửi thành công! Vui lòng chờ phê duyệt.';
          this.messageType = 'success';
          // Emit success event after a short delay
          setTimeout(() => {
            this.success.emit();
          }, 2000);
        } else {
          this.message = response.message || 'Có lỗi xảy ra khi gửi yêu cầu.';
          this.messageType = 'error';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.message = 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.';
        this.messageType = 'error';
        console.error('Error requesting to join meeting:', error);
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }
}
