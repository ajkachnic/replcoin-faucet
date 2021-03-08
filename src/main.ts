import { Application, Router } from "https://deno.land/x/oak@v6.5.0/mod.ts"
import { Client } from "https://deno.land/x/replit_database@v1.1/mod.ts"
import dayjs from "https://cdn.skypack.dev/dayjs@1.10.4";
import { config } from "https://deno.land/x/dotenv/mod.ts"

const env = config()

const client = new Client()
const app = new Application()
const router = new Router()

const waitTime = 4 // Number of hours before you can claim more coins
const node = 'http://localhost:3001'
const privateKey = env.PRIVATE_KEY
const dispensedAmount = 50 // Amount dispensed from the faucet

router.get('/', ctx => {
  const index = Deno.readFileSync('static/index.html')

  const decoder = new TextDecoder()

  ctx.response.body = decoder.decode(index)
  ctx.response.headers.set('Content-Type', 'text/html')
})

router.post('/api/request/:address', async ctx => {
  const { address } = ctx.params
  if(address == undefined) {
    ctx.response.body = "Please provide an address"
    return
  }
  const latest = await client.get(address)
  if(latest) {
    const { timestamp } = latest
    const lastTime = dayjs(timestamp)

    const nextTime = lastTime.add(waitTime, 'hour')

    const now = dayjs()

    // If more than WAIT_TIME hours have passed
    if(now.isAfter(nextTime)) {
      const res = await transferCoins(address || '')
      if(res !== undefined) {
        ctx.response.body = res.message
      }
    }
  } else {
   const res = await transferCoins(address || '')
   if(res !== undefined) {
    ctx.response.body = res.message
   } 
  }
})

const transferCoins = async (address: string) => {
  const res = await fetch(`${node}/send-transaction`, {
    method: 'POST',
    body: JSON.stringify({
      address,
      // Sending your private key over the internet is NOT a good idea
      // Nevertheless, this is a toy crypto-currency so idgaf
      privateKey,
      amount: dispensedAmount,
    })
  })

  if(!res.ok) {
    return new Error("Failed to send coins :(")
  }

  await client.set(address, {
    timestamp: new Date().getTime()
  })
}

app.use(router.routes())
app.use(router.allowedMethods())

await app.listen({ port: 3000 })