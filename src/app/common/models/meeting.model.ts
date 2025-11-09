export interface Meeting {
  id: number;
  title: string;
  description: string;
  meetingCode: string;
  meetingLink: string;
  createdByName: string;
  createdByEmail: string;
  startTime: string;
  endTime: string;
  roomName: string;
  roomCode: string;
  departmentName: string;
  departmentCode: string;
  membershipStatus: 'NONE' | 'APPROVED' | 'PENDING';
  isComingSoon?: boolean;
  isExpired?: boolean;
}

export interface PagedResponse<T> {
  content: T[];
  // pageable, last, totalPages, totalElements, etc. can be added here
}

export interface MeetingResponse {
  success: boolean;
  data: PagedResponse<Meeting>;
}
