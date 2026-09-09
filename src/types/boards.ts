export type TaskStatus = 'todo' | 'in_progress' | 'done'
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

export type Task = {
  id: string
  boardId: string
  title: string
  description: string
  ownerLabel: string
  priority: TaskPriority
  status: TaskStatus
  position: number
  updatedAt: string
}

export type BoardColumn = {
  id: TaskStatus
  title: string
  tasks: Task[]
}

export const BOARD_COLUMNS: Array<{ id: TaskStatus; title: string }> = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
]
