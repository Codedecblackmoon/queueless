import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body // 'notified' | 'seated' | 'cancelled'
  const entryId = req.params.id

  const { data: entry, error } = await supabase
    .from('queue_entries')
    .update({ status })
    .eq('id', entryId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

 if (status === 'notified') {
    console.log(`[Notification stub] Would notify ${entry.customer_contact}: "You're next! Please head to the counter."`)
    }

  res.json(entry)
})

router.delete('/:id', requireAuth, async (req, res) => {
  const { data: entry } = await supabase
    .from('queue_entries')
    .select('queue_id, position')
    .eq('id', req.params.id)
    .single()

  await supabase.from('queue_entries').delete().eq('id', req.params.id)

  // shift everyone behind them up by one
  await supabase.rpc('shift_positions_down', {
    p_queue_id: entry.queue_id,
    p_from_position: entry.position
  })

  res.json({ success: true })
})

export default router