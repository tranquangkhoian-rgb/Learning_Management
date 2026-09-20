export interface Student {
  id: number;
  code: string;
  full_name: string;
  gender: string;
  birthday: string;
  avatar: string;
  class_name: string;
  order_num: number;
  is_active: number;
  created_at?: string;
}

export interface Assignment {
  id: number;
  title: string;
  subject: string;
  assigned_date: string;
  due_date: string;
  max_score: number;
  notes: string;
  is_active: number;
  created_at?: string;
}

export interface SubmissionEvent {
  id: number;
  student_id: number;
  assignment_id: number;
  event_type: "submit" | "grade" | "resubmit";
  attempt_number: number;
  timestamp: string;
  is_late: number;
  score: number | null;
  status: string;
  teacher_note: string;
  operator: string;
  created_at?: string;
}

export interface Settings {
  teacher_name: string;
  class_name: string;
  teacher_pin: string;
  school_name: string;
  google_sheet_url: string;
  auto_sync_sheets: string;
}

export interface TrackingRow {
  stt: number;
  student_id: number;
  code: string;
  full_name: string;
  gender: string;
  current_status: string;
  color_group: "green" | "yellow" | "orange" | "red" | "blue";
  latest_submit_time: string;
  is_late: boolean;
  submit_count: number;
  retry_count: number;
  first_score: number | null;
  latest_score: number | null;
  teacher_note: string;
  history: SubmissionEvent[];
}

export interface StudentStats {
  student_id: number;
  code: string;
  full_name: string;
  total_assigned: number;
  num_submitted: number;
  num_missing: number;
  on_time_count: number;
  late_count: number;
  asg_requiring_retry_count: number;
  total_resubmit_count: number;
  num_completed: number;
  num_uncompleted: number;
  avg_score: number | null;
  improved_count: number;
  missing_assignments: string[];
  need_fix_assignments: string[];
}

export interface AssignmentStats {
  assignment_id: number;
  title: string;
  subject: string;
  due_date: string;
  total_students: number;
  num_submitted: number;
  num_missing: number;
  num_on_time: number;
  num_late: number;
  num_need_fix: number;
  num_resubmitted: number;
  num_completed: number;
  class_avg_score: number | null;
}

export interface WholeClassStats {
  total_students: number;
  total_assignments: number;
  class_completion_rate: number;
  top_on_time: StudentStats[];
  top_missing: StudentStats[];
  top_late: StudentStats[];
  top_retry: StudentStats[];
  top_improved: StudentStats[];
}

export interface AnalyticsData {
  student_stats: StudentStats[];
  assignment_stats: AssignmentStats[];
  whole_class: WholeClassStats;
}
