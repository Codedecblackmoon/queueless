import { useState, useEffect } from 'react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'

function DashboardPage() {
  const { session } = useAuth()
  const [queue, setQueue] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchQueue() {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, queues(id, name)')
        .eq('owner_id', session.user.id)
        .single()

      if (data?.queues?.length > 0) {
        setQueue(data.queues[0])
      }
      setLoading(false)
    }

    if (session) fetchQueue()
  }, [session])

  // ...
}

export default DashboardPage