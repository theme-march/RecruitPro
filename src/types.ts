// Shared types for the recruitment management system

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'agent'
  | 'accountant'
  | 'data_entry';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string; // omitted in responses
  role: UserRole;
  created_at?: string;
}

export interface Agent {
  id: number;
  user_id: number;
  phone?: string;
  address?: string;
  commission_rate: number;
  created_at?: string;
}

export interface Candidate {
  id: number;
  agent_id: number | null;
  name: string;
  passport_number: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  package_amount: number;
  total_paid: number;
  due_amount: number;
  status: string;
  passport_copy_url?: string;
  cv_url?: string;
  created_at?: string;
}

export interface Payment {
  id: number;
  candidate_id: number;
  amount: number;
  payment_type: string;
  payment_method: string;
  transaction_id?: string;
  notes?: string;
  created_at?: string;
}

export interface SSLTransaction {
  id: number;
  candidate_id: number;
  amount: number;
  payment_type: string;
  tran_id: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  created_at?: string;
}

export interface Package {
  id: number;
  name: string;
  amount: number;
  description?: string;
  created_at?: string;
}
