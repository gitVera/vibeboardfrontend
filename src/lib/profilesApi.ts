import { supabase } from './supabase'
import type { Profile } from '../types/boards'

type ProfileRow = {
  id: string
  display_name: string
  role: string
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
  }
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .order('display_name', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as ProfileRow[]).map(mapProfile)
}

export async function upsertProfile(input: {
  id: string
  displayName: string
  role: string
}): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: input.id,
      display_name: input.displayName,
      role: input.role,
    },
    { onConflict: 'id' },
  )

  if (error) {
    throw error
  }
}
