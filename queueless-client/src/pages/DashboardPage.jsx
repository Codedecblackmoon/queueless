import { useState, useEffect } from 'react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'
import image from '../assets/wired-flat-2234-firework-hover-launch.webp'
import Swal from 'sweetalert2'


function DashboardPage() {
  const { session } = useAuth()
  const [queue, setQueue] = useState(null)
  const [business, setBusiness] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  // const Swal = require('sweetalert2')
  
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
      // Show everyone still "in progress" — waiting, notified, or seated.
      // Only 'cancelled' (i.e. actually removed) entries are excluded.
      const { data } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('queue_id', queue.id)
        .neq('status', 'cancelled')
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
            // Always update the row in place — status changes (waiting -> notified -> seated)
            // never remove it from the table. Only an actual DELETE (via the Remove button) does.
            setEntries((prev) =>
              payload.new.status === 'cancelled'
                ? prev.filter((e) => e.id !== payload.new.id)
                : prev.map((e) => (e.id === payload.new.id ? payload.new : e))
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

  function copySlugUrl() {
    navigator.clipboard.writeText(`${window.location.origin}/join/${business.slug}`)
    Swal.fire({
      position: "top-end",
      icon: "success",
      title: "Copied",
      showConfirmButton: false,
      timer: 1500
    });
  }

  async function downloadQrCode() {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `${window.location.origin}/join/${business.slug}`
    )}`
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const tempUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = tempUrl
      a.download = `${business.slug}-queue-qr.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(tempUrl)

      Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: 'Downloaded',
        showConfirmButton: false,
        timer: 1500
      })
    } catch {
      Swal.fire({
        position: 'top-end',
        icon: 'error',
        title: 'Failed to download QR code',
        showConfirmButton: false,
        timer: 1500
      })
    }
  }
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  return (
    
    <section className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1>{queue.name}</h1>
            <p>Queue Management Dashboard</p>
          </div>
        </div>

        {business && (
          <div className="top-row">
            <div className="card business-card">
              <img className='i' src={image} alt="" />
            </div>

            <div className="card qr-card">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${window.location.origin}/join/${business.slug}`
                )}`}
                alt="QR Code"
              />
              <div className="qr-buttons">
                <button className="primary-btn" onClick={downloadQrCode}>
                  Download QR
                </button>
                <button className="secondary-btn" onClick={copySlugUrl}>
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="table-container">
          <h2>Customers in Queue</h2>
          <table className="queue-table">
            <thead>
              <tr>
                <th>.No</th>
                <th>Name</th>
                <th>Party</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isSeated = entry.status === 'seated'
                return (
                  <tr key={entry.id}>
                    <td>{entry.position}</td>
                    <td>{entry.customer_name}</td>
                    <td>{entry.party_size}</td>
                    <td className="actions">
                      <button
                        className={`btn notify ${entry.status === 'notified' ? 'active' : ''}`}
                        onClick={() => updateStatus(entry.id, 'notified')}
                        disabled={isSeated}
                        title={isSeated ? 'Customer already seated' : undefined}
                      >
                        Notify
                      </button>
                      <button
                        className={`btn seat ${isSeated ? 'active' : ''}`}
                        onClick={() => updateStatus(entry.id, 'seated')}
                        disabled={isSeated}
                      >
                        Seat
                      </button>
                      <button className="btn remove" onClick={() => removeEntry(entry.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
  
}

export default DashboardPage

