import { createContext, useReducer, useMemo } from 'react'

type Types<T> = keyof T | 'update'

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
  }, {}) as { [Key in keyof TGetters]: ReturnType<TGetters[Key]> }
}

export function createStoreContext<
  TState extends { [key: string]: any },
  TGetters extends { [key: string]: (state: TState) => ReturnType<TGetters[typeof key]> },
  TActions extends { [key: string]: (state: TState, payload: any) => TState }
>(options: { state: TState; getters: TGetters; actions: TActions }) {
  return createContext({
    state: options.state,
    getters: creatGetters(options.state, options.getters),
    dispatch(type: Types<TActions>, payload: any) {}
  })
}

export function useStore<
  TState extends { [key: string]: any },
  TGetters extends { [key: string]: (state: TState) => ReturnType<TGetters[typeof key]> },
  TActions extends { [key: string]: (state: TState, payload: any) => TState }
>(options: { state: TState; getters: TGetters; actions: TActions }) {
  const [state, dispatch] = useReducer((state: TState, { type, payload }: { type: Types<TActions>; payload: any }) => {
    if (type === 'update') return { ...state, ...payload }

    const action = options.actions[type]

    if (!action) return state

    return action(state, payload)
  }, options.state)

  return useMemo(() => {
    return {
      state: state,
      getters: creatGetters(state, options.getters),
      dispatch(type: Types<TActions>, payload: any) {
        dispatch({ type, payload })
      }
    }
  }, [])
}
