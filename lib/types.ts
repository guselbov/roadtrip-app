export type MemberRole = "owner" | "member"
export type MemberStatus = "pending" | "approved" | "rejected"

export interface Profile {
  id: string
  display_name: string
  email: string | null
}

export interface Trip {
  id: string
  owner_id: string
  slug: string
  code: string
  title: string
  description: string | null
  date_start: string | null
  date_end: string | null
  status: "planning" | "live" | "done"
  created_at: string
}

export interface Stage {
  id: string
  roadtrip_id: string
  name: string
  description: string | null
  lat: number | null
  lng: number | null
  date_start: string | null
  date_end: string | null
  order_index: number
  color: string | null
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  role: MemberRole
  status: MemberStatus
  date_start: string | null
  date_end: string | null
  message: string | null
  created_at: string
  profiles?: Profile
}

export interface Participation {
  id: string
  member_id: string
  stage_id: string
  date_start: string
  date_end: string
  trip_members?: TripMember
  stages?: Stage
}

export interface Message {
  id: string
  stage_id: string
  author_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export interface Photo {
  id: string
  stage_id: string
  author_id: string
  url: string
  storage_path: string | null
  created_at: string
  profiles?: Profile
}

export type NotificationType =
  | "join_request"
  | "join_approved"
  | "join_rejected"
  | "new_message"
  | "new_photo"

export interface AppNotification {
  id: string
  user_id: string
  trip_id: string | null
  stage_id: string | null
  actor_id: string | null
  type: NotificationType
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

/** Forme renvoyée par la fonction SQL get_public_trip(slug). */
export interface PublicTrip {
  id: string
  slug: string
  title: string
  description: string | null
  date_start: string | null
  date_end: string | null
  status: string
  owner_name: string | null
  member_count: number
  stages: (Stage & { people: number })[]
}

export type ActivityStatus = "proposed" | "scheduled" | "rejected"

export interface Activity {
  id: string
  trip_id: string
  stage_id: string | null
  author_id: string
  title: string
  description: string | null
  place: string | null
  address: string | null
  url: string | null
  starts_on: string | null
  starts_at: string | null
  status: ActivityStatus
  created_at: string
  profiles?: Profile
}

export interface ActivityVote {
  activity_id: string
  user_id: string
}
