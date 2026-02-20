export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  campus: string;
  grade?: string;
}

export interface Book {
  id: number;
  unique_code: string;
  title: string;
  author?: string;
  category?: string;
  status: 'available' | 'borrowed' | 'lost';
  borrower_id?: number;
  borrower_name?: string;
  due_date?: string;
}

export const CAMPUSES = [
  'Main School',
  'Kamulu',
  'Kindergarden',
  'Diani',
  'International'
];

export const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'High School'
];
