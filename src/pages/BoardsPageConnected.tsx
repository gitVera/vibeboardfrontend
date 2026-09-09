import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  createBoard,
  createTask,
  deleteBoard,
  deleteTask,
  listBoards,
  listTasks,
  updateBoard,
  updateTask,
} from '../lib/boardsApi'
import { supabase } from '../lib/supabase'
import { BOARD_COLUMNS, type Board, type BoardColumn, type Task, type TaskPriority, type TaskStatus } from '../types/boards'

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
  priority: TaskPriority
  status: TaskStatus
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
  priority: 'medium',
  status: 'todo',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
  medium: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  high: 'border-red-400/30 bg-red-500/10 text-red-200',
}

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

export function BoardsPage({ userName, userRole }: BoardsPageProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
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
  const [taskViewId, setTaskViewId] = useState<string | null>(null)
  const [taskEditId, setTaskEditId] = useState<string | null>(null)
  const [taskDeleteId, setTaskDeleteId] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm)

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? null,
    [boards, selectedBoardId],
  )
  const boardView = useMemo(() => boards.find((board) => board.id === boardViewId) ?? null, [boards, boardViewId])
  const boardEdit = useMemo(() => boards.find((board) => board.id === boardEditId) ?? null, [boards, boardEditId])
  const boardDelete = useMemo(() => boards.find((board) => board.id === boardDeleteId) ?? null, [boards, boardDeleteId])
  const taskView = useMemo(() => tasks.find((task) => task.id === taskViewId) ?? null, [tasks, taskViewId])
  const taskEdit = useMemo(() => tasks.find((task) => task.id === taskEditId) ?? null, [tasks, taskEditId])
  const taskDelete = useMemo(() => tasks.find((task) => task.id === taskDeleteId) ?? null, [tasks, taskDeleteId])

  const columns: BoardColumn[] = useMemo(
    () =>
      BOARD_COLUMNS.map((column) => ({
        id: column.id,
        title: column.title,
        tasks: tasks
          .filter((task) => task.status === column.id)
          .sort((a, b) => a.position - b.position),
      })),
    [tasks],
  )

  const setBoardField = (field: keyof BoardFormState, value: string) => {
    setBoardForm((prev) => ({ ...prev, [field]: value }))
  }

  const setTaskField = <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }))
  }

  const closeAllModals = () => {
    setBoardCreateOpen(false)
    setBoardViewId(null)
    setBoardEditId(null)
    setBoardDeleteId(null)
    setTaskCreateOpen(false)
    setTaskViewId(null)
    setTaskEditId(null)
    setTaskDeleteId(null)
    setBoardForm(initialBoardForm)
    setTaskForm(initialTaskForm)
  }

  const loadTasksForBoard = async (boardId: string) => {
    const requestId = ++tasksRequestIdRef.current
    setTasksLoading(true)
    setTasks([])
    try {
      const data = await listTasks(boardId)
      if (tasksRequestIdRef.current === requestId) {
        setTasks(data)
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
        setTasks([])
        setSelectedBoardId(null)
        return
      }

      setCurrentUserId(user.id)
      const loadedBoards = await listBoards()
      setBoards(loadedBoards)

      const nextSelectedId = loadedBoards[0]?.id ?? null
      setSelectedBoardId(nextSelectedId)
      if (nextSelectedId) {
        await loadTasksForBoard(nextSelectedId)
      } else {
        setTasks([])
      }
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
    if (!selectedBoardId) {
      setTasks([])
      setTasksLoading(false)
      return
    }
    void loadTasksForBoard(selectedBoardId).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить задачи.')
      setTasksLoading(false)
    })
  }, [selectedBoardId])

  const handleSelectBoard = (boardId: string) => {
    if (boardId === selectedBoardId) {
      return
    }
    setSelectedBoardId(boardId)
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

  const openCreateTask = (status: TaskStatus) => {
    setTaskForm({
      ...initialTaskForm,
      ownerLabel: displayName(userName),
      status,
    })
    setTaskCreateOpen(true)
  }

  const openEditTask = (task: Task) => {
    setTaskForm({
      title: task.title,
      description: task.description,
      ownerLabel: task.ownerLabel,
      priority: task.priority,
      status: task.status,
    })
    setTaskEditId(task.id)
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
      setSelectedBoardId(created.id)
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
        setSelectedBoardId(remainingBoards[0]?.id ?? null)
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
    if (!title || !ownerLabel) return

    const position = tasks.filter((task) => task.status === taskForm.status).length
    setSaving(true)
    setErrorMessage(null)
    try {
      await createTask({
        boardId: selectedBoardId,
        title,
        description: taskForm.description.trim(),
        ownerLabel,
        priority: taskForm.priority,
        status: taskForm.status,
        position,
      })
      await loadTasksForBoard(selectedBoardId)
      closeAllModals()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось создать задачу.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!taskEdit || !selectedBoardId) return

    const title = taskForm.title.trim()
    const ownerLabel = taskForm.ownerLabel.trim()
    if (!title || !ownerLabel) return

    const position = tasks.filter((task) => task.id !== taskEdit.id && task.status === taskForm.status).length
    setSaving(true)
    setErrorMessage(null)
    try {
      await updateTask(taskEdit.id, {
        title,
        description: taskForm.description.trim(),
        ownerLabel,
        priority: taskForm.priority,
        status: taskForm.status,
        position,
      })
      await loadTasksForBoard(selectedBoardId)
      closeAllModals()
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
      await loadTasksForBoard(selectedBoardId)
      closeAllModals()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить задачу.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-indigo-300">Мои доски</p>
          <h1 className="mt-1 text-3xl font-bold text-white">{selectedBoard ? selectedBoard.name : 'Boards'}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Добро пожаловать, {userName}
            {userRole ? ` · ${userRole}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openCreateTask('todo')}
            disabled={!selectedBoard || !currentUserId}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Новая задача
          </button>
          <button
            type="button"
            onClick={openCreateBoard}
            disabled={!currentUserId}
            className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Новая доска
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</p>
      ) : null}
      {!currentUserId ? (
        <p className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Войдите в аккаунт, чтобы управлять досками и задачами в Supabase.
        </p>
      ) : null}
      {isLoading ? (
        <p className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Загружаем boards/tasks...
        </p>
      ) : null}

      <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Список досок</h2>
          <span className="rounded-full border border-white/10 bg-slate-950/50 px-2.5 py-0.5 text-xs text-slate-400">{boards.length}</span>
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
                  isActive ? 'border-indigo-400/50 bg-indigo-500/10' : 'border-white/10 bg-slate-950/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{board.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">Owner: {board.ownerLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">Обновлена: {formatDate(board.updatedAt)}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-slate-900/80 px-2 py-0.5 text-xs text-slate-300">{tasksCount} задач</span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-slate-400">{board.description || 'Описание пока не добавлено.'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectBoard(board.id)}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardViewId(board.id)}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
                  >
                    Просмотр
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditBoard(board)}
                    disabled={!currentUserId}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardDeleteId(board.id)}
                    disabled={!currentUserId}
                    className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Удалить
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {isTasksLoading ? (
          <div className="lg:col-span-3 rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
            Загружаем задачи выбранной доски...
          </div>
        ) : null}
        {columns.map((column) => (
          <section key={column.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">{column.title}</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-slate-950/50 px-2.5 py-0.5 text-xs text-slate-400">{column.tasks.length}</span>
                <button
                  type="button"
                  onClick={() => openCreateTask(column.id)}
                  disabled={!currentUserId || !selectedBoard}
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  + Задача
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {column.tasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-indigo-400/30">
                  <h3 className="text-sm font-medium text-white">{task.title}</h3>
                  {task.description ? <p className="mt-2 text-xs text-slate-400">{task.description}</p> : null}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${PRIORITY_STYLES[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    <span className="truncate text-xs text-slate-400">{task.ownerLabel}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setTaskViewId(task.id)} className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white transition hover:bg-white/10">Просмотр</button>
                    <button type="button" onClick={() => openEditTask(task)} disabled={!currentUserId} className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">Изменить</button>
                    <button type="button" onClick={() => setTaskDeleteId(task.id)} disabled={!currentUserId} className="rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60">Удалить</button>
                  </div>
                </article>
              ))}
              {column.tasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">Нет задач</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      {isBoardCreateOpen || boardEdit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-900/30" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">{boardEdit ? 'Изменить доску' : 'Новая доска'}</h3>
            <form className="mt-4 space-y-4" onSubmit={boardEdit ? handleEditBoard : handleCreateBoard}>
              <label className="block text-sm text-slate-300">Название
                <input type="text" value={boardForm.name} onChange={(event) => setBoardField('name', event.target.value)} required className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white focus:border-indigo-400 focus:outline-none" />
              </label>
              <label className="block text-sm text-slate-300">Owner
                <input type="text" value={boardForm.ownerLabel} onChange={(event) => setBoardField('ownerLabel', event.target.value)} required className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white focus:border-indigo-400 focus:outline-none" />
              </label>
              <label className="block text-sm text-slate-300">Описание
                <textarea value={boardForm.description} onChange={(event) => setBoardField('description', event.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white focus:border-indigo-400 focus:outline-none" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeAllModals} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">Отмена</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">{boardEdit ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isTaskCreateOpen || taskEdit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-900/30" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">{taskEdit ? 'Изменить задачу' : 'Новая задача'}</h3>
            <form className="mt-4 space-y-4" onSubmit={taskEdit ? handleEditTask : handleCreateTask}>
              <label className="block text-sm text-slate-300">Название задачи
                <input type="text" value={taskForm.title} onChange={(event) => setTaskField('title', event.target.value)} required className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white focus:border-indigo-400 focus:outline-none" />
              </label>
              <label className="block text-sm text-slate-300">Исполнитель
                <input type="text" value={taskForm.ownerLabel} onChange={(event) => setTaskField('ownerLabel', event.target.value)} required className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white focus:border-indigo-400 focus:outline-none" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">Приоритет
                  <select value={taskForm.priority} onChange={(event) => setTaskField('priority', event.target.value as TaskPriority)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white focus:border-indigo-400 focus:outline-none">
                    <option value="low" className="bg-slate-900 text-white">Низкий</option>
                    <option value="medium" className="bg-slate-900 text-white">Средний</option>
                    <option value="high" className="bg-slate-900 text-white">Высокий</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-300">Колонка
                  <select value={taskForm.status} onChange={(event) => setTaskField('status', event.target.value as TaskStatus)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white focus:border-indigo-400 focus:outline-none">
                    {BOARD_COLUMNS.map((column) => (
                      <option key={column.id} value={column.id} className="bg-slate-900 text-white">{column.title}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm text-slate-300">Описание
                <textarea value={taskForm.description} onChange={(event) => setTaskField('description', event.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white focus:border-indigo-400 focus:outline-none" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeAllModals} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">Отмена</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">{taskEdit ? 'Сохранить задачу' : 'Добавить задачу'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {boardView ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-900/30" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white">{boardView.name}</h3>
            <p className="mt-2 text-sm text-slate-300">{boardView.description || 'Без описания.'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-500">Owner</p>
                <p className="mt-1 text-sm text-white">{boardView.ownerLabel}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-500">Обновлена</p>
                <p className="mt-1 text-sm text-white">{formatDate(boardView.updatedAt)}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={closeAllModals} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">Закрыть</button>
            </div>
          </div>
        </div>
      ) : null}

      {taskView ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-900/30" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white">{taskView.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{taskView.description || 'Без описания.'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-500">Колонка</p>
                <p className="mt-1 text-sm text-white">{BOARD_COLUMNS.find((column) => column.id === taskView.status)?.title}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-500">Исполнитель</p>
                <p className="mt-1 text-sm text-white">{taskView.ownerLabel}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Приоритет</p>
              <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${PRIORITY_STYLES[taskView.priority]}`}>{PRIORITY_LABELS[taskView.priority]}</span>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={closeAllModals} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">Закрыть</button>
            </div>
          </div>
        </div>
      ) : null}

      {boardDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-900/30" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Удалить доску?</h3>
            <p className="mt-2 text-sm text-slate-300">Доска <span className="font-medium text-white">{boardDelete.name}</span> будет удалена.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeAllModals} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">Отмена</button>
              <button type="button" onClick={handleDeleteBoard} disabled={isSaving} className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60">Удалить</button>
            </div>
          </div>
        </div>
      ) : null}

      {taskDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={closeAllModals}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-900/30" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Удалить задачу?</h3>
            <p className="mt-2 text-sm text-slate-300">Задача <span className="font-medium text-white">{taskDelete.title}</span> будет удалена.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeAllModals} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">Отмена</button>
              <button type="button" onClick={handleDeleteTask} disabled={isSaving} className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60">Удалить</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
