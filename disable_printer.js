/**
 * Скрипт по блокировке и разблокировке печати на ПВ
 */
const { loadData, storeData, dynamicSort } = require("./tools.js")
const { getVehicle, getAssistant } = require("./vehicle_stat.js")
const fs = require('fs')
const http = require('http')

const readFromStream = async (stream) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            result += decoder.decode(value, { stream: true });
        }
    } catch (error) {
        console.error('Ошибка при чтении потока:', error);
    } finally {
        reader.releaseLock();
    }
    return result;
}

const cmd = async (ip, command) => {
    try {
        let response = await fetch(`http://${ip}:8080/run?cmd=${command}`, {method: 'GET'})
        let result = await readFromStream(response.body)
        return result
    } catch(err) {
    }
}

const download = async (ip, filename) => {
    return new Promise ((resolve, reject) => {
        const destination = `screenshots/${filename}.jpg`
        const file = fs.createWriteStream(destination);
        const request = http.get(`http://${ip}:8080/screenshot`, {timeout: 3000});
        request.on('response', (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    console.log('File downloaded successfully');
                });
            });
            resolve(response);
        });

        request.on('timeout', () => {
            request.destroy()
        })

        request.on('error', (err) => {
            fs.unlink(destination, () => {
                console.error('Error downloading file:', err);
            });
            resolve(err);
        });
    });
    // const file = fs.createWriteStream(`${terminal}.jpg`);
    // http.get(`http://${v[4]}:8080/screenshot`, (response) => {
    //     response.pipe(file);
    //     file.on('finish', () => {
    //         file.close(() => {
    //             console.log('File downloaded successfully');
    //             return
    //         });
    //     });
    // }).on('error', (err) => {
    //     fs.unlink(destination, () => {
    //         console.error('Error downloading file:', err);
    //         return 
    //     });
    // });
}

(async () => {
    var vehicles = []
/*
    // I этап - первичный сбор данных
    let arr = loadData('2024-08-02-2.csv').split('\n')
    for(var i = 0; i < arr.length; i++) {
        const el = arr[i]
        const v = el.split('\t')
        if(v[1] !== undefined && v[1].startsWith("1")) {
            const data = await getVehicle(v[4])
            const terminal = data !== undefined ? data.terminal : ''
            // if(terminal.length > 0) {
            //     await download(v[4], terminal)
            // }
            const obj = {
                imei: v[0],
                ver: v[1],
                ip: v[4],
                shot: `http://${v[4]}:8080/screenshot`,
                screen: `file://./screenshots/${terminal}.jpg`,
                terminal: terminal,
                cash: "-",
                state: "-"
            }
            vehicles.push(obj)
        }
    }
    vehicles.sort(dynamicSort("terminal"))
    storeData(vehicles, "vehicles.json")
*/

/*
    // II этан - блокировка
    // Блокировка и разблокировка принтера
    vehicles = JSON.parse(loadData('vehicles_2.json'))

    for(var i = 0; i < vehicles.length; i++) {
        const el = vehicles[i]
        // console.log(el)
        if(el.state !== "Locked") {
            // const data = await getVehicle(el.ip)
            // const terminal = data !== undefined ? data.terminal : ''
            // if(terminal.length > 0) {
            //     await download(el.ip, terminal)
            // }
            try {
                // Заблокировать принтер
                var result_cp = await cmd(el.ip, "cp /data/data/kz.onay.driversassistant4/files/profileInstalled /data/data/kz.onay.driversassistant4/files/printer.lock")
                console.log(el.ip, result_cp)

                // Снять блокировку с печати
                // var result_cp = await cmd(el.ip, "rm /data/data/kz.onay.driversassistant4/files/printer.lock")
                // console.log(el.ip, result_cp)

                if(result_cp !== undefined) {
                    // Проверка
                    var result = await cmd(el.ip, "ls /data/data/kz.onay.driversassistant4/files")
                    if(result.search('printer.lock') >= 0) {
                        vehicles[i].state = "Locked"
                        console.log(el.ip, "Lock - OK\n\n")
                    } else {
                        vehicles[i].state = "-"
                        console.log(el.ip, "Not file printer.lock", result_cp)
                    }
                }
            } catch(err) {
                console.log(el.ip, "Not answered")
            }
        }
    }
    storeData(vehicles, "vehicles_2.json")
    */
/*
    // III этап - проверка кэш оплат и снятие отчетов
    //Загрузка скриншотов и обновление информации по тышникам там, где из не было
    vehicles = JSON.parse(loadData('vehicles.json'))
    for(var i = 0; i < vehicles.length; i++) {
        if(vehicles[i].terminal === "") {
            // console.log(vehicles[i])
            const data = await getVehicle(vehicles[i].ip)
            console.log(data)
            const terminal = data !== undefined ? data.terminal : ''
            // if(terminal.length > 0) {
            //     await download(vehicles[i].ip, terminal)
            // }
            vehicles[i].screen = `file://./screenshots/${terminal}.jpg`
            vehicles[i].terminal = terminal
        }
        if(vehicles[i].state === "Locked" && vehicles[i].terminal.length > 0 && vehicles[i].cash === "-") {
            await download(vehicles[i].ip, vehicles[i].terminal)
        }
    }
    storeData(vehicles, "vehicles.json")        

*/

    // IV этап - статистика
    //Загрузка скриншотов и обновление информации по тышникам там, где их не было
    vehicles = JSON.parse(loadData('vehicles.json'))
    const stat = {
        da: 0,
        terminal: 0,
        unallocated: 0,
        locked: 0,
        cash: {
            zero: 0,
            nonzero: 0,
            unavailable: 0,
            log_nonzero: [],
            log_unavailable: []
        }
    }
    for(var i = 0; i < vehicles.length; i++) {
        const v = vehicles[i]
        stat.da++
        if(v.state === "Locked") {
            stat.locked++
        }
        if(v.terminal !== "") {
            stat.terminal++
        } else {
            stat.unallocated++
        }
        if(v.cash === "0") {
            stat.cash.zero++
        } else if(v.cash === "-") {
            stat.cash.unavailable++
            delete(v.screen)
            delete(v.shot)
            const data = await getVehicle(v.ip)
            if(data !== undefined) {
                v.board = data.board
                v.route = data.route
                v.status = data.status
            } else {
                v.board = ""
                v.route = ""
                v.status = ""
            }
            stat.cash.log_unavailable.push(v)
        } else {
            stat.cash.nonzero++
            delete(v.screen)
            delete(v.shot)
            const data = await getVehicle(v.ip)
            if(data !== undefined) {
                v.board = data.board
                v.route = data.route
                v.status = data.status
            } else {
                v.board = ""
                v.route = ""
                v.status = ""
            }
            stat.cash.log_nonzero.push(v)
        }
    }
    console.log(stat)
    console.log("Не сняли z-отчет")
    stat.cash.log_nonzero.forEach(el => {
        console.log(JSON.stringify(el))
    })
    console.log("Не доступны по какой-то причине")
    stat.cash.log_unavailable.forEach(el => {
        console.log(JSON.stringify(el))
    })        

/*
    // V - коллизии
    let arr = loadData('2024-08-02-2.csv').split('\n')
    var res = {}
    for(var i = 1; i < arr.length; i++) {
        const el = arr[i]
        const v = el.split('\t')
        let imei = v[3]
        if(res[imei] === undefined) {
            res[imei] = []
        }
        res[imei].push(v)
    }
    storeData(res, "vehicles_history.json") 
    */
})();

