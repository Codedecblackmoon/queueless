import { useState, useEffect } from "react";
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function JoinPage() {
    const { businessSlug } = useParams()
    const [queue, setQueue] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [name, setName] = useState('')
    const [contact, setContact] = useState('')
    const [partySize, setPartySize] = useState(1)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        async function fetchQueue() {
            const { data, error } = await supabase
            .from('businesses')
            .select('id, name, queues(id, name, is_open)')
            .eq('slug', businessSlug)
            .single()

            if (error || !data || data.queues.length === 0) {
            setError('This business or queue could not be found.')
            } else {
            setQueue(data.queues[0])
            }
            setLoading(false)
        }

        fetchQueue()
        }, [businessSlug])

    async function handleSubmit(e) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/queues/${queue.id}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: name,
                customer_contact: contact,
                party_size: partySize
            })
            })

            if (!res.ok) throw new Error('Could not join the queue')

            const entry = await res.json()
            window.location.href = `/status/${entry.id}`
        } catch (err) {
            setError(err.message)
            setSubmitting(false)
        }
    }

    if (loading) return <p>Loading...</p>
    if (error) return <p>{error}</p>

    return (
        <div>
            <h1>{queue.name}</h1>
            <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />
            <input
                type="text"
                placeholder="Phone or email (optional)"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
            />
            <input
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
            />
            <button type="submit" disabled={submitting}>
                {submitting ? 'Joining...' : 'Join Queue'}
            </button>
            </form>
        </div>
    )
}

export default JoinPage