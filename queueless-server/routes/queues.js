import express from 'express'
import { supabase } from '../supabaseClient.js'

const router = express.Router()

// POST /api/queues/:id/join
router.post('/:id/join', async (req, res) => {
  const { customer_name, customer_contact, party_size } = req.body
  const queueId = req.params.id

  if (!customer_name) return res.status(400).json({ error: 'Name is required' })

  // Find the current highest position in this queue
  const { data: last } = await supabase
    .from('queue_entries')
    .select('position')
    .eq('queue_id', queueId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const nextPosition = (last?.position ?? 0) + 1

  const { data, error } = await supabase
    .from('queue_entries')
    .insert({
      queue_id: queueId,
      customer_name,
      customer_contact,
      party_size: party_size ?? 1,
      position: nextPosition,
      status: 'waiting'
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/queues/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('queue_id', req.params.id)
    .eq('status', 'waiting')
    .order('position', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router