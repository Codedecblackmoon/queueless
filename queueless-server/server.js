import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import queuesRouter from './routes/queues.js'
import entriesRouter from './routes/entries.js'

const app = express()

app.use(cors({
  origin: 'https://queueless-hazel.vercel.app/'
}))
app.use(express.json())

// This is where the prefix gets added
app.use('/api/queues', queuesRouter)
app.use('/api/entries', entriesRouter)

app.get('/', (req, res) => res.send('QueueLess API is running'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))