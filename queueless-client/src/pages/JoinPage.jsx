import { useState, useEffect } from "react";
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import image from '../assets/svg.svg'
import image_load from '../assets/loading.webp'
import image_noqueue from '../assets/no-queue.webp'

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

    if (loading) return <div className="loading"><img src={image_load} alt="Loading" /><p>Loading...</p></div>
    if (error) return <div className="no-queue"><img src={image_noqueue} alt="No queue" /><p>{error}</p></div>

    return (
        <section className="join-page">
            <div className="join-card">

                <div className="join-header">
                <h1>{queue.name}</h1>
                <p>Join the queue in just a few seconds.</p>
                </div>

                <form className="join-form" onSubmit={handleSubmit}>

                <div className="input-group">
                    <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    />
                </div>

                <div className="input-group">
                    <input
                    type="text"
                    placeholder="Email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    />
                </div>

                <div className="input-group">
                    <label>Party Size</label>
                    <input
                    type="number"
                    // min="1"
                    placeholder="Party Size"
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    />
                </div>

                <button
                    className="join-btn"
                    type="submit"
                    disabled={submitting}
                >
                    {submitting ? "Joining Queue..." : "Join Queue"}
                </button>
                <div className='left-join'>
                    <h1>Q-Less</h1>
                    <img src={image} alt="" />
                </div>

                </form>

            </div>
        </section>
    )
}

export default JoinPage