import { supabase } from './supabase'
import type { Board, Task, TaskPriority, TaskStatus } from '../types/boards'

type BoardRow = {
  id: string
  owner_id: string
  name: string
  description: string
  owner_label: string
  updated_at: string
}

type TaskRow = {
  id: string
  board_id: string
  title: string
  description: string
  owner_label: string
  priority: TaskPriority
  status: TaskStatus
  position: number
  updated_at: string
}

function mapBoard(row: BoardRow): Board {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    ownerLabel: row.owner_label,
    updatedAt: row.updated_at,
  }
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    description: row.description ?? '',
    ownerLabel: row.owner_label,
    priority: row.priority,
    status: row.status,
    position: row.position ?? 0,
    updatedAt: row.updated_at,
  }
}

export async function listBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, owner_id, name, description, owner_label, updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as BoardRow[]).map(mapBoard)
}

export async function createBoard(input: {
  ownerId: string
  name: string
  description: string
  ownerLabel: string
}): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      description: input.description,
      owner_label: input.ownerLabel,
    })
    .select('id, owner_id, name, description, owner_label, updated_at')
    .single()

  if (error) {
    throw error
  }

  return mapBoard(data as BoardRow)
}

export async function updateBoard(
  boardId: string,
  input: { name: string; description: string; ownerLabel: string },
): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .update({
      name: input.name,
      description: input.description,
      owner_label: input.ownerLabel,
    })
    .eq('id', boardId)
    .select('id, owner_id, name, description, owner_label, updated_at')
    .single()

  if (error) {
    throw error
  }

  return mapBoard(data as BoardRow)
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', boardId)
  if (error) {
    throw error
  }
}

export async function listTasks(boardId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, board_id, title, description, owner_label, priority, status, position, updated_at')
    .eq('board_id', boardId)
    .order('position', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as TaskRow[]).map(mapTask)
}

export async function createTask(input: {
  boardId: string
  title: string
  description: string
  ownerLabel: string
  priority: TaskPriority
  status: TaskStatus
  position: number
}): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      board_id: input.boardId,
      title: input.title,
      description: input.description,
      owner_label: input.ownerLabel,
      priority: input.priority,
      status: input.status,
      position: input.position,
    })
    .select('id, board_id, title, description, owner_label, priority, status, position, updated_at')
    .single()

  if (error) {
    throw error
  }

  return mapTask(data as TaskRow)
}

export async function updateTask(
  taskId: string,
  input: {
    title: string
    description: string
    ownerLabel: string
    priority: TaskPriority
    status: TaskStatus
    position: number
  },
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: input.title,
      description: input.description,
      owner_label: input.ownerLabel,
      priority: input.priority,
      status: input.status,
      position: input.position,
    })
    .eq('id', taskId)
    .select('id, board_id, title, description, owner_label, priority, status, position, updated_at')
    .single()

  if (error) {
    throw error
  }

  return mapTask(data as TaskRow)
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) {
    throw error
  }
}
