export interface LoreCharacter {
  id: string
  user_id: string
  character_name: string
  created_at: string
  updated_at: string
}

export interface LoreYarn {
  id: string
  author_id: string
  title: string
  body_html: string
  day: number | null
  month: number | null
  year: number
  place: string | null
  event_id: string | null
  event_timing: 'lead_up' | 'happened_at' | null
  parent_yarn_id: string | null
  word_count: number
  created_at: string
  updated_at: string
  character?: LoreCharacter
  event?: LoreEvent
  tags?: LoreTag[]
  characters_mentioned?: LoreCharacter[]
}

export interface LoreEvent {
  id: string
  title: string
  created_at: string
}

export interface LoreTag {
  id: string
  name: string
  is_taboo: boolean
}

export interface LoreHeart {
  user_id: string
  yarn_id: string | null
  event_id: string | null
}

export interface LoreFollow {
  user_id: string
  follow_type: 'character' | 'tag' | 'place'
  follow_value: string
}

export interface LoreNotification {
  id: string
  user_id: string
  notif_type: 'mention' | 'follow_yarn' | 'follow_tag' | 'follow_place'
  yarn_id: string | null
  read: boolean
  created_at: string
}
