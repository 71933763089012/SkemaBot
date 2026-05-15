/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import express from 'express'
import { fetchAllSchedule } from './schedule.js'
const app = express()
const port = 3000
app.use(express.json())

// get schedule of today
app.get('/today', async (_req, res) => {
    res.json(await fetchAllSchedule(new Date().toISOString().slice(0, 10)))
})

// get schedule of tomorrow
app.get('/tomorrow', async (_req, res) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    res.json(await fetchAllSchedule(tomorrow.toISOString().slice(0, 10)))
})

// get schedule of specific date
app.post('/get', async (req, res) => {
    const { date } = req.body
    if (date) {
        res.status(200)
        res.json(await fetchAllSchedule(date as string))
    } else {
        res.status(400)
        res.send('Invalid Body')
    }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
