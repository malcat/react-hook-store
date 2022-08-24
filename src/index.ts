import { createContext, useReducer, useMemo } from 'react'

export type Types<T> = keyof T | 'update'

export type Getters<T extends { [Key in keyof Key]: T[Key] }> = {
  [Key in keyof T]: ReturnType<T[Key]>
}

function creatGetters<TState, TGetters extends { [Key in keyof Key]: TGetters[Key] }>(
  state: TState,
  getters: TGetters
) {
  return Object.entries(getters).reduce((object, kvp) => {
    const [key, getter] = kvp as [string, (state: TState) => any]

    return Object.defineProperty(object, key, {
      enumerable: true,
      get() {
        return getter(state)
      }
    })
  }, {}) as Getters<TGetters>
}

export function createStoreContext<TState, TGetters, TActions>(initial: TState, getters: TGetters, actions: TActions) {
  return createContext({
    state: initial,
    getters: creatGetters(initial, getters),
    dispatch(type: Types<TActions>, payload: any) {
      // Since the initial state is empty, we create a behaviorless dispatch method.
    }
  })
}

export function useStore<TState, TGetters, TActions>(initial: TState, getters: TGetters, actions: TActions) {
  const [state, dispatch] = useReducer((state: TState, { type, payload }: { type: Types<TActions>; payload: any }) => {
    if (type === 'update') return { ...state, ...payload }

    const action = actions[type] as any as ((state: TState, payload: any) => TState) | undefined

    if (!action) return state

    return action(state, payload)
  }, initial)

  return useMemo(() => {
    return {
      state: state as TState,
      getters: creatGetters(state, getters),
      dispatch(type: Types<TActions>, payload: any) {
        dispatch({ type, payload })
      }
    }
  }, [state])
}
