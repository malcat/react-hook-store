import { useReducer, useMemo } from 'react'

type Types<T> = keyof T | 'update'

type Message<T> = { type: Types<T>; payload: any }

type Options<TState, TGetters, TActions> = { state: TState; getters: TGetters; actions: TActions }

type Getters<T extends { [Key in keyof Key]: T[Key] }> = { [Key in keyof T]: ReturnType<T[Key]> }

type Getter<T> = (state: T) => any

type Action<T> = (state: T, payload: any) => T

function creatGetters<TState, TGetters>(state: TState, getters: TGetters) {
  return Object.entries(getters).reduce((object, kvp) => {
    const [key, getter] = kvp as [string, Getter<TState>]

    return Object.defineProperty(object, key, {
      enumerable: true,
      get() {
        return getter(state)
      }
    })
  }, {}) as Getters<TGetters>
}

export function useStore<
  TState extends { [key: string]: any },
  TGetters extends { [key: string]: (state: TState) => ReturnType<TGetters[typeof key]> },
  TActions extends { [key: string]: (state: TState, payload: any) => TState }
>(options: Options<TState, TGetters, TActions>) {
  const [state, dispatch] = useReducer((state: TState, { type, payload }: Message<TActions>) => {
    if (type === 'update') return { ...state, ...payload }

    const action = options.actions[type] as any as Action<TState> | undefined

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
