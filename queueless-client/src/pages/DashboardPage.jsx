import { useState, useEffect } from 'react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'

function DashboardPage() {
  const { session } = useAuth()
  const [queue, setQueue] = useState(null)
  const [business, setBusiness] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchQueue() {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, slug, queues(id, name)')
        .eq('owner_id', session.user.id)
        .single()

      if (data) {
        setBusiness(data)
        if (data.queues?.length > 0) setQueue(data.queues[0])
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
      {business && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f3f3f3', borderRadius: '6px' }}>
          <p>Share this link with your customers:</p>
          <code>{`${window.location.origin}/join/${business.slug}`}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/join/${business.slug}`)
              alert('Link copied!')
            }}
            style={{ marginLeft: '0.5rem' }}
          >
            Copy Link
          </button>
        </div>
      )}
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