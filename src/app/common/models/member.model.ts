export interface MembershipRequest {
  meetingId: number;
}

export interface MeetingMember {
  id: number;
  userId: number;
  userEmail: string;
  name: string;
  meetingId: number;
  meetingTitle: string;
  meetingCode: string;
  roleName: string;
  roleId: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  selected?: boolean;
}

export interface MeetingMemberSearchContent {
  members: MeetingMember[];
  pendingCount: number;
  joinedCount: number;
}

export interface MembershipResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface Member {
  id: number;
  userId: number;
  userEmail: string;
  name: string;
  roomId: number;
  roomName: string;
  roomCode: string;
  roleName: string;
  roleId: number;
  createdAt: string;
  updatedAt: string;
  pendingCount: number | null;
  joinedCount: number | null;
  active: boolean;
}

export interface ApproveMember {
  memberId: number;
  roleId: number;
}


export interface ApprovalRequest {
  meetingId: number;
  approvals: Array<{
    memberId: number;
    roleId: number;
  }>;
}

export interface RejectRequest {
  meetingId: number;
  rejects: Array<{
    memberId: number;
  }>;
}
export interface Role {
  id: number;
  name: string;
  description?: string;
}

