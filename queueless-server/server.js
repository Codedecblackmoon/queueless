import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import queuesRouter from './routes/queues.js'
import entriesRouter from './routes/entries.js'

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'https://queueless-client.vercel.app'
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))

app.use(express.json())

// This is where the prefix gets added
app.use('/api/queues', queuesRouter)
app.use('/api/entries', entriesRouter)

app.get('/', (req, res) => res.send('QueueLess API is running'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))