import isEqual from 'lodash/isEqual'
import keys from 'lodash/keys'
import pick from 'lodash/pick'
import omit from 'lodash/omit'
import merge from 'lodash/merge'
import React, { createContext, useContext, useReducer, useMemo, useRef, useEffect } from 'react'

type Types<T> = keyof T | 'update'

function getCache<T = any>(id: string, fallback?: T): T | undefined {
  if (typeof window === 'undefined') return fallback

  const key = `store:${id}`.toLowerCase()
  const item = sessionStorage.getItem(key)

  try {
    return JSON.parse(item as any) ?? fallback
  } catch (error) {
    console.error(`React Hook Store could not parse JSON from session storage (${key})`, { cause: error })
  }

  return fallback
}

function setCache<T = any>(id: string, value: T) {
  if (typeof window === 'undefined') return

  const key = `store:${id}`.toLowerCase()

  sessionStorage.setItem(key, JSON.stringify(value))
}

function creatGetters<TState, TGetters extends { [Key in keyof Key]: TGetters[Key] }>(
  state: TState,
  getters: TGetters,
) {
  return Object.entries(getters).reduce((object, kvp) => {
    const [key, getter] = kvp as [string, (state: TState) => any]

    return Object.defineProperty(object, key, {
      enumerable: true,
      get() {
        return getter(state)
      },
    })
  }, {}) as { [Key in keyof TGetters]: ReturnType<TGetters[Key]> }
}

function useStore<
  TState extends { [key: string]: any },
  TGetters extends { [key: string]: (state: TState) => ReturnType<TGetters[typeof key]> },
  TActions extends { [key: string]: (state: TState, payload: any) => TState },
>(context: { state: TState; getters: TGetters; actions: TActions }) {
  const stateRef = useRef(context.state)

  const [state, dispatch] = useReducer((state: TState, { type, payload }: { type: Types<TActions>; payload: any }) => {
    const action = context.actions[type]

    if (action) return action(state, payload)

    if (type === 'update') return { ...state, ...payload }

    return state
  }, context.state)

  // Nested providers do not update context state when changes occur (component lifecycle)
  // from the parent provider, due to "useReducer". Then we have to use "useEffect"
  // to check for changes and call "dispatch".
  useEffect(() => {
    if (isEqual(context.state, stateRef.current)) return

    dispatch({ type: 'update', payload: context.state })

    stateRef.current = context.state
  }, [context.state])

  return useMemo(() => {
    return {
      state: state,
      getters: creatGetters(state, context.getters),
      dispatch(type: Types<TActions>, payload: any) {
        dispatch({ type, payload })
      },
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps
}

export default function createStore<
  TState extends { [key: string]: any },
  TGetters extends { [key: string]: (state: TState) => ReturnType<TGetters[typeof key]> },
  TActions extends { [key: string]: (state: TState, payload: any) => TState },
>(options: { state: TState; getters: TGetters; actions: TActions }) {
  const Context = createContext({
    state: options.state,
    getters: creatGetters(options.state, options.getters),
    dispatch(type: Types<TActions>, payload: any) {},
  })

  const update = (payload: any): TState => {
    let state = options.state

    if (payload && options.actions.update) {
      state = options.actions.update(options.state, payload)
    } else if (payload) {
      state = { ...options.state, ...payload }
    }

    return state
  }

  return {
    useStore() {
      return useContext(Context)
    },
    StoreProvider({
      state,
      cache,
      children,
    }: {
      state?: Partial<TState>
      cache?: { id: string; omit?: (keyof TState)[] }
    } & JSX.ElementChildrenAttribute) {
      const updated = update(state)
      const store = useStore({ ...options, state: updated })

      const cacheGetRef = useRef(false)
      const cacheSetRef = useRef(false)

      useEffect(() => {
        if (!cache || cacheGetRef.current) return

        const prev = getCache(cache?.id, {})
        const next = pick(updated, keys(prev))

        if (!isEqual(prev, next)) {
          store.dispatch('update', merge({}, state, prev))
        }

        // We only apply the cache in the first step after assembling the component, then
        // it is no longer considered.
        cacheGetRef.current = true
      }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

      return useMemo(() => {
        if (cache && cacheSetRef.current) {
          setCache(cache?.id, omit(store.state, cache.omit as string[]))
        }

        // We save the cache only after the component has been assembled, discarding the
        // first state version.
        cacheSetRef.current = true

        return <Context.Provider value={store}>{children}</Context.Provider>
      }, [store.state]) // eslint-disable-line react-hooks/exhaustive-deps
    },
  }
}
