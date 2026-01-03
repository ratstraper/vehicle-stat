require('dotenv').config();
const { loadData, storeData, storeText, dynamicSort, uploadApk, jsonToCsv } = require("./tools.js")
const { getVehicle, getAssistant } = require("./vehicle_stat.js")

let ips = process.env.IPS.split(" ") //"123.123.123. 124.124.124. 125.125.125"
let vehicles = Array()
var updates = []

const v = async (ip) => {
    try {
        let a = await getVehicle(ip)
        if(a != null)
            vehicles.push(a)
    } catch(e) {}
}
const showAssistant = async (idAssistant) => {
    try {
        let a = await getAssistant(idAssistant, "")
        console.log(a)
    } catch(error) {
        console.error(error.message)
    }
}

const allVehicles = async (is_all, filename, csv_format) => {
    if(is_all == true) {
        for(var y = 200; y < 256; y++) {
            let p = Array();
            for(var i = 1; i < 256; i++) {
                p.push(v(`10.131.${y}.${i}`))
            }
            let results = await Promise.all(p)
        }
        // for(var y = 200; y < 256; y++) {
        //     let p = Array();
        //     for(var i = 1; i < 256; i++) {
        //         await v(`10.131.${y}.${i}`)
        //     }
        // }
    } else {
        for(var y = 0; y < ips.length; y++) { 
            let p = Array();
            for(var i = 1; i < 256; i++) {
                p.push(v(`${ips[y]}${i}`))
            }
            let results = await Promise.all(p)
        }
    }


    vehicles.sort(dynamicSort("board"))
    vehicles.sort(dynamicSort("route"))
    if(csv_format) {
        storeText(jsonToCsv(vehicles), filename.replace(/\.[^.]+$/, '.csv'))
    } else {
        storeData(vehicles, filename)
    }
}

const allVehiclesByStep = async (filename) => {
    var count = 0 
    var err = 0 
    for(var y = 0; y < ips.length; y++) { 
        for(var i = 1; i < 256; i++) {
            try {
                let ip = `${ips[y]}${i}`
                console.log('\x1bc', `url: http://${ip}:8080 / ${count} (${err})`)
                let obj = await getVehicle(ip)
                if(obj != null) {
                    vehicles.push(obj)
                    count++
                }
            } catch (error) {
                err++
            }
        }
    }
    storeData(vehicles, filename)
}

const restartFromCSV = async (filename) => {
    let arr = loadData(filename).replaceAll('"', '').split('\n')
    var count = 0;
    for(var i = 0; i < arr.length; i++) {
        const el = arr[i]
        const v = el.split(',')
        if(v[3].length > 13) {
            restart(v[3].slice(7, -5))
        }
    }
}

const restart = async (ip) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        console.log("restart:" + ip)
        let response = await fetch(`http://${ip}:8080/restart`, {method: 'POST', signal: controller.signal})
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error("network error");
        }
        let result = await response.json()
        console.log(result)
    } catch(e) {
        console.error(e)
    }
}

const cmd = async (ip, command) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        console.log(ip + " > " + command);

        let response = await fetch(`http://${ip}:8080/run?cmd=${command}`, {method: 'GET', signal: controller.signal})
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error("network error");
        }
        let result = await response.text()
        console.log(result)
        // const size = result
        //     .split('\n')                                
        //     .find(l => l.trim().endsWith('screenshot2.jpeg'))
        //     .trim()                              
        //     .split(/\s+/)[4];                    
        const line = result.split('\n').find(l => l.trim().endsWith('screenshot.jpeg'));
        const size = (!line) ? 0 : Number(line.trim().split(/\s+/)[4]);

        console.log(size); 
    } catch(e) {
        console.error(e)
    }
}

const termRestart = async (ip) => {
    let response = await fetch(`http://${ip}:8080/term/restart`, {method: 'POST'})
      let result = await response.json()
      console.log(result)
}

const updateScreen = (arr) => {
    console.log('\x1bc')
    for(var i = 0; i < arr.length; i++) {
        console.log(`${arr[i].pos} v:${arr[i].ver} =>`, arr[i].status)
    }
}

const setVersion = async (version, imei, ip) => {
  try {
    const response = await fetch('http://vmt-term-srv.tha.kz/store/version', {
      method: 'PUT',
      headers: {
        'Sec-CH-UA-Full-Version': version,
        'Sec-CH-UA-Model': 'da4',
        'Sec-CH-UA-UID': imei
      }
    });
    console.log('Status:', response.status, ", imei:", imei, ", version:", version, ", ip:", ip);
    const data = await response.json();
    // console.log('Data:', data);
    if(ip !== undefined) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`http://${ip}:8080/update`, {method: 'GET', signal: controller.signal})
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error("network error");
            }
            let result = await response.text()
            console.log(result)
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.log('Request aborted due to timeout.');
            } else {
                console.error('Fetch error:', error);
            }
        }
    }
  } catch (error) {
    console.error('Error updating version:', error);
  }
}

const installDA = async (filename, ip, pos = 0) => {
    uploadApk(
            ip,
            filename,
            (percentComplete) => { 
                updates[pos].status = `Upload progress[${ip}]: ${percentComplete.toFixed(2)}%` 
                // console.log('\033c', `Upload progress[${ip}]: ${percentComplete.toFixed(2)}%`)
                updateScreen(updates)
            },
            (response) => { 
                updates[pos].status = `Upload successful[${ip}]:` + response
                // console.log('Upload successful:', response) 
                updateScreen(updates)
            },
            (error) => { 
                updates[pos].status = `Upload failed:[${ip}]` + error
                // console.log('Upload failed:', error) 
                updateScreen(updates)
            }
        )
}

const v36 = async (ip) => {
    try {
        let a = await getVehicle(ip)
        // if(a != null)
        //     vehicles.push(a)
    } catch(e) {}
}

(async () => {
    const args = require('yargs').argv
    console.log(args)

    if(args.A) {
        await allVehicles(true, args.o || "vehicles.json", args.csv)
    } else if(args.L) {
        await allVehicles(false, args.o || "vehicles.json", args.csv)
        // await allVehiclesByStep(args.o || "vehicles.json")
    // } else if(args.B) {
    //     await v36("10.131.246.205")        
    } else if(args.R != undefined) {
        if(args.file != undefined) {
            await restartFromCSV(args.file)
        } else {
            await restart(args.R)
        }
    } else if(args.C != undefined && args.ip != undefined) {
        await cmd(args.ip, args.C)
    } else if(args.T != undefined) {
        await termRestart(args.T)        
    } else if(args.id > 0) {
        await showAssistant(args.id)
    } else if(args.I && args.file != undefined && args.ip != undefined) {
        updates.push({pos: 0, ip: args.ip, ver: "?", status: ""})
        await installDA(args.file, args.ip)
    } else if(args.U) {
        await updateStepByStep(args.file, args.ip)
    } else if(args.Q) {
        // let a = await getVehicle("10.131.234.140")
        // console.log(a)
        await searchIKey()
    } else if(args.S) {
        let a = await setVersion(args.v, args.imei)
    } else if(args.N) {
        let a = await setVersionStepByStep(args.file)        
    } else {
        console.log("DA stat. Version: 1.0.0\n")
        console.log("Usage: node stat.js [options] <mainclass> [args...]\n")
        console.log(" where options include:\n")
        console.log(" collect DAs:")
        console.log(" -A                collect all DAs data on the IP address range [10.131.240.x, 10.131.246.x]")
        console.log(" -L                or collect all DAs data on the IP address range [10.131.1.1 - 10.131.255.255]")
        console.log(" --csv             converting output data to CSV format")
        console.log(" --o <filename>    save the result in a file named <filename>\n")
        console.log(" restart:")
        console.log(" -R --file <filename>  restart all from csv filename")
        console.log(" -R <ip>           restart DA by IP")
        console.log(" -T <ip>           or restart TERMT005.031-031 R1 by IP\n")
        console.log(" -C <cmd> --ip <ip> run command on DA\n")
        console.log(" information:")
        console.log(" --id <number>     display data on DA ID which is equal to <number>\n")   
        console.log(" -I                install new version")
        console.log(" --file <filename> download apk-file")
        console.log(" --ip <ip>         IP DA\n")    
        console.log(" -S                set version for update")
        console.log(" --v               version of DA")
        console.log(" --imei <imei>     IMEI of DA\n")
        console.log(" -N --file <filename> set version step by step from csv file\n")
    }
  })();

async function searchIKey() {
    const keysearch = "07ae2c17"; //07ae2c17
    let arr = loadData('vehicles.csv').replaceAll('"', '').split('\n')
    var count = 0;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    for(var i = 1; i < arr.length; i++) { //
        const el = arr[i]
        const v = el.split(',') 
        if(v[1].length > 1 && "У" === v[1].slice(v[1].length - 1)) {
            try {
                const ip = v[3].slice(7, -5)
                let response = await fetch(`http://${ip}:8080/db?interface=TICKET_SALE&from=2025090313`, {method: 'GET', signal: controller.signal})
                clearTimeout(timeoutId);
                if (!response.ok) {
                    console.log(response.status)
                    continue; //throw new Error("network error");        
                }
            
                let result = await response.text()
                if(result.indexOf(keysearch) !== -1) {
                    console.log(result)
                    console.log(`ip:${ip}, ${result.indexOf(keysearch)}`)
                    break
                } else {
                    console.log(`${v[1]} - ip:${ip} - not found ${result.length}`)
                }
            }catch(e) {
                console.log(e)
            }
        }
    }
}

/**
 * command -N
 */
async function setVersionStepByStep(filename) {
    let arr = loadData('versions.csv').replaceAll('"', '').split('\n')
    var count = 0;
    for(var i = 1; i < arr.length; i++) { 
        const el = arr[i]
        const v = el.split(',') 
        // if("У" === v[1].slice(v[1].length - 1)) {
        // if(v[1] == "63" || v[1] == "63A") {
            // if(v[2] !== "1.3.58") {
                // console.log(v[1], v[4])
                await setVersion("1.4.61", v[4], v[3].slice(7, -5))
                // await setVersion("1.4.61", v[5])
                count++
            // }
        // }
    }
    console.log("Total:", count)
}

/**
 * command -U
 */
async function updateStepByStep() {
    let arr = loadData('vehicles.csv').replaceAll('"', '').split('\n')
    var count = 0;
    for(var i = 1; i < arr.length; i++) { //arr.length
        const el = arr[i]
        const v = el.split(',')

        if(count < 40) { // && v[0].startsWith("(9")
            //Обновление для Усть-Каменогорска
            // if("У" === v[1].slice(v[1].length - 1) && "1.3.51" !== v[2]) {
                // updates.push({pos: count, ip: v[3].slice(7, -5), ver: v[2], status: ""})
                // await installDA("DA4-1.3.51-release-OEM.apk", v[3].slice(7, -5), count++)
            // }

            //обновление для старых версий 
            if("1.3.58" !== v[2]) {
            // if("1.2.46" == v[2] || "1.2.46b" == v[2] || "1.2.46c" == v[2]) {
                updates.push({pos: count, ip: v[3].slice(7, -5), ver: v[2], status: ""})
                await installDA("DA4-1.3.58-release-OEM.apk", v[3].slice(7, -5), count++)
            }    
        }
    } 
}