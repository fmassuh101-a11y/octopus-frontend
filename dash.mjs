import { chromium } from 'playwright'
const B='http://localhost:3100'
const b = await chromium.launch()
const ses = `localStorage.setItem('sb-access-token','x');localStorage.setItem('sb-user',JSON.stringify({id:'0',email:'prueba@octapi.cl'}));localStorage.setItem('oct-user-type','company');`

const d = await b.newContext({ viewport:{width:1512,height:982} })
await d.addInitScript(ses)
const p = await d.newPage()
await p.goto(`${B}/company/dashboard`, { waitUntil:'domcontentloaded', timeout:45000 })
await p.waitForTimeout(2500)

// cuantos menus laterales hay?
const menus = await p.evaluate(() => {
  const asides = document.querySelectorAll('aside').length
  // bloques anchos con muchos enlaces a /company/
  const cand = [...document.querySelectorAll('div,aside')].filter(e => {
    const r = e.getBoundingClientRect()
    return r.width > 180 && r.width < 300 && r.height > 400 &&
           e.querySelectorAll('a[href^="/company/"]').length >= 5
  })
  return { asides, carriles: cand.length, textos: cand.map(c => c.textContent.trim().slice(0,25)) }
})
console.log('  menus laterales:', JSON.stringify(menus))
await p.screenshot({ path:'dash-limpio.png' })

// navegar a aplicantes: el menu se queda?
await p.click('a[href="/company/applicants"]')
await p.waitForTimeout(1800)
const tras = await p.evaluate(() => ({
  url: location.pathname,
  hayCarril: !!document.querySelector('aside'),
  activo: document.querySelector('aside a[aria-current="page"]')?.textContent?.trim() || null,
}))
console.log('  tras navegar:', JSON.stringify(tras))
await p.screenshot({ path:'dash-aplicantes.png' })
await b.close()
