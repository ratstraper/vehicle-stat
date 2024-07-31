/**
 * Скрипт по блокировке и разблокировке печати на ПВ
 */
const { loadData, storeData } = require("./tools.js")

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


(async () => {
    var vehicles = []

    let arr = loadData('2024-07-12.csv').split('\n')
    arr.forEach(el => {
        const v = el.split('\t')
        if(v[1] !== undefined && v[1].startsWith("1")) {
            const obj = {
                imei: v[0],
                ver: v[1],
                ip: v[4],
                state: "-"
            }
            vehicles.push(obj)
        }
    });
    storeData(vehicles, "vehicles.json")


    vehicles = JSON.parse(loadData('vehicles.json'))

    for(var i = 0; i < vehicles.length; i++) {
        const el = vehicles[i]
        if(el.state != "OK") {
            try {
                // Заблокировать принтер
                // var result_cp = await cmd(el.ip, "cp /data/data/kz.onay.driversassistant4/files/profileInstalled /data/data/kz.onay.driversassistant4/files/printer.lock")
                // console.log(el.ip, result_cp)

                // Снять блокировку с печати
                var result_cp = await cmd(el.ip, "rm /data/data/kz.onay.driversassistant4/files/printer.lock")
                console.log(el.ip, result_cp)

                // Проверка
                var result = await cmd(el.ip, "ls /data/data/kz.onay.driversassistant4/files")
                if(result.search('printer.lock') >= 0) {
                    vehicles[i].state = "OK"
                    console.log(el.ip, "OK\n\n")
                } else {
                    vehicles[i].state = "-"
                    console.log(el.ip, "Not file printer.lock", result_cp)
                }
            } catch(err) {
                console.log(el.ip, "Not answered")
            }
        }
    }
    storeData(vehicles, "vehicles.json")
})();
