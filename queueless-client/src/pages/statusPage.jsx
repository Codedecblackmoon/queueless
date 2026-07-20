import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import image_load from '../assets/loading.webp'
import image_noqueue from '../assets/no-queue.webp'

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

    if (loading) return <div className="loading"><img src={image_load} alt="Loading" /><p>Loading...</p></div>
    if (!entry) return <div className="no-queue"><img src={image_noqueue} alt="No queue" /><p>Entry not found.</p></div>

    return (
        <section className='status_page'>
            <div className="customer-status-card">
                <div className="status-icon">
                    {entry.status === "waiting" && "⏳"}
                    {entry.status === "notified" && "🔔"}
                    {entry.status === "seated" && "✅"}
                    {entry.status === "cancelled" && "❌"}
                </div>

                <h1>Hello, {entry.customer_name}! 👋</h1>

                <span className={`status-badge ${entry.status}`}>
                    {entry.status.toUpperCase()}
                </span>

                {entry.status === "waiting" && (
                    <>
                    <h2>You're number {entry.position} in the queue</h2>
                    <p>
                        Thanks for your patience. We'll notify you as soon as it's your turn.
                    </p>
                    </>
                )}

                {entry.status === "notified" && (
                    <>
                    <h2>It's almost your turn!</h2>
                    <p>
                        Please make your way to the counter. We'll be ready for you shortly.
                    </p>
                    </>
                )}

                {entry.status === "seated" && (
                    <>
                    <h2>You're all set!</h2>
                    <p>You've been seated. Thank you for choosing us. Enjoy!</p>
                    </>
                )}

                {entry.status === "cancelled" && (
                    <>
                    <h2>Queue Cancelled</h2>
                    <p>This queue entry has been cancelled.</p>
                    </>
                )}
            </div>

        </section>
        
    )
}

export default StatusPage