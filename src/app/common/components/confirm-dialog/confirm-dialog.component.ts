import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  @Input() title: string = 'Xác nhận';
  @Input() message: string = 'Bạn có chắc chắn muốn tiếp tục?';
  @Input() confirmText: string = 'Xác nhận';
  @Input() cancelText: string = 'Hủy';
  @Input() confirmButtonClass: string = 'bg-cyan-600 hover:bg-cyan-700';
  @Input() showDialog: boolean = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() showDialogChange = new EventEmitter<boolean>();

  onConfirm() {
    this.confirmed.emit();
    this.closeDialog();
  }

  onCancel() {
    this.cancelled.emit();
    this.closeDialog();
  }

  closeDialog() {
    this.showDialog = false;
    this.showDialogChange.emit(false);
  }

  onOverlayClick() {
    this.closeDialog();
  }
}



