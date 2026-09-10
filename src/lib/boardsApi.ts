import { supabase } from './supabase'
import {
  DEFAULT_BOARD_COLUMNS,
  KNOWN_TASK_STATUSES,
  type Board,
  type BoardColumnDefinition,
  type BoardMember,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '../types/boards'

type BoardRow = {
  id: string
  owner_id: string
  name: string
  description: string
  owner_label: string
  updated_at: string
}

type BoardColumnRow = {
  id: string
  board_id: string
  key: string
  title: string
  position: number
  is_system: boolean
}

type TaskRow = {
  id: string
  board_id: string
  title: string
  description: string
  owner_label: string
  deadline_at: string | null
  column_id: string | null
  priority: TaskPriority
  status: TaskStatus
  position: number
  updated_at: string
}

type ProfileRow = {
  id: string
  display_name: string
  role: string
}

type BoardMemberRow = {
  board_id: string
  user_id: string
  added_by: string | null
  created_at: string
}

function statusFromColumnKey(key: string): TaskStatus {
  if (KNOWN_TASK_STATUSES.includes(key as TaskStatus)) {
    return key as TaskStatus
  }
  return 'todo'
}

function mapBoard(row: BoardRow): Board {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description ?? '',
    ownerLabel: row.owner_label,
    updatedAt: row.updated_at,
  }
}

function mapBoardColumn(row: BoardColumnRow): BoardColumnDefinition {
  return {
    id: row.id,
    boardId: row.board_id,
    key: row.key,
    title: row.title,
    position: row.position ?? 0,
    isSystem: row.is_system,
  }
}

function mapBoardMember(row: BoardMemberRow, profile?: ProfileRow): BoardMember {
  return {
    boardId: row.board_id,
    userId: row.user_id,
    displayName: profile?.display_name ?? 'Пользователь',
    role: profile?.role ?? '',
    addedBy: row.added_by,
    createdAt: row.created_at,
  }
}

async function loadProfilesMap(userIds: string[]): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .in('id', userIds)

  if (error) {
    throw error
  }

  const rows = (data ?? []) as ProfileRow[]
  return new Map(rows.map((row) => [row.id, row]))
}

function mapTask(row: TaskRow): Task {
  if (!row.column_id) {
    throw new Error(`Task ${row.id} is missing column_id`)
  }

  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    description: row.description ?? '',
    ownerLabel: row.owner_label,
    deadlineAt: row.deadline_at,
    columnId: row.column_id,
    priority: row.priority,
    status: row.status,
    position: row.position ?? 0,
    updatedAt: row.updated_at,
  }
}

async function createDefaultBoardColumns(boardId: string): Promise<void> {
  const { error } = await supabase.from('board_columns').insert(
    DEFAULT_BOARD_COLUMNS.map((column) => ({
      board_id: boardId,
      key: column.key,
      title: column.title,
      position: column.position,
      is_system: column.isSystem,
    })),
  )

  if (error) {
    throw error
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

  const board = mapBoard(data as BoardRow)
  await createDefaultBoardColumns(board.id)
  return board
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

export async function listBoardColumns(boardId: string): Promise<BoardColumnDefinition[]> {
  const { data, error } = await supabase
    .from('board_columns')
    .select('id, board_id, key, title, position, is_system')
    .eq('board_id', boardId)
    .order('position', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as BoardColumnRow[]).map(mapBoardColumn)
}

export async function createBoardColumn(boardId: string, title: string): Promise<BoardColumnDefinition> {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    throw new Error('Название колонки не может быть пустым.')
  }

  const existingColumns = await listBoardColumns(boardId)
  const position = existingColumns.length
  const key = `custom_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`

  const { data, error } = await supabase
    .from('board_columns')
    .insert({
      board_id: boardId,
      key,
      title: trimmedTitle,
      position,
      is_system: false,
    })
    .select('id, board_id, key, title, position, is_system')
    .single()

  if (error) {
    throw error
  }

  return mapBoardColumn(data as BoardColumnRow)
}

export async function updateBoardColumn(columnId: string, title: string): Promise<BoardColumnDefinition> {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    throw new Error('Название колонки не может быть пустым.')
  }

  const { data, error } = await supabase
    .from('board_columns')
    .update({ title: trimmedTitle })
    .eq('id', columnId)
    .select('id, board_id, key, title, position, is_system')
    .single()

  if (error) {
    throw error
  }

  return mapBoardColumn(data as BoardColumnRow)
}

export async function deleteBoardColumn(boardId: string, columnId: string): Promise<void> {
  const columns = await listBoardColumns(boardId)
  const column = columns.find((item) => item.id === columnId)
  if (!column) {
    throw new Error('Колонка не найдена.')
  }

  if (column.isSystem && column.key === 'todo') {
    throw new Error('Колонку To Do нельзя удалить.')
  }

  const todoColumn = columns.find((item) => item.key === 'todo')
  if (!todoColumn) {
    throw new Error('Колонка To Do не найдена.')
  }

  const { data: movingTasks, error: movingTasksError } = await supabase
    .from('tasks')
    .select('id')
    .eq('column_id', columnId)
    .order('position', { ascending: true })

  if (movingTasksError) {
    throw movingTasksError
  }

  const { count: todoCount, error: todoCountError } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('column_id', todoColumn.id)

  if (todoCountError) {
    throw todoCountError
  }

  const basePosition = todoCount ?? 0
  const taskRows = (movingTasks ?? []) as Array<{ id: string }>

  for (let index = 0; index < taskRows.length; index += 1) {
    const { error: moveError } = await supabase
      .from('tasks')
      .update({
        column_id: todoColumn.id,
        status: 'todo',
        position: basePosition + index,
      })
      .eq('id', taskRows[index].id)

    if (moveError) {
      throw moveError
    }
  }

  const { error: deleteError } = await supabase.from('board_columns').delete().eq('id', columnId)
  if (deleteError) {
    throw deleteError
  }
}

export async function listTasks(boardId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, board_id, title, description, owner_label, deadline_at, column_id, priority, status, position, updated_at')
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
  deadlineAt: string | null
  columnId: string
  priority: TaskPriority
  position: number
}): Promise<Task> {
  const columns = await listBoardColumns(input.boardId)
  const column = columns.find((item) => item.id === input.columnId)
  if (!column) {
    throw new Error('Колонка не найдена.')
  }

  const status = statusFromColumnKey(column.key)

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      board_id: input.boardId,
      title: input.title,
      description: input.description,
      owner_label: input.ownerLabel,
      deadline_at: input.deadlineAt,
      column_id: input.columnId,
      priority: input.priority,
      status,
      position: input.position,
    })
    .select('id, board_id, title, description, owner_label, deadline_at, column_id, priority, status, position, updated_at')
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
    deadlineAt: string | null
    columnId: string
    priority: TaskPriority
    position: number
  },
): Promise<Task> {
  const { data: taskRow, error: taskError } = await supabase
    .from('tasks')
    .select('board_id')
    .eq('id', taskId)
    .single()

  if (taskError) {
    throw taskError
  }

  const columns = await listBoardColumns((taskRow as { board_id: string }).board_id)
  const column = columns.find((item) => item.id === input.columnId)
  if (!column) {
    throw new Error('Колонка не найдена.')
  }

  const status = statusFromColumnKey(column.key)

  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: input.title,
      description: input.description,
      owner_label: input.ownerLabel,
      deadline_at: input.deadlineAt,
      column_id: input.columnId,
      priority: input.priority,
      status,
      position: input.position,
    })
    .eq('id', taskId)
    .select('id, board_id, title, description, owner_label, deadline_at, column_id, priority, status, position, updated_at')
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

export async function listBoardMembers(boardId: string): Promise<BoardMember[]> {
  const { data, error } = await supabase
    .from('board_members')
    .select('board_id, user_id, added_by, created_at')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  const memberRows = (data ?? []) as BoardMemberRow[]
  const profilesMap = await loadProfilesMap(memberRows.map((member) => member.user_id))
  return memberRows.map((row) => mapBoardMember(row, profilesMap.get(row.user_id)))
}

export async function addBoardMember(boardId: string, userId: string, addedBy: string): Promise<BoardMember> {
  const { data, error } = await supabase
    .from('board_members')
    .insert({
      board_id: boardId,
      user_id: userId,
      added_by: addedBy,
    })
    .select('board_id, user_id, added_by, created_at')
    .single()

  if (error) {
    throw error
  }

  const profilesMap = await loadProfilesMap([userId])
  return mapBoardMember(data as BoardMemberRow, profilesMap.get(userId))
}

export async function removeBoardMember(boardId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('board_members').delete().eq('board_id', boardId).eq('user_id', userId)

  if (error) {
    throw error
  }
}
