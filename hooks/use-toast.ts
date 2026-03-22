import * as React from 'react'

type ToastVariant = 'default' | 'destructive' | 'success'

interface ToastState {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  open: boolean
}

type Action =
  | { type: 'ADD_TOAST'; toast: Omit<ToastState, 'id' | 'open'> }
  | { type: 'DISMISS_TOAST'; id: string }
  | { type: 'REMOVE_TOAST'; id: string }

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

const listeners: Array<(state: ToastState[]) => void> = []
let memoryState: ToastState[] = []

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function reducer(state: ToastState[], action: Action): ToastState[] {
  switch (action.type) {
    case 'ADD_TOAST':
      return [{ ...action.toast, id: genId(), open: true }, ...state].slice(0, 3)
    case 'DISMISS_TOAST':
      return state.map((t) => t.id === action.id ? { ...t, open: false } : t)
    case 'REMOVE_TOAST':
      return state.filter((t) => t.id !== action.id)
    default:
      return state
  }
}

function toast({ title, description, variant = 'default' }: Omit<ToastState, 'id' | 'open'>) {
  dispatch({ type: 'ADD_TOAST', toast: { title, description, variant } })
}

function useToast() {
  const [state, setState] = React.useState<ToastState[]>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return {
    toasts: state,
    toast,
    dismiss: (id: string) => dispatch({ type: 'DISMISS_TOAST', id }),
  }
}

export { useToast, toast }
