import { chromium } from 'playwright'

export async function fetchSchedule(
    cookie: { value: string; experation: number },
    date: string,
): Promise<Class[]> {
    const URL = 'https://all.uddataplus.dk/skema/?id=id_menu_skema#u:e!122922!' + date

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    await context.addCookies([
        {
            name: 'utoken',
            value: cookie.value,
            domain: 'all.uddataplus.dk',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            expires: cookie.experation,
        },
        {
            name: 'instkey',
            value: '630064991',
            domain: 'all.uddataplus.dk',
            path: '/',
            httpOnly: false,
            secure: true,
            sameSite: 'Lax',
        },
        {
            name: 'instnr',
            value: '281075',
            domain: 'all.uddataplus.dk',
            path: '/',
            httpOnly: false,
            secure: true,
            sameSite: 'Lax',
        },
    ])

    const page = await context.newPage()
    await page.goto(URL, { waitUntil: 'networkidle' })
    if (page.url().includes('&returURL=')) {
        throw new Error('Invalid Cookie!')
    }
    if (page.url() !== URL) {
        throw new Error(`Unknown Error. Mismatched URL: ${URL}`)
    }
    await page.waitForSelector('svg', { timeout: 15_000 })

    const today = page
        .locator('svg')
        .locator('g.DagMedBrikker')
        .nth(new Date(date).getDay() - 1)
        .locator('> g')
    const info: Class[] = []
    const classes = today.locator('> g')
    const classCount = await classes.count()
    for (let i = 0; i < classCount; i++) {
        const c = new Class()
        await classes.nth(i).click({ force: true })
        let str = (await page.locator('div.gwt-HTML').textContent()) ?? ''
        if (/^Lektion \d: /u.test(str)) {
            str = str.slice(11)
        }
        const strings = str.split('   ')
        strings.forEach(s => {
            if (s !== '') {
                if (s.startsWith('Lærer: ')) {
                    c.teachers = [s.slice(7)]
                } else if (s.startsWith('Lærere: ')) {
                    c.teachers = s.slice(8).split(', ')
                } else if (s.startsWith('Lokale: ')) {
                    c.rooms = [s.slice(8)]
                } else if (s.startsWith('Lokaler: ')) {
                    c.rooms = s.slice(9).split(', ')
                } else if (s.startsWith('Holdet: ')) {
                    c.groups = [s.slice(8)]
                } else if (s.startsWith('Hold: ')) {
                    c.groups = s.slice(6).split(', ')
                } else if (s.startsWith('Bemærkning: ')) {
                    c.remarks = s.slice(12)
                } else {
                    const time = /\d{2}:\d{2} - \d{2}:\d{2}/u.exec(s)
                    if (time) {
                        ;[c.time] = time
                        c.name = s.slice(time[0].length + 2) //.split(", ");
                    } else {
                        throw new Error('Unknown schedule data ' + s)
                    }
                }
            }
        })

        const actions = classes.nth(i).locator('g.actionMenu > g > rect.CAHE1CD-v-j')
        await actions.filter({ hasText: 'flere handlinger' }).click({ force: true })
        const popup = page.locator('div.popupContent')
        const note = popup
            .locator('div.modal-body')
            .locator('div.CAHE1CD-i-r.CAHE1CD-i-G.CAHE1CD-i-P.CAHE1CD-i-k.CAHE1CD-i-f.CAHE1CD-v-b')
            .filter({ hasText: 'Vis note' })
        if ((await note.count()) > 0) {
            await note.click({ force: true })
            await page.waitForSelector('form.form-horizontal', { timeout: 15_000 })
            const popupInfos = popup.locator('form.form-horizontal > div.control-group')
            const infos = await popupInfos.count()
            for (let k = 0; k < infos; k++) {
                const relevant = popupInfos
                    .nth(k)
                    .locator('div.controls div.always-visible.ps-container')
                switch (await popupInfos.nth(k).locator('label.control-label').textContent()) {
                    case 'Note':
                        if ((await relevant.locator('div.gwt-HTML > *').count()) > 0) {
                            c.notes = await relevant.locator('div.gwt-HTML').innerHTML()
                        }
                        break
                    case 'Lektie':
                        if ((await relevant.locator('div.gwt-HTML > *').count()) > 0) {
                            c.homework = await relevant.locator('div.gwt-HTML').innerHTML()
                        }
                        break
                    case 'Filer': {
                        const loc = relevant.locator(
                            'div.CAHE1CD-i-r.CAHE1CD-i-P.CAHE1CD-i-k.CAHE1CD-i-f.CAHE1CD-I-c.CAHE1CD-I-E.CAHE1CD-i-t',
                        )
                        if ((await loc.count()) > 0) {
                            const files = await loc
                                .locator(' > div')
                                .filter({ hasNotText: 'Mappen indeholder ingen filer' })
                                .count()
                            for (let o = 0; o < files; o++) {
                                c.files.push(
                                    ((await loc
                                        .locator(' > div')
                                        .nth(o)
                                        .locator('a')
                                        .textContent()) ?? '') +
                                        ((await loc
                                            .locator(
                                                ' > div div.CAHE1CD-i-P.CAHE1CD-I-l.CAHE1CD-i-h',
                                            )
                                            .nth(o)
                                            .locator('div')
                                            .textContent()) ?? ''),
                                )
                                const requestPromise = page.waitForRequest(req =>
                                    req.url().includes('cellar-c2.services.clever-cloud.com'),
                                )
                                await loc.locator(' > div').nth(o).locator('a').click()
                                c.fileUrls.push((await requestPromise).url())
                            }
                        }
                        break
                    }
                }
            }
            await popup.locator('a.close').click()
        }
        info.push(c)
    }

    await browser.close()
    return info
}

class Class {
    time: string | undefined = undefined
    teachers: string[] = []
    groups: string[] = []
    rooms: string[] = []
    name: string | undefined = undefined
    homework: string | undefined = undefined
    notes: string | undefined = undefined
    remarks: string | undefined = undefined
    files: string[] = []
    fileUrls: string[] = []
}
