import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MembershipRequest,
  MembershipResponse,
  Member,
  MeetingMember,
  ApprovalRequest,
  Role,
  RejectRequest,
} from '../models/member.model';

@Injectable({
  providedIn: 'root'
})
export class MemberService {

  private apiUrl = `${environment.apiUrl}/members`;

  constructor(private http: HttpClient) {}

  requestToJoinMeeting(request: MembershipRequest): Observable<MembershipResponse> {
    return this.http.post<MembershipResponse>(`${this.apiUrl}/request`, request);
  }

  getMembersByRoom(roomId: number | string): Observable<Member[]> {
    return this.http.get<Member[]>(`${this.apiUrl}/room/${roomId}`);
  }

  searchMembers(params: {
    meetingId: number;
    isActive?: boolean;
    page?: number;
    size?: number;
    sortBy?: string;
  }): Observable<any> {
    let httpParams = new HttpParams().set(
      'meetingId',
      params.meetingId.toString()
    );
    if (params.isActive !== undefined) {
      httpParams = httpParams.set('isActive', params.isActive.toString());
    }
    let sortBy = 'isActive';
    if (params.sortBy) {
      sortBy = params.sortBy;
    }
    httpParams = httpParams.set('sortBy', sortBy);
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/search`, { params: httpParams });
  }

  approveMembers(request: ApprovalRequest): Observable<MembershipResponse> {
    return this.http.post<MembershipResponse>(`${this.apiUrl}/approve`, request);
  }

  getRoles(): Observable<{ data: Role[] }> {
    return this.http.get<{ data: Role[] }>(`${this.apiUrl}/roles`);
  }

  updateMember(memberId: number, roleId: number, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${memberId}`, { roleId, isActive });
  }

  rejectMembers(request: RejectRequest): Observable<MembershipResponse> {
    return this.http.post<MembershipResponse>(`${this.apiUrl}/reject`, request);
  }

  inviteMembers(inviteRequest: {
    meetingId: number;
    members: Array<{
      userId: number;
      roleId: number;
    }>;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/invite`, inviteRequest);
  }

  
}
