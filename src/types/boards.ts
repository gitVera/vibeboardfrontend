export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export type Board = {
  id: string
  ownerId: string
  name: string
  description: string
  ownerLabel: string
  updatedAt: string
}

export type Profile = {
  id: string
  displayName: string
  role: string
}

export type BoardMember = {
  boardId: string
  userId: string
  displayName: string
  role: string
  addedBy: string | null
  createdAt: string
}

export type BoardColumnDefinition = {
  id: string
  boardId: string
  key: string
  title: string
  position: number
  isSystem: boolean
}

export type Task = {
  id: string
  boardId: string
  title: string
  description: string
  ownerLabel: string
  deadlineAt: string | null
  columnId: string
  priority: TaskPriority
  status: TaskStatus
  position: number
  updatedAt: string
}

export type BoardColumnView = {
  id: string
  key: string
  title: string
  position: number
  isSystem: boolean
  tasks: Task[]
}

export const DEFAULT_BOARD_COLUMNS: Array<{ key: string; title: string; position: number; isSystem: boolean }> = [
  { key: 'todo', title: 'To Do', position: 0, isSystem: true },
  { key: 'in_progress', title: 'In Progress', position: 1, isSystem: true },
  { key: 'in_review', title: 'In Review', position: 2, isSystem: true },
  { key: 'done', title: 'Done', position: 3, isSystem: true },
]

export const KNOWN_TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done']
