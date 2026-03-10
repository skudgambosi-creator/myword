export type IdentityMode = 'named' | 'anonymous'

export interface User {
  id: string
  email: string
  display_name: string
  identity_mode: IdentityMode
  noname_number: number | null
  avatar_storage_path: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  project_type: string
  admin_ids: string[]
  start_date: string
  timezone: string
  locked: boolean
  completed_at: string | null
  created_at: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  joined_at: string
  user?: User
}

export interface Invitation {
  id: string
  group_id: string
  email: string
  token: string
  expires_at: string
  accepted: boolean
  created_at: string
}

export interface Week {
  id: string
  group_id: string
  week_num: number
  letter: string
  opens_at: string
  closes_at: string
  revealed_at: string | null
}

export interface Submission {
  id: string
  group_id: string
  user_id: string
  week_id: string
  word_title: string
  body_html: string
  word_count: number
  is_late_catchup: boolean
  submitted_at: string
  updated_at: string
  user?: User
  week?: Week
}

export interface Score {
  id: string
  group_id: string
  user_id: string
  week_id: string
  score: number
  is_late: boolean
  created_at: string
  user?: User
}

export interface LeaderboardEntry {
  user: User
  total_score: number
  weeks_elapsed: number
  streak: number
}
