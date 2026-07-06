import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function StatusPage() {
  const { entryId } = useParams()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEntry() {
        const { data } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('id', entryId)
        .single()

        setEntry(data)
        setLoading(false)
    }

    fetchEntry()
    }, [entryId])

    useEffect(() => {
    const channel = supabase
        .channel(`entry-${entryId}`)
        .on(
        'postgres_changes',
        {
            event: 'UPDATE',
            schema: 'public',
            table: 'queue_entries',
            filter: `id=eq.${entryId}`
        },
        (payload) => {
            setEntry(payload.new)
        }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
    }, [entryId])

    if (loading) return <p>Loading...</p>
    if (!entry) return <p>Entry not found.</p>

    return (
        <div>
            <h1>Hi {entry.customer_name}!</h1>
            {entry.status === 'waiting' && (
            <p>You are #{entry.position} in line.</p>
            )}
            {entry.status === 'notified' && (
            <p>You're almost up! Please head to the counter.</p>
            )}
            {entry.status === 'seated' && (
            <p>You've been seated. Thanks for waiting!</p>
            )}
            {entry.status === 'cancelled' && (
            <p>This entry was cancelled.</p>
            )}
        </div>
    )
}

export default StatusPage