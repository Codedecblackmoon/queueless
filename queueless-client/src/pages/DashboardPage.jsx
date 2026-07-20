import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'
import { TableProperties, Share, LogOut } from 'lucide-react'
import Swal from 'sweetalert2'


function DashboardPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [queue, setQueue] = useState(null)
  const [business, setBusiness] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('table') // 'table' | 'qr'
  const [visitedLast24h, setVisitedLast24h] = useState(0)

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
        .neq('status', 'cancelled')
        .order('position', { ascending: true })
      setEntries(data || [])
    }
    if (queue) fetchEntries()
  }, [queue])

  // "Visited today" — count of everyone seated since local midnight.
  // Tracked separately since seated entries stay visible in the main
  // table (per the earlier fix) and shouldn't be double-counted from `entries`
  // once someone is later removed.
  useEffect(() => {
  async function fetchVisitedLast24h() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const { count } = await supabase
      .from('queue_entries')
      .select('id', { count: 'exact', head: true })
      .eq('queue_id', queue.id)
      .gte('joined_at', twentyFourHoursAgo.toISOString())

    setVisitedLast24h(count || 0)
  }
  if (queue) fetchVisitedLast24h()
}, [queue, entries])

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

  function copySlugUrl() {
  if (!business) return
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
    if (!business) return
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
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
        icon: 'success',
        title: 'Downloaded',
        showConfirmButton: false,
        timer: 1500
      })
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <p>Loading...</p>
  if (!queue) return <p>No queue found for this account.</p>

  const waitingCount = entries.filter((e) => e.status === 'waiting').length
  const notifiedCount = entries.filter((e) => e.status === 'notified').length
  const seatedCount = entries.filter((e) => e.status === 'seated').length

  const ownerFirstName = business?.name?.split(' ')[0] || 'there'

  return (
    <section className="dash-shell">
      {/* ---------- Sidebar ---------- */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2 className="sidebar-logo">Q-less</h2>
          <nav className="sidebar-nav">
            <button
              className={`sidebar-nav-item ${activeView === 'table' ? 'active' : ''}`}
              onClick={() => setActiveView('table')}
            >
              <span className="nav-icon"><TableProperties /></span> Table
            </button>
            <button
              className={`sidebar-nav-item ${activeView === 'qr' ? 'active' : ''}`}
              onClick={() => setActiveView('qr')}
            >
              <span className="nav-icon"><Share /></span> QR code
            </button>
          </nav>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <span className="nav-icon"><LogOut /></span> Log out
        </button>
      </aside>

      {/* ---------- Main content ---------- */}
      <main className="dash-main">
        <div className="dash-header-row">
          <h1 className="dash-greeting">Hi {ownerFirstName}</h1>
        </div>

        {activeView === 'table' && (
          <>
            <div className="stats-row">
              <div className="stat-card">
                <p className="stat-label">People waiting</p>
                <p className="stat-value">{waitingCount}</p>
                <p className="stat-sub">Today</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">People notified</p>
                <p className="stat-value">{notifiedCount}</p>
                <p className="stat-sub">Today</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">People seated</p>
                <p className="stat-value">{seatedCount}</p>
                <p className="stat-sub">Today</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">People joined</p>
                <p className="stat-value">{visitedLast24h}</p>
                <p className="stat-sub">Last 24 hours</p>
              </div>
            </div>

            <div className="table-container">
              <h2>Customers in Queue</h2>
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>No</th>
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
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                        No one in the queue right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeView === 'qr' && business && (
          <div className="qr-view">
            <div className="qr-view-code">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  `${window.location.origin}/join/${business.slug}`
                )}`}
                alt="QR code to join queue"
              />
            </div>
            <div className="qr-view-actions">
              <button className="primary-btn" onClick={downloadQrCode}>
                Download
              </button>
              <button className="secondary-btn" onClick={copySlugUrl}>
                Copy URL
              </button>
            </div>
          </div>
        )}
      </main>
    </section>
  )
}

export default DashboardPage