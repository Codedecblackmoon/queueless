import { useState, useEffect } from 'react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'

function DashboardPage() {
  const { session } = useAuth()
  console.log(session)
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

  useEffect(() => {
    async function fetchEntries() {
        const { data } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('queue_id', queue.id)
        .in('status', ['waiting', 'notified'])
        .order('position', { ascending: true })

        setEntries(data || [])
    }

    if (queue) fetchEntries()
    }, [queue])

    useEffect(() => {
        if (!queue) return

        const channel = supabase
            .channel(`queue-${queue.id}`)
            .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'queue_entries',
                filter: `queue_id=eq.${queue.id}`
            },
            (payload) => {
                if (payload.eventType === 'INSERT') {
                setEntries((prev) => [...prev, payload.new].sort((a, b) => a.position - b.position))
                } else if (payload.eventType === 'UPDATE') {
                setEntries((prev) =>
                    ['waiting', 'notified'].includes(payload.new.status)
                    ? prev.map((e) => (e.id === payload.new.id ? payload.new : e))
                    : prev.filter((e) => e.id !== payload.new.id)
                )
                
                } else if (payload.eventType === 'DELETE') {
                setEntries((prev) => prev.filter((e) => e.id !== payload.old.id))
                }
            }
            )
            .subscribe()

        return () => supabase.removeChannel(channel)
        }, [queue])

    // async function updateStatus(entryId, status) {
    //     await fetch(`${import.meta.env.VITE_API_URL}/api/entries/${entryId}/status`, {
    //         method: 'PATCH',
    //         headers: {
    //         'Content-Type': 'application/json',
    //         Authorization: `Bearer ${session.access_token}`
    //         },
    //         body: JSON.stringify({ status })
    //     })
    //     // No need to manually update state here — Realtime will push the change automatically
    // }

    // async function removeEntry(entryId) {
    //     await fetch(`${import.meta.env.VITE_API_URL}/api/entries/${entryId}`, {
    //         method: 'DELETE',
    //         headers: { Authorization: `Bearer ${session.access_token}` }
    //     })
    // }

    async function updateStatus(entryId, status) {
    if (!session) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/entries/${entryId}/status`, {
        method: 'PATCH',
        headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status })
    })
    }

    async function removeEntry(entryId) {
    if (!session) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/entries/${entryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
    })
    }

    if (loading) return <p>Loading...</p>
    if (!queue) return <p>No queue found for this account.</p>

    return (
    <div>
        <h1>{queue.name} — Dashboard</h1>
        <table>
        <thead>
            <tr>
            <th>#</th><th>Name</th><th>Party</th><th>Actions</th>
            </tr>
        </thead>
        <tbody>
            {entries.map((entry) => (
            <tr key={entry.id}>
                <td>{entry.position}</td>
                <td>{entry.customer_name}</td>
                <td>{entry.party_size}</td>
                <td>
                <button onClick={() => updateStatus(entry.id, 'notified')}>Notify</button>
                <button onClick={() => updateStatus(entry.id, 'seated')}>Seat</button>
                <button onClick={() => removeEntry(entry.id)}>Remove</button>
                </td>
            </tr>
            ))}
        </tbody>
        </table>
    </div>
    )
}

export default DashboardPage