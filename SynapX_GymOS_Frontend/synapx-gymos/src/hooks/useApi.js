// src/hooks/useApi.js
import { useState, useEffect, useCallback, useRef } from 'react'

export function useApi(fetchFn, deps = [], options = {}) {
  const { immediate = true, initialData = null } = options
  const [data,    setData]    = useState(initialData)
  const [loading, setLoading] = useState(immediate)
  const [error,   setError]   = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn(...args)
      if (mounted.current) setData(res.data ?? res)
      return res
    } catch (err) {
      if (mounted.current) setError(err.message || 'Something went wrong')
      throw err
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => {
    if (immediate) execute()
  }, [execute]) // eslint-disable-line

  return { data, loading, error, refetch: execute }
}

export function useMutation(mutateFn) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await mutateFn(...args)
      return res
    } catch (err) {
      if (mounted.current) setError(err.message || 'Something went wrong')
      throw err
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [mutateFn])

  return { mutate, loading, error }
}

export function usePaginated(fetchFn, extraParams = {}) {
  const [page,   setPage]   = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState({})

  const [items,      setItems]      = useState([])
  const [pagination, setPagination] = useState({})
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // Serialise deps so the effect re-runs on page/search/filter changes.
  const extraKey  = JSON.stringify(extraParams)
  const filterKey = JSON.stringify(filter)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = { page, limit: 20, ...(search && { search }), ...filter, ...extraParams }
    try {
      const res = await fetchFn(params)
      // Backend returns { success, data: [...], pagination: {...} }.
      // Be tolerant of either the raw body or an already-unwrapped array.
      const list = Array.isArray(res) ? res
                 : Array.isArray(res?.data) ? res.data
                 : Array.isArray(res?.data?.data) ? res.data.data
                 : []
      const meta = res?.pagination ?? res?.data?.pagination ?? {}
      if (mounted.current) {
        setItems(list)
        setPagination(meta)
      }
    } catch (err) {
      if (mounted.current) {
        setError(err.message || 'Something went wrong')
        setItems([])
      }
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [page, search, filterKey, extraKey]) // eslint-disable-line

  useEffect(() => { refetch() }, [refetch])

  return {
    items, pagination,
    loading, error, refetch,
    page,   setPage,
    search, setSearch,
    filter, setFilter,
  }
}