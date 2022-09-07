import { createContext, useContext, useReducer, useMemo, useEffect } from 'react'

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

function useStore<
  TState extends { [key: string]: any },
  TGetters extends { [key: string]: (state: TState) => ReturnType<TGetters[typeof key]> },
  TActions extends { [key: string]: (state: TState, payload: any) => TState }
>(options: { state: TState; getters: TGetters; actions: TActions }) {
  const [state, dispatch] = useReducer((state: TState, { type, payload }: { type: Types<TActions>; payload: any }) => {
    const action = options.actions[type]

    if (action) return action(state, payload)

    if (type === 'update') return { ...state, ...payload }

    return state
  }, options.state)

  return useMemo(() => {
    return {
      state: state,
      getters: creatGetters(state, options.getters),
      dispatch(type: Types<TActions>, payload: any) {
        dispatch({ type, payload })
      }
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps
}

export default function createStore<
  TState extends { [key: string]: any },
  TGetters extends { [key: string]: (state: TState) => ReturnType<TGetters[typeof key]> },
  TActions extends { [key: string]: (state: TState, payload: any) => TState }
>(options: { state: TState; getters: TGetters; actions: TActions }) {
  const Context = createContext({
    state: options.state,
    getters: creatGetters(options.state, options.getters),
    dispatch(type: Types<TActions>, payload: any) {}
  })

  return {
    useStore() {
      return useContext(Context)
    },
    StoreProvider({ state, children }: { state?: { [key: string]: any } } & JSX.ElementChildrenAttribute) {
      const store = useStore(options)

      useEffect(() => {
        if (state) {
          store.dispatch('update', state)
        }
      }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

      return useMemo(() => {
        return <Context.Provider value={store}>{children}</Context.Provider>
      }, [store.state]) // eslint-disable-line react-hooks/exhaustive-deps
    }
  }
}
