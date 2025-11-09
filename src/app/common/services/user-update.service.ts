import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserUpdateService {
  private userUpdated = new Subject<void>();
  userUpdated$ = this.userUpdated.asObservable();

  notifyUpdate() {
    this.userUpdated.next();
  }
}
