import fs from 'node:fs/promises'
import { fetchSchedule } from '../skema.js'
type Data = [
    {
        cookie: { value: string; experation: number }
        username: string
        password: string
    },
]

const text = await fs.readFile('./data.json')
const data = JSON.parse(text.toString()) as Data
console.log(data)

const schedule = await fetchSchedule(
    { value: data[0].cookie.value, experation: data[0].cookie.experation },
    '2026-04-23',
)

console.log(schedule)
