import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { IT_TEAM_ROLES } from '../constants/roles'
import {
  addBoardMember,
  createBoard,
  createBoardColumn,
  createTask,
  deleteBoard,
  deleteBoardColumn,
  deleteTask,
  listBoardColumns,
  listBoardMembers,
  listBoards,
  listTasks,
  removeBoardMember,
  updateBoard,
  updateBoardColumn,
  updateTask,
} from '../lib/boardsApi'
import { listProfiles } from '../lib/profilesApi'
import { supabase } from '../lib/supabase'
import {
  type Board,
  type BoardColumnDefinition,
  type BoardColumnView,
  type BoardMember,
  type Profile,
  type Task,
  type TaskPriority,
} from '../types/boards'

type BoardsPageProps = {
  userName: string
  userRole?: string
}

type BoardFormState = {
  name: string
  description: string
  ownerLabel: string
}

type TaskFormState = {
  title: string
  description: string
  ownerLabel: string
  deadlineAt: string
  priority: TaskPriority
  columnId: string
}

type ColumnFormState = {
  title: string
}

const initialBoardForm: BoardFormState = {
  name: '',
  description: '',
  ownerLabel: '',
}

const initialTaskForm: TaskFormState = {
  title: '',
  description: '',
  ownerLabel: '',
  deadlineAt: '',
  priority: 'medium',
  columnId: '',
}

const initialColumnForm: ColumnFormState = {
  title: '',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'border-slate-300 bg-slate-100 text-slate-700',
  medium: 'border-amber-300 bg-amber-100 text-amber-700',
  high: 'border-rose-300 bg-rose-100 text-rose-700',
}

const MEMBER_BADGE_STYLES = [
  'bg-rose-100 text-rose-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-lime-100 text-lime-700',
]

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function displayName(value: string): string {
  return value.trim() || 'Пользователь'
}

function displayTaskOwner(value: string): string {
  return value.trim() || 'Не назначено'
}

function formatDeadlineDate(value: string | null): string {
  if (!value) {
    return 'Не назначено'
  }
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) {
    return value
  }
  return `${day}.${month}.${year}`
}

function getTodayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDeadlineTone(deadlineAt: string | null): string {
  if (!deadlineAt) {
    return 'text-slate-500'
  }

  const today = getTodayIsoDate()
  if (deadlineAt < today) {
    return 'text-red-700'
  }

  return 'text-emerald-700'
}

function colorIndexFromUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return hash % MEMBER_BADGE_STYLES.length
}

export function BoardsPage({ userName, userRole }: BoardsPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { boardId: routeBoardId, taskId: routeTaskId } = useParams<{ boardId?: string; taskId?: string }>()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [boardColumns, setBoardColumns] = useState<BoardColumnDefinition[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setLoading] = useState(true)
  const [isTasksLoading, setTasksLoading] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const tasksRequestIdRef = useRef(0)

  const [isBoardCreateOpen, setBoardCreateOpen] = useState(false)
  const [boardViewId, setBoardViewId] = useState<string | null>(null)
  const [boardEditId, setBoardEditId] = useState<string | null>(null)
  const [boardDeleteId, setBoardDeleteId] = useState<string | null>(null)
  const [boardForm, setBoardForm] = useState<BoardFormState>(initialBoardForm)

  const [isTaskCreateOpen, setTaskCreateOpen] = useState(false)
  const [taskDeleteId, setTaskDeleteId] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm)
  const [isColumnCreateOpen, setColumnCreateOpen] = useState(false)
  const [columnEditId, setColumnEditId] = useState<string | null>(null)
  const [columnDeleteId, setColumnDeleteId] = useState<string | null>(null)
  const [columnForm, setColumnForm] = useState<ColumnFormState>(initialColumnForm)

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([])
  const [isAccessLoading, setAccessLoading] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState('')
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('')
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)

  const selectedBoard = useMemo(() => boards.find((board) => board.id === routeBoardId) ?? null, [boards, routeBoardId])
  const selectedBoardId = selectedBoard?.id ?? null
  const isTaskEditPage = location.pathname.endsWith('/edit')
  const boardView = useMemo(() => boards.find((board) => board.id === boardViewId) ?? null, [boards, boardViewId])
  const boardEdit = useMemo(() => boards.find((board) => board.id === boardEditId) ?? null, [boards, boardEditId])
  const boardDelete = useMemo(() => boards.find((board) => board.id === boardDeleteId) ?? null, [boards, boardDeleteId])
  const selectedTask = useMemo(() => tasks.find((task) => task.id === routeTaskId) ?? null, [tasks, routeTaskId])
  const taskDelete = useMemo(() => tasks.find((task) => task.id === taskDeleteId) ?? null, [tasks, taskDeleteId])

  const todoColumnId = useMemo(
    () => boardColumns.find((column) => column.key === 'todo')?.id ?? boardColumns[0]?.id ?? '',
    [boardColumns],
  )

  const columns: BoardColumnView[] = useMemo(
    () =>
      boardColumns.map((column) => ({
        id: column.id,
        key: column.key,
        title: column.title,
        position: column.position,
        isSystem: column.isSystem,
        tasks: tasks
          .filter((task) => task.columnId === column.id)
          .sort((a, b) => a.position - b.position),
      })),
    [boardColumns, tasks],
  )

  const columnEdit = useMemo(
    () => boardColumns.find((column) => column.id === columnEditId) ?? null,
    [boardColumns, columnEditId],
  )

  const columnDelete = useMemo(
    () => boardColumns.find((column) => column.id === columnDeleteId) ?? null,
    [boardColumns, columnDeleteId],
  )

  const availableProfiles = useMemo(() => {
    const query = memberSearchQuery.trim().toLowerCase()
    return profiles.filter((profile) => {
      if (memberRoleFilter && profile.role !== memberRoleFilter) {
        return false
      }
      if (!query) {
        return true
      }
      return (
        profile.displayName.toLowerCase().includes(query) ||
        profile.role.toLowerCase().includes(query)
      )
    })
  }, [profiles, memberSearchQuery, memberRoleFilter])

  const taskOwnerOptions = useMemo(() => {
    const ownerLabels = new Set<string>()

    for (const member of boardMembers) {
      const label = member.displayName.trim()
      if (label) {
        ownerLabels.add(label)
      }
    }

    const boardOwnerLabel = selectedBoard?.ownerLabel.trim()
    if (boardOwnerLabel) {
      ownerLabels.add(boardOwnerLabel)
    }

    const currentUserLabel = displayName(userName)
    if (currentUserLabel) {
      ownerLabels.add(currentUserLabel)
    }

    const selectedTaskOwnerLabel = taskForm.ownerLabel.trim()
    if (selectedTaskOwnerLabel) {
      ownerLabels.add(selectedTaskOwnerLabel)
    }

    return Array.from(ownerLabels).sort((left, right) => left.localeCompare(right, 'ru'))
  }, [boardMembers, selectedBoard, taskForm.ownerLabel, userName])

  const setBoardField = (field: keyof BoardFormState, value: string) => {
    setBoardForm((prev) => ({ ...prev, [field]: value }))
  }

  const setTaskField = <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }))
  }

  const setColumnField = (field: keyof ColumnFormState, value: string) => {
    setColumnForm((prev) => ({ ...prev, [field]: value }))
  }

  const closeAllModals = () => {
    setBoardCreateOpen(false)
    setBoardViewId(null)
    setBoardEditId(null)
    setBoardDeleteId(null)
    setTaskCreateOpen(false)
    setTaskDeleteId(null)
    setColumnCreateOpen(false)
    setColumnEditId(null)
    setColumnDeleteId(null)
    setBoardForm(initialBoardForm)
    setTaskForm(initialTaskForm)
    setColumnForm(initialColumnForm)
  }

  const loadBoardDataForBoard = async (boardId: string) => {
    const requestId = ++tasksRequestIdRef.current
    setTasksLoading(true)
    try {
      const [loadedColumns, loadedTasks] = await Promise.all([listBoardColumns(boardId), listTasks(boardId)])
      if (tasksRequestIdRef.current === requestId) {
        setBoardColumns(loadedColumns)
        setTasks(loadedTasks)
      }
    } finally {
      if (tasksRequestIdRef.current === requestId) {
        setTasksLoading(false)
      }
    }
  }

  const loadBoardsAndTasks = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setCurrentUserId(null)
        setBoards([])
        setBoardColumns([])
        setTasks([])
        return
      }

      setCurrentUserId(user.id)
      const loadedBoards = await listBoards()
      setBoards(loadedBoards)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить boards/tasks из Supabase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBoardsAndTasks()
  }, [])

  useEffect(() => {
    if (!routeBoardId) {
      setBoardColumns([])
      setTasks([])
      setTasksLoading(false)
      return
    }
    void loadBoardDataForBoard(routeBoardId).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить задачи.')
      setTasksLoading(false)
    })
  }, [routeBoardId])

  const loadBoardAccessData = async (boardId: string) => {
    setAccessLoading(true)
    try {
      const [loadedProfiles, loadedMembers] = await Promise.all([listProfiles(), listBoardMembers(boardId)])
      setProfiles(loadedProfiles)
      setBoardMembers(loadedMembers)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить пользователей.')
    } finally {
      setAccessLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedBoardId || !currentUserId) {
      return
    }
    setMemberSearchQuery('')
    setMemberRoleFilter('')
    setSelectedUserToAdd('')
    void loadBoardAccessData(selectedBoardId)
  }, [selectedBoardId, currentUserId])

  useEffect(() => {
    if (!isTaskEditPage || !selectedTask) {
      return
    }

    setTaskForm({
      title: selectedTask.title,
      description: selectedTask.description,
      ownerLabel: selectedTask.ownerLabel,
      deadlineAt: selectedTask.deadlineAt ?? '',
      priority: selectedTask.priority,
      columnId: selectedTask.columnId,
    })
  }, [isTaskEditPage, selectedTask])

  const handleSelectBoard = (boardId: string) => {
    if (boardId === routeBoardId) {
      return
    }
    navigate(`/boards/${boardId}`)
  }

  const openCreateBoard = () => {
    setBoardForm({
      ...initialBoardForm,
      ownerLabel: displayName(userName),
    })
    setBoardCreateOpen(true)
  }

  const openEditBoard = (board: Board) => {
    setBoardForm({
      name: board.name,
      description: board.description,
      ownerLabel: board.ownerLabel,
    })
    setBoardEditId(board.id)
  }

  const openCreateTask = (columnId: string) => {
    setTaskForm({
      ...initialTaskForm,
      ownerLabel: '',
      columnId,
    })
    setTaskCreateOpen(true)
  }

  const openCreateColumn = () => {
    setColumnForm(initialColumnForm)
    setColumnCreateOpen(true)
  }

  const openEditColumn = (column: Pick<BoardColumnDefinition, 'id' | 'title'>) => {
    setColumnForm({ title: column.title })
    setColumnEditId(column.id)
  }

  const handleColumnTitleClick = (column: BoardColumnView) => {
    if (!currentUserId) {
      return
    }
    openEditColumn(column)
  }

  const openTaskPage = (task: Task) => {
    if (!selectedBoardId) return
    navigate(`/boards/${selectedBoardId}/tasks/${task.id}`)
  }

  const openTaskEditPage = (task: Task) => {
    if (!selectedBoardId) return
    navigate(`/boards/${selectedBoardId}/tasks/${task.id}/edit`)
  }

  const handleCreateBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentUserId) return

    const name = boardForm.name.trim()
    const ownerLabel = boardForm.ownerLabel.trim()
    if (!name || !ownerLabel) return

    setSaving(true)
    setErrorMessage(null)
    try {
      const created = await createBoard({
        ownerId: currentUserId,
        name,
        description: boardForm.description.trim(),
        ownerLabel,
      })
      setBoards((prev) => [created, ...prev])
      navigate(`/boards/${created.id}`)
      closeAllModals()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось создать доску.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!boardEdit) return

    const name = boardForm.name.trim()
    const ownerLabel = boardForm.ownerLabel.trim()
    if (!name || !ownerLabel) return

    setSaving(true)
    setErrorMessage(null)
    try {
      const updated = await updateBoard(boardEdit.id, {
        name,
        description: boardForm.description.trim(),
        ownerLabel,
      })
      setBoards((prev) => prev.map((board) => (board.id === updated.id ? updated : board)))
      closeAllModals()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось изменить доску.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBoard = async () => {
    if (!boardDelete) return
    setSaving(true)
    setErrorMessage(null)
    try {
      await deleteBoard(boardDelete.id)
      const remainingBoards = boards.filter((board) => board.id !== boardDelete.id)
      setBoards(remainingBoards)

      if (selectedBoardId === boardDelete.id) {
        const nextBoardId = remainingBoards[0]?.id
        navigate(nextBoardId ? `/boards/${nextBoardId}` : '/boards')
      }
      closeAllModals()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить доску.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBoardId) return

    const title = taskForm.title.trim()
    const ownerLabel = taskForm.ownerLabel.trim()
    if (!title) return

    const position = tasks.filter((task) => task.columnId === taskForm.columnId).length
    setSaving(true)
    setErrorMessage(null)
    try {
      await createTask({
        boardId: selectedBoardId,
        title,
        description: taskForm.description.trim(),
        ownerLabel,
        deadlineAt: taskForm.deadlineAt || null,
        columnId: taskForm.columnId,
        priority: taskForm.priority,
        position,
      })
      await loadBoardDataForBoard(selectedBoardId)
      closeAllModals()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось создать задачу.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTask || !selectedBoardId) return

    const title = taskForm.title.trim()
    const ownerLabel = taskForm.ownerLabel.trim()
    if (!title) return

    const position = tasks.filter((task) => task.id !== selectedTask.id && task.columnId === taskForm.columnId).length
    setSaving(true)
    setErrorMessage(null)
    try {
      await updateTask(selectedTask.id, {
        title,
        description: taskForm.description.trim(),
        ownerLabel,
        deadlineAt: taskForm.deadlineAt || null,
        columnId: taskForm.columnId,
        priority: taskForm.priority,
        position,
      })
      await loadBoardDataForBoard(selectedBoardId)
      navigate(`/boards/${selectedBoardId}/tasks/${selectedTask.id}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось изменить задачу.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!taskDelete || !selectedBoardId) return
    setSaving(true)
    setErrorMessage(null)
    try {
      await deleteTask(taskDelete.id)
      await loadBoardDataForBoard(selectedBoardId)
      closeAllModals()
      if (routeTaskId === taskDelete.id) {
        navigate(`/boards/${selectedBoardId}`)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить задачу.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddBoardMember = async () => {
    if (!selectedBoardId || !currentUserId || !selectedUserToAdd) {
      return
    }

    setSaving(true)
    setErrorMessage(null)
    try {
      const createdMember = await addBoardMember(selectedBoardId, selectedUserToAdd, currentUserId)
      setBoardMembers((prev) => [...prev, createdMember])
      setSelectedUserToAdd('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось добавить пользователя к доске.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveBoardMember = async (userId: string) => {
    if (!selectedBoardId) {
      return
    }

    setSaving(true)
    setErrorMessage(null)
    try {
      await removeBoardMember(selectedBoardId, userId)
      setBoardMembers((prev) => prev.filter((member) => member.userId !== userId))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить доступ пользователя.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateColumn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBoardId) {
      return
    }

    const title = columnForm.title.trim()
    if (!title) {
      return
    }

    setSaving(true)
    setErrorMessage(null)
    try {
      await createBoardColumn(selectedBoardId, title)
      await loadBoardDataForBoard(selectedBoardId)
      closeAllModals()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось создать колонку.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditColumn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!columnEdit || !selectedBoardId) {
      return
    }

    const title = columnForm.title.trim()
    if (!title) {
      return
    }

    setSaving(true)
    setErrorMessage(null)
    try {
      await updateBoardColumn(columnEdit.id, title)
      await loadBoardDataForBoard(selectedBoardId)
      closeAllModals()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось переименовать колонку.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteColumn = async () => {
    if (!columnDelete || !selectedBoardId) {
      return
    }

    setSaving(true)
    setErrorMessage(null)
    try {
      await deleteBoardColumn(selectedBoardId, columnDelete.id)
      await loadBoardDataForBoard(selectedBoardId)
      closeAllModals()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить колонку.')
    } finally {
      setSaving(false)
    }
  }

  const handleTaskDragStart = (taskId: string) => {
    if (!currentUserId) {
      return
    }
    setDraggedTaskId(taskId)
  }

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverColumnId(null)
  }

  const handleColumnDragOver = (event: DragEvent<HTMLElement>, columnId: string) => {
    if (!currentUserId || !draggedTaskId) {
      return
    }
    event.preventDefault()
    setDragOverColumnId(columnId)
  }

  const handleColumnDragLeave = (event: DragEvent<HTMLElement>, columnId: string) => {
    if (event.target !== event.currentTarget) {
      return
    }
    setDragOverColumnId((prev) => (prev === columnId ? null : prev))
  }

  const handleColumnDrop = async (event: DragEvent<HTMLElement>, targetColumnId: string) => {
    event.preventDefault()
    setDragOverColumnId(null)

    if (!selectedBoardId || !draggedTaskId) {
      setDraggedTaskId(null)
      return
    }

    const task = tasks.find((item) => item.id === draggedTaskId)
    setDraggedTaskId(null)

    if (!task || task.columnId === targetColumnId) {
      return
    }

    const position = tasks.filter((item) => item.columnId === targetColumnId).length
    setSaving(true)
    setErrorMessage(null)
    try {
      await updateTask(task.id, {
        title: task.title,
        description: task.description,
        ownerLabel: task.ownerLabel,
        deadlineAt: task.deadlineAt,
        columnId: targetColumnId,
        priority: task.priority,
        position,
      })
      await loadBoardDataForBoard(selectedBoardId)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось переместить задачу.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 text-slate-800">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-pink-700">Мои доски</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{selectedBoard ? selectedBoard.name : 'Boards'}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Добро пожаловать, {userName}
            {userRole ? ` · ${userRole}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedBoardId ? (
            <button
              type="button"
              onClick={() => navigate('/boards')}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-rose-100"
            >
              ← К списку досок
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openCreateTask(todoColumnId)}
            disabled={!selectedBoard || !currentUserId || !todoColumnId}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Новая задача
          </button>
          <button
            type="button"
            onClick={openCreateBoard}
            disabled={!currentUserId}
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2.5 text-sm font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Новая доска
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {!currentUserId ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Войдите в аккаунт, чтобы управлять досками и задачами в Supabase.
        </p>
      ) : null}
      {isLoading ? (
        <p className="mb-6 rounded-xl border border-rose-200 bg-white/90 px-4 py-3 text-sm text-slate-600">
          Загружаем boards/tasks...
        </p>
      ) : null}

      {!selectedBoardId ? (
        <section className="mb-8 rounded-2xl border border-rose-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Список досок</h2>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs text-slate-600">{boards.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {boards.map((board) => {
              const tasksCount = tasks.length && board.id === selectedBoardId
                ? tasks.length
                : 0
              const isActive = board.id === selectedBoardId
              return (
                <article
                  key={board.id}
                  className={`rounded-xl border p-4 ${
                    isActive ? 'border-pink-300 bg-pink-50' : 'border-rose-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{board.name}</h3>
                      <p className="mt-1 text-xs text-slate-600">Owner: {board.ownerLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">Обновлена: {formatDate(board.updatedAt)}</p>
                    </div>
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-slate-600">{tasksCount} задач</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs text-slate-600">{board.description || 'Описание пока не добавлено.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectBoard(board.id)}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:bg-rose-100"
                    >
                      Открыть
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoardViewId(board.id)}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:bg-rose-100"
                    >
                      Просмотр
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditBoard(board)}
                      disabled={!currentUserId}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoardDeleteId(board.id)}
                      disabled={!currentUserId}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      {selectedBoardId ? (
        routeTaskId ? (
          <section className="rounded-2xl border border-rose-200/80 bg-white/90 p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                {isTaskEditPage ? 'Изменение задачи' : 'Просмотр задачи'}
              </h2>
              <button
                type="button"
                onClick={() => navigate(`/boards/${selectedBoardId}`)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-rose-100"
              >
                ← К задачам доски
              </button>
            </div>

            {isTasksLoading ? (
              <p className="rounded-xl border border-rose-200 bg-white px-4 py-5 text-sm text-slate-600">
                Загружаем задачу...
              </p>
            ) : null}

            {!isTasksLoading && !selectedTask ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-700">
                Задача не найдена в этой доске.
              </p>
            ) : null}

            {!isTasksLoading && selectedTask && !isTaskEditPage ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-rose-200 bg-white p-4">
                  <h3 className="text-lg font-semibold text-slate-900">{selectedTask.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{selectedTask.description || 'Без описания.'}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-rose-200 bg-white p-3">
                    <p className="text-xs text-slate-500">Колонка</p>
                    <p className="mt-1 text-sm text-slate-900">{boardColumns.find((column) => column.id === selectedTask.columnId)?.title ?? '—'}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-white p-3">
                    <p className="text-xs text-slate-500">Исполнитель</p>
                    <p className="mt-1 text-sm text-slate-900">{displayTaskOwner(selectedTask.ownerLabel)}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-white p-3">
                    <p className="text-xs text-slate-500">Выполнить к</p>
                    <p className={`mt-1 text-sm ${getDeadlineTone(selectedTask.deadlineAt)}`}>{formatDeadlineDate(selectedTask.deadlineAt)}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-white p-3">
                    <p className="text-xs text-slate-500">Приоритет</p>
                    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${PRIORITY_STYLES[selectedTask.priority]}`}>{PRIORITY_LABELS[selectedTask.priority]}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openTaskEditPage(selectedTask)} disabled={!currentUserId} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60">Изменить</button>
                  <button type="button" onClick={() => setTaskDeleteId(selectedTask.id)} disabled={!currentUserId} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">Удалить</button>
                </div>
              </div>
            ) : null}

            {!isTasksLoading && selectedTask && isTaskEditPage ? (
              <form className="space-y-4" onSubmit={handleEditTask}>
                <label className="block text-sm text-slate-700">Название задачи
                  <input type="text" value={taskForm.title} onChange={(event) => setTaskField('title', event.target.value)} required className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
                </label>
                <label className="block text-sm text-slate-700">Исполнитель
                  <select value={taskForm.ownerLabel} onChange={(event) => setTaskField('ownerLabel', event.target.value)} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none">
                    <option value="">Не назначено</option>
                    {taskOwnerOptions.map((ownerLabel) => (
                      <option key={ownerLabel} value={ownerLabel} className="bg-white text-slate-800">
                        {ownerLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-700">Выполнить к
                  <input type="date" value={taskForm.deadlineAt} onChange={(event) => setTaskField('deadlineAt', event.target.value)} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-slate-700">Приоритет
                    <select value={taskForm.priority} onChange={(event) => setTaskField('priority', event.target.value as TaskPriority)} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none">
                      <option value="low" className="bg-white text-slate-800">Низкий</option>
                      <option value="medium" className="bg-white text-slate-800">Средний</option>
                      <option value="high" className="bg-white text-slate-800">Высокий</option>
                    </select>
                  </label>
                  <label className="block text-sm text-slate-700">Колонка
                    <select value={taskForm.columnId} onChange={(event) => setTaskField('columnId', event.target.value)} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none">
                      {boardColumns.map((column) => (
                        <option key={column.id} value={column.id} className="bg-white text-slate-800">{column.title}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block text-sm text-slate-700">Описание
                  <textarea value={taskForm.description} onChange={(event) => setTaskField('description', event.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => navigate(`/boards/${selectedBoardId}/tasks/${selectedTask.id}`)} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100">Отмена</button>
                  <button type="submit" disabled={isSaving} className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60">Сохранить задачу</button>
                </div>
              </form>
            ) : null}
          </section>
        ) : (
          <>
            <section className="mb-6 rounded-2xl border border-rose-200/80 bg-white/90 p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Добавить пользователя</h2>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs text-slate-600">
                  {boardMembers.length} участников
                </span>
              </div>

              {isAccessLoading ? (
                <p className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Загружаем пользователей...
                </p>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="block text-sm text-slate-700 md:col-span-1">
                      Поиск пользователя
                      <input
                        type="search"
                        value={memberSearchQuery}
                        onChange={(event) => setMemberSearchQuery(event.target.value)}
                        placeholder="Имя или роль"
                        className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none"
                      />
                    </label>
                    <label className="block text-sm text-slate-700 md:col-span-1">
                      Фильтр по роли
                      <select
                        value={memberRoleFilter}
                        onChange={(event) => setMemberRoleFilter(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none"
                      >
                        <option value="">Все роли</option>
                        {IT_TEAM_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm text-slate-700 md:col-span-1">
                      Выберите пользователя
                      <select
                        value={selectedUserToAdd}
                        onChange={(event) => setSelectedUserToAdd(event.target.value)}
                        disabled={!currentUserId || availableProfiles.length === 0}
                        className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Выберите пользователя</option>
                        {availableProfiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.displayName} · {profile.role || 'Без роли'}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAddBoardMember()}
                      disabled={!currentUserId || !selectedUserToAdd || isSaving}
                      className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Добавить пользователя
                    </button>
                  </div>

                  <div className="mt-4">
                    {boardMembers.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-rose-200 px-4 py-4 text-sm text-slate-500">
                        Пока никому не выдан доступ к этой доске.
                      </p>
                    ) : (
                      <div className="w-full overflow-x-auto pb-1">
                        <div className="flex min-w-full w-max items-center justify-end gap-3 px-1 pt-2">
                          {boardMembers.map((member) => {
                            const shortName = member.displayName.trim().slice(0, 3).toUpperCase() || 'USR'
                            const memberBadgeStyle = MEMBER_BADGE_STYLES[colorIndexFromUserId(member.userId)]
                            return (
                              <article
                                key={member.userId}
                                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white p-0.5"
                                title={`${member.displayName}${member.role ? ` · ${member.role}` : ''}`}
                              >
                                <span className={`flex h-full w-full items-center justify-center rounded-full text-xs font-semibold ${memberBadgeStyle}`}>
                                  {shortName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveBoardMember(member.userId)}
                                  disabled={!currentUserId || isSaving}
                                  aria-label={`Удалить пользователя ${member.displayName}`}
                                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[11px] font-semibold leading-none text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  ×
                                </button>
                              </article>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Колонки задач</h2>
              <button
                type="button"
                onClick={openCreateColumn}
                disabled={!currentUserId || !selectedBoard}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                + Колонка
              </button>
            </div>

            <div className="overflow-x-auto pb-2">
            <div
              className="grid min-w-max gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(240px, 1fr))` }}
            >
            {isTasksLoading ? (
              <div className="rounded-xl border border-rose-200 bg-white/90 px-4 py-5 text-sm text-slate-600">
                Загружаем задачи выбранной доски...
              </div>
            ) : null}
            {columns.map((column) => (
              <section
                key={column.id}
                className={`rounded-2xl border p-4 shadow-sm backdrop-blur-sm transition ${
                  dragOverColumnId === column.id
                    ? 'border-dashed border-pink-400 bg-rose-100/80'
                    : 'border-rose-200/80 bg-white/90'
                }`}
                onDragOver={(event) => handleColumnDragOver(event, column.id)}
                onDragLeave={(event) => handleColumnDragLeave(event, column.id)}
                onDrop={(event) => void handleColumnDrop(event, column.id)}
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleColumnTitleClick(column)}
                    disabled={!currentUserId}
                    className="text-left font-semibold text-slate-900 transition hover:text-pink-700 disabled:cursor-default disabled:hover:text-slate-900"
                    title={currentUserId ? 'Изменить или удалить колонку' : undefined}
                  >
                    {column.title}
                  </button>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs text-slate-600">{column.tasks.length}</span>
                    <button
                      type="button"
                      onClick={() => openCreateTask(column.id)}
                      disabled={!currentUserId || !selectedBoard}
                      className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] text-slate-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      + Задача
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {column.tasks.map((task) => (
                    <article
                      key={task.id}
                      draggable={Boolean(currentUserId)}
                      onDragStart={() => handleTaskDragStart(task.id)}
                      onDragEnd={handleTaskDragEnd}
                      className={`rounded-xl border border-rose-200 bg-white p-4 transition hover:border-pink-300 ${
                        draggedTaskId === task.id ? 'cursor-grabbing opacity-60' : currentUserId ? 'cursor-grab' : ''
                      }`}
                    >
                      <h3 className="text-sm font-medium text-slate-900">{task.title}</h3>
                      {task.description ? <p className="mt-2 text-xs text-slate-600">{task.description}</p> : null}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${PRIORITY_STYLES[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className="truncate text-xs text-slate-600">{displayTaskOwner(task.ownerLabel)}</span>
                      </div>
                      <p className={`mt-2 text-xs ${getDeadlineTone(task.deadlineAt)}`}>Выполнить к: {formatDeadlineDate(task.deadlineAt)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => openTaskPage(task)} className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 transition hover:bg-rose-100">Просмотр</button>
                        <button type="button" onClick={() => openTaskEditPage(task)} disabled={!currentUserId} className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60">Изменить</button>
                        <button type="button" onClick={() => setTaskDeleteId(task.id)} disabled={!currentUserId} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">Удалить</button>
                      </div>
                    </article>
                  ))}
                  {column.tasks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-rose-200 px-4 py-6 text-center text-sm text-slate-500">Нет задач</p>
                  ) : null}
                </div>
              </section>
            ))}
            </div>
            </div>
          </>
        )
      ) : (
        <section className="rounded-2xl border border-rose-200/80 bg-white/90 p-6 text-center shadow-sm">
          <p className="text-sm text-slate-600">Выберите доску из списка выше, чтобы открыть отдельную страницу с её задачами.</p>
        </section>
      )}

      {isBoardCreateOpen || boardEdit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-2xl shadow-pink-200/50" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">{boardEdit ? 'Изменить доску' : 'Новая доска'}</h3>
            <form className="mt-4 space-y-4" onSubmit={boardEdit ? handleEditBoard : handleCreateBoard}>
              <label className="block text-sm text-slate-700">Название
                <input type="text" value={boardForm.name} onChange={(event) => setBoardField('name', event.target.value)} required className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
              </label>
              <label className="block text-sm text-slate-700">Owner
                <input type="text" value={boardForm.ownerLabel} onChange={(event) => setBoardField('ownerLabel', event.target.value)} required className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
              </label>
              <label className="block text-sm text-slate-700">Описание
                <textarea value={boardForm.description} onChange={(event) => setBoardField('description', event.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeAllModals} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100">Отмена</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60">{boardEdit ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isTaskCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-2xl shadow-pink-200/50" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Новая задача</h3>
            <form className="mt-4 space-y-4" onSubmit={handleCreateTask}>
              <label className="block text-sm text-slate-700">Название задачи
                <input type="text" value={taskForm.title} onChange={(event) => setTaskField('title', event.target.value)} required className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
              </label>
              <label className="block text-sm text-slate-700">Исполнитель
                <select value={taskForm.ownerLabel} onChange={(event) => setTaskField('ownerLabel', event.target.value)} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none">
                  <option value="">Не назначено</option>
                  {taskOwnerOptions.map((ownerLabel) => (
                    <option key={ownerLabel} value={ownerLabel} className="bg-white text-slate-800">
                      {ownerLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-700">Выполнить к
                <input type="date" value={taskForm.deadlineAt} onChange={(event) => setTaskField('deadlineAt', event.target.value)} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">Приоритет
                  <select value={taskForm.priority} onChange={(event) => setTaskField('priority', event.target.value as TaskPriority)} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none">
                    <option value="low" className="bg-white text-slate-800">Низкий</option>
                    <option value="medium" className="bg-white text-slate-800">Средний</option>
                    <option value="high" className="bg-white text-slate-800">Высокий</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-700">Колонка
                  <select value={taskForm.columnId} onChange={(event) => setTaskField('columnId', event.target.value)} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none">
                    {boardColumns.map((column) => (
                      <option key={column.id} value={column.id} className="bg-white text-slate-800">{column.title}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm text-slate-700">Описание
                <textarea value={taskForm.description} onChange={(event) => setTaskField('description', event.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeAllModals} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100">Отмена</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60">Добавить задачу</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {boardView ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-2xl shadow-pink-200/50" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-xl font-semibold text-slate-900">{boardView.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{boardView.description || 'Без описания.'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-rose-200 bg-white p-3">
                <p className="text-xs text-slate-500">Owner</p>
                <p className="mt-1 text-sm text-slate-900">{boardView.ownerLabel}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white p-3">
                <p className="text-xs text-slate-500">Обновлена</p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(boardView.updatedAt)}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={closeAllModals} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100">Закрыть</button>
            </div>
          </div>
        </div>
      ) : null}

      {boardDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-2xl shadow-pink-200/50" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Удалить доску?</h3>
            <p className="mt-2 text-sm text-slate-600">Доска <span className="font-medium text-slate-900">{boardDelete.name}</span> будет удалена.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeAllModals} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100">Отмена</button>
              <button type="button" onClick={handleDeleteBoard} disabled={isSaving} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">Удалить</button>
            </div>
          </div>
        </div>
      ) : null}

      {taskDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-2xl shadow-pink-200/50" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Удалить задачу?</h3>
            <p className="mt-2 text-sm text-slate-600">Задача <span className="font-medium text-slate-900">{taskDelete.title}</span> будет удалена.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeAllModals} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100">Отмена</button>
              <button type="button" onClick={handleDeleteTask} disabled={isSaving} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">Удалить</button>
            </div>
          </div>
        </div>
      ) : null}

      {isColumnCreateOpen || columnEdit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-2xl shadow-pink-200/50" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">{columnEdit ? 'Переименовать колонку' : 'Новая колонка'}</h3>
            <form className="mt-4 space-y-4" onSubmit={columnEdit ? handleEditColumn : handleCreateColumn}>
              <label className="block text-sm text-slate-700">Название колонки
                <input type="text" value={columnForm.title} onChange={(event) => setColumnField('title', event.target.value)} required className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 focus:border-pink-400 focus:outline-none" />
              </label>
              <div className="flex justify-end gap-2">
                {columnEdit && !(columnEdit.isSystem && columnEdit.key === 'todo') ? (
                  <button
                    type="button"
                    onClick={() => {
                      setColumnDeleteId(columnEdit.id)
                      setColumnEditId(null)
                    }}
                    disabled={isSaving}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Удалить
                  </button>
                ) : null}
                <button type="button" onClick={closeAllModals} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100">Отмена</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60">{columnEdit ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {columnDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-2xl shadow-pink-200/50" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Удалить колонку?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Колонка <span className="font-medium text-slate-900">{columnDelete.title}</span> будет удалена. Все её задачи будут перенесены в To Do.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeAllModals} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100">Отмена</button>
              <button type="button" onClick={() => void handleDeleteColumn()} disabled={isSaving} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">Удалить</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
