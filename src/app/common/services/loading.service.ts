import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  private requestCount = 0;
  private showTimeoutId: any = null;
  private hideTimeoutId: any = null;

  constructor() { }

  /**
   * Show loading immediately
   * Multiple calls will increment the counter
   */
  show(): void {
    this.requestCount++;
    
    // Show loading ngay lập tức
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
    }
    
    // Clear any pending hide
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
    
    if (this.requestCount === 1) {
      this.loadingSubject.next(true);
    }
  }

  /**
   * Hide loading after 500ms delay
   * Multiple calls will decrement the counter, only hides when count reaches 0
   */
  hide(): void {
    this.requestCount--;
    
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }

    // Nếu còn request đang chạy thì không hide
    if (this.requestCount > 0) {
      return;
    }

    // Nếu không còn request nào, đợi 500ms rồi mới hide
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
    }
    
    this.hideTimeoutId = setTimeout(() => {
      this.requestCount = 0;
      this.loadingSubject.next(false);
      this.hideTimeoutId = null;
    }, 500);
  }

  /**
   * Reset loading state (force hide)
   */
  reset(): void {
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
    this.requestCount = 0;
    this.loadingSubject.next(false);
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }
}

