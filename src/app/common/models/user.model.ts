export interface Department {
  id: number;
  departmentCode: string;
  departmentName: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  userCode: string | null;
  phoneNumber: string | null;
  imgUrl: string | null;
  department: string;
  role: string;
  degree: string | null;
  active: boolean;
  position: string | null;
  dob: string | null;
  bankName: string | null;
  bankNumber: string | null;
  address: string | null;
}

export interface AuthResponse {
  token: string;
  tokenExpiration: string;
  user: User;
}

export interface UserData {
  id: number;
  email: string;
  name: string;
  avatar: string;
  department: string;
  dob: string;
  active: boolean;
  position: string | null;
  role: string;
  userCode: string | null;
}

export interface UserDataResponse {
  success: boolean;
  data: UserData;
}